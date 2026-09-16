"""
Phase 1: load Survey of India administrative shapefiles (state -> district ->
tehsil -> village -> ward) into PostGIS, after validating geometry and
reprojecting to the storage CRS (EPSG:4326). Parent FKs (state_id,
district_id, ...) are resolved automatically afterwards via a spatial join —
you do not need to hand-map them from source shapefile columns.

Usage:
    python -m src.ingestion.admin_boundaries \
        --level village \
        --shapefile data/raw/boundaries/uttarakhand_villages.shp \
        --column-map VILLNAME=village_name

Run levels in order: state, district, tehsil, village, ward — each level's
parent FK resolution depends on the parent level already being loaded.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import geopandas as gpd
from shapely.geometry import MultiPolygon

sys.path.append(str(Path(__file__).resolve().parent.parent.parent))
from config.settings import GEOGRAPHIC_CRS
from database.db_utils import get_engine, write_geodataframe
from sqlalchemy import inspect, text

LEVEL_TABLE = {
    "state": "admin_states",
    "district": "admin_districts",
    "tehsil": "admin_tehsils",
    "village": "villages",
    "ward": "wards",
}

REQUIRED_NAME_COL = {
    "state": "state_name",
    "district": "district_name",
    "tehsil": "tehsil_name",
    "village": "village_name",
    "ward": "ward_name",
}

# child level -> (parent level, FK column name). The FK column name matches
# the parent table's own primary key column in this schema (e.g. district_id
# is both admin_districts.district_id and admin_tehsils.district_id), which
# is what makes the generic query in resolve_parent_fk() work unmodified.
PARENT_OF = {
    "district": ("state", "state_id"),
    "tehsil": ("district", "district_id"),
    "village": ("tehsil", "tehsil_id"),
    "ward": ("village", "village_id"),
}


def load_and_validate(shapefile_path: str) -> gpd.GeoDataFrame:
    gdf = gpd.read_file(shapefile_path)

    if gdf.empty:
        raise ValueError(f"{shapefile_path} contains no features.")

    # Survey of India shapefiles are inconsistent about carrying a Z
    # dimension (elevation) on boundary vertices; the schema's geometry
    # columns are strictly 2D, so any Z present must be dropped before load.
    gdf["geometry"] = gdf["geometry"].force_2d()

    invalid = ~gdf.geometry.is_valid
    if invalid.any():
        gdf.loc[invalid, "geometry"] = gdf.loc[invalid, "geometry"].buffer(0)

    gdf = gdf[gdf.geometry.notna()]

    if gdf.crs is None:
        raise ValueError(
            f"{shapefile_path} has no CRS defined — set it explicitly before ingesting."
        )
    if gdf.crs.to_string() != GEOGRAPHIC_CRS:
        gdf = gdf.to_crs(GEOGRAPHIC_CRS)

    # Schema columns are typed MultiPolygon; Survey of India shapefiles are
    # commonly plain Polygon, so wrap each one rather than relying on
    # unary_union (which leaves a single Polygon unchanged, not Multi).
    gdf["geometry"] = gdf["geometry"].apply(
        lambda g: g if g.geom_type == "MultiPolygon" else MultiPolygon([g])
    )

    return gdf


def resolve_parent_fk(level: str) -> tuple[int, int]:
    """
    Spatially joins newly-loaded rows at `level` to their parent (e.g. every
    village to the tehsil polygon containing it) and fills the FK column,
    for rows where it's still NULL. Returns (rows_resolved, rows_total).
    ST_PointOnSurface is used instead of a centroid so the test point is
    always guaranteed to fall inside the (possibly concave) child geometry.
    """
    if level not in PARENT_OF:
        return 0, 0

    parent_level, fk_col = PARENT_OF[level]
    child_table = LEVEL_TABLE[level]
    parent_table = LEVEL_TABLE[parent_level]

    with get_engine().begin() as conn:
        total = conn.execute(text(f"SELECT count(*) FROM {child_table} WHERE {fk_col} IS NULL")).scalar()
        result = conn.execute(
            text(
                f"UPDATE {child_table} c SET {fk_col} = p.{fk_col} "
                f"FROM {parent_table} p "
                f"WHERE c.{fk_col} IS NULL AND ST_Within(ST_PointOnSurface(c.geom), p.geom)"
            )
        )
        return result.rowcount, total


def ingest(
    level: str,
    shapefile_path: str,
    column_map: dict[str, str] | None = None,
    set_values: dict[str, str] | None = None,
) -> None:
    if level not in LEVEL_TABLE:
        raise ValueError(f"Unknown admin level '{level}'. Expected one of {list(LEVEL_TABLE)}")

    gdf = load_and_validate(shapefile_path)

    if column_map:
        gdf = gdf.rename(columns=column_map)

    for col, value in (set_values or {}).items():
        gdf[col] = value

    name_col = REQUIRED_NAME_COL[level]
    if name_col not in gdf.columns:
        raise ValueError(
            f"Expected a '{name_col}' column after mapping. "
            f"Available columns: {list(gdf.columns)}. Use --column-map to rename source fields, "
            f"or run `python -m src.ingestion.inspect_source --vector {shapefile_path}` first."
        )

    table = LEVEL_TABLE[level]

    # Source shapefiles carry their own bookkeeping columns (OBJECTID,
    # Shape_Leng, REMARKS, ...) that don't exist in the destination table —
    # keep only columns the schema actually has, plus geometry.
    table_columns = {c["name"] for c in inspect(get_engine()).get_columns(table)}
    keep_cols = [c for c in gdf.columns if c in table_columns or c == gdf.geometry.name]
    dropped = set(gdf.columns) - set(keep_cols)
    gdf = gdf[keep_cols]
    if dropped:
        print(f"Dropping source columns not present in {table}: {sorted(dropped)}")

    # write_geodataframe() renames the active geometry column to "geom" right
    # before writing, so check against that name rather than gdf's own name.
    columns_as_written = {c if c != gdf.geometry.name else "geom" for c in gdf.columns}
    missing_not_null = _missing_required_columns(table, columns_as_written)
    if missing_not_null:
        raise ValueError(
            f"{table} requires {sorted(missing_not_null)} (NOT NULL, no default) but no value "
            f"was provided. Use --set COL=VALUE to supply a constant (e.g. --set state_code=UK)."
        )

    write_geodataframe(gdf, table, if_exists="append")
    print(f"Loaded {len(gdf)} '{level}' features into {table}.")

    if level in PARENT_OF:
        resolved, total = resolve_parent_fk(level)
        print(f"Resolved parent FK for {resolved}/{total} '{level}' rows via spatial join.")
        if resolved < total:
            print(
                f"WARNING: {total - resolved} '{level}' rows did not fall inside any "
                f"'{PARENT_OF[level][0]}' polygon — likely a boundary/CRS mismatch between "
                f"the two shapefiles. Inspect these rows manually."
            )


def _missing_required_columns(table: str, provided_columns) -> set[str]:
    """Columns the table requires (NOT NULL, no default, not the PK) that aren't in `provided_columns`."""
    provided = set(provided_columns)
    missing = set()
    for col in inspect(get_engine()).get_columns(table):
        if (
            not col["nullable"]
            and col.get("default") is None
            and not col.get("autoincrement")
            and col["name"] not in provided
        ):
            missing.add(col["name"])
    return missing


def _parse_column_map(pairs: list[str] | None) -> dict[str, str] | None:
    if not pairs:
        return None
    mapping = {}
    for pair in pairs:
        src, dst = pair.split("=")
        mapping[src] = dst
    return mapping


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--level", required=True, choices=list(LEVEL_TABLE))
    parser.add_argument("--shapefile", required=True)
    parser.add_argument(
        "--column-map",
        nargs="*",
        help="Rename source shapefile columns, e.g. DISTNAME=district_name",
    )
    parser.add_argument(
        "--set",
        nargs="*",
        dest="set_values",
        help="Set a literal constant column value not present in the source, e.g. state_code=UK",
    )
    args = parser.parse_args()

    ingest(
        args.level,
        args.shapefile,
        _parse_column_map(args.column_map),
        _parse_column_map(args.set_values),
    )
