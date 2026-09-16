# Phase 1 runbook for the Uttarakhand pilot (5 districts + buffer).
# DB (flash_flood_db, ffgs_user) and .env are already set up.
# Run this from C:\FFGS\flash_flood_system in a normal PowerShell window.

$ErrorActionPreference = "Stop"
Set-Location "C:\FFGS\flash_flood_system"

# PostgreSQL/PostGIS's installer points PROJ_LIB/PROJ_DATA at its own (older)
# proj.db, which rasterio/pyproj then pick up instead of their own bundled
# one, breaking every raster reprojection with a "DATABASE.LAYOUT.VERSION.MINOR"
# error. Clearing these for this process only (not touched persistently, and
# does not affect PostgreSQL/PostGIS itself) fixes it for every python step
# below that touches rasters.
Remove-Item Env:\PROJ_LIB -ErrorAction SilentlyContinue
Remove-Item Env:\PROJ_DATA -ErrorAction SilentlyContinue

$DATA = "C:\FFGS\pilot_clipped"
$ADMIN = "$DATA\File_761212_5c8e958ced084555a903fb4b6ea0d7b1\05"
# 577 of 16,779 source rows are Vill_Cat='OTHERS' (unclassified/uninhabited
# land -- forest, riverbed, etc.) with no name, which violates villages'
# NOT NULL constraint; there's no resident population there to ward-report
# on anyway, so villages_named.gpkg drops just those 577 (see run history/
# session notes for how it was produced) rather than inventing placeholder names.
$VILLAGES = "$DATA\villages\villages_named.gpkg"

# --- Step 0: apply schema.sql (safe to re-run, uses IF NOT EXISTS) ---
python -m database.db_utils

# --- Step 1: sanity-check the sources (optional — columns below are already confirmed) ---
# python -m src.ingestion.inspect_source --vector "$ADMIN\UTTARAKHAND_STATE_BDY.gpkg"
# python -m src.ingestion.inspect_source --raster "$DATA\dem\as_con_3s.tif"

# --- Step 2: HydroBASINS watersheds (level 8 — 173 sub-basins in the pilot bbox) ---
python -c @"
import geopandas as gpd
from database.db_utils import write_geodataframe
gdf = gpd.read_file(r'$DATA\HydroBasins\hybas_lake_as_lev08_v1c.gpkg').to_crs('EPSG:4326')
gdf = gdf.rename(columns={'HYBAS_ID': 'hybas_id', 'PFAF_ID': 'pfaf_id', 'UP_AREA': 'upstream_area_km2'})
write_geodataframe(gdf[['hybas_id', 'pfaf_id', 'upstream_area_km2', 'geometry']], 'watersheds')
print('watersheds loaded:', len(gdf))
"@

# --- Step 3: Admin boundaries (state -> district -> tehsil -> village) ---
# Village boundaries (Uttarakhand, all districts, Vill_LGD-coded) added later
# than the rest -- resolve_parent_fk() ties each village to its containing
# tehsil purely by geometry (ST_Within), so it doesn't matter that the source
# field names/casing don't match admin_tehsils' own columns.
python -m src.ingestion.admin_boundaries --level state `
    --shapefile "$ADMIN\UTTARAKHAND_STATE_BDY.gpkg" `
    --column-map STATE=state_name `
    --set state_code=UK

python -m src.ingestion.admin_boundaries --level district `
    --shapefile "$ADMIN\UTTARAKHAND_DISTRICT_BDY.gpkg" `
    --column-map DISTRICT=district_name

python -m src.ingestion.admin_boundaries --level tehsil `
    --shapefile "$ADMIN\UTTARAKHAND_SUBDISTRICT_BDY.gpkg" `
    --column-map SUB_DIST=tehsil_name

python -m src.ingestion.admin_boundaries --level village `
    --shapefile "$VILLAGES" `
    --column-map Vill_name=village_name Vill_LGD=village_code

# --- Step 3.5: Dissolve JUST the 5 pilot districts into one boundary polygon ---
# district_id is a SERIAL PK, so hardcoding ids breaks across reloads — match
# by name instead. The source shapefile's DISTRICT text field has an encoding
# bug (some 'A' chars come through as '>'), so match with wildcards rather
# than exact names.
python -c @"
import geopandas as gpd
from sqlalchemy import create_engine
engine = create_engine('postgresql+psycopg2://ffgs_user:Harsh%40369@127.0.0.1:5432/flash_flood_db')
gdf = gpd.read_postgis('''
    SELECT ST_Multi(ST_Union(geom)) AS geom FROM admin_districts
    WHERE district_name ILIKE 'CHAMOLI'
       OR district_name ILIKE 'B_GESHWAR'
       OR district_name ILIKE 'RUDRAPRAY_G'
       OR district_name ILIKE 'PITHOR_GARH'
       OR district_name ILIKE 'UTTARK_SHI'
''', engine, geom_col='geom')
assert not gdf.geometry.iloc[0] is None, 'No districts matched — check district_name spellings in admin_districts'
gdf = gdf.set_crs('EPSG:4326')
gdf.to_file(r'data\raw\boundaries\pilot_districts_dissolved.gpkg', driver='GPKG')
print('Pilot boundary written.')
"@

# --- Step 4: Generate + load the 250m prediction grid ---
# IMPORTANT: boundary must be the pilot districts above, NOT the full state —
# a 250m grid over all of Uttarakhand (~53,000 km^2) is ~850 million cells
# and will effectively hang / exhaust memory.
python -m src.spatial.grid_generator `
    --boundary "data\raw\boundaries\pilot_districts_dissolved.gpkg" `
    --output "data\processed\grid\base_grid_250m.gpkg" `
    --resolution-m 250

python -m src.spatial.load_grid_to_db --grid "data\processed\grid\base_grid_250m.gpkg"

# --- Step 5: DEM + terrain derivatives ---
# Caveat (from docs/PHASE1_GUIDE.md): terrain_derivatives.py currently always
# recomputes flow direction/accumulation from the (clipped+buffered) DEM via
# WhiteboxTools — it does not yet consume the pre-clipped HydroSHEDS
# as_dir_3s.tif / as_acc_3s.tif rasters directly. The 0.1-degree buffer used
# when clipping mitigates truncated upstream catchments but doesn't fully
# eliminate the edge effect. Fine for a pilot; worth fixing before scaling up.
python -m src.terrain.dem_processing `
    --dem "$DATA\dem\as_con_3s.tif" `
    --boundary "data\raw\boundaries\pilot_districts_dissolved.gpkg" `
    --output-dir "data\processed\terrain"

python -m src.terrain.terrain_derivatives `
    --dem "data\processed\terrain\dem_projected.tif" `
    --output-dir "data\processed\terrain" `
    --grid "data\processed\grid\base_grid_250m.gpkg" `
    --write-db --out-csv "data\processed\terrain\terrain_features.csv"

# --- Step 6: Assign each grid cell's ward/village/watershed FKs ---
python -m src.spatial.assign_admin_watershed

# --- Step 7: Verify ---
$env:PGPASSWORD = "Harsh@369"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U ffgs_user -h 127.0.0.1 -p 5432 -d flash_flood_db -c "
SELECT count(*) AS states FROM admin_states;
SELECT count(*) AS districts FROM admin_districts;
SELECT count(*) AS watersheds FROM watersheds;
SELECT count(*) AS grid_cells FROM grid_cells;
SELECT count(*) AS terrain_rows FROM terrain_features;
SELECT count(*) AS cells_with_watershed FROM grid_cells WHERE watershed_id IS NOT NULL;
"

Write-Host "`nPhase 1 complete." -ForegroundColor Green
