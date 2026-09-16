# FFGS <-> Dashboard/SOS integration — status and TODOs

This covers the work integrating the ml-pipeline (this folder) with the
FLOODSAFE dashboard and SOS system (repo root / `backend/`). See also
`docs/PROGRESS.md`, `docs/SESSION_HANDOFF.md`, `docs/ARCHITECTURE.md` for the
pipeline's own phase history.

## What's wired up now

- `src/api/main.py` — read-only FastAPI service exposing grid/ward/rainfall/
  alert data from Postgres as JSON/GeoJSON for the dashboard (wards.geojson,
  grid.geojson, watersheds.geojson, iot-sensors.geojson, landslides.geojson,
  ward/{id}, ward/{id}/timeseries, wards/nearest, alerts).
- `src/alerts/authority_sos.py` — the FFGS -> SOS interface. Watches
  ward_risk for wards crossing HIGH/CRITICAL, writes to the (previously
  unused) `alerts` table, and POSTs to the FLOODSAFE Node backend's new
  `POST /api/sos/authority-alert` endpoint, which SMSes a district's
  configured authority contact(s).
- Frontend: `FloodMap.tsx` now renders real ward risk (from real village
  boundaries), a viewport-scoped fine grid layer, watershed boundaries, IoT
  sensor points and landslide points — replacing the old hardcoded demo
  data. Clicking a ward opens `WardDetailPanel.tsx` (flood probability, risk
  level, confidence, rainfall accumulations, soil moisture, hydrological
  threat, high-risk-area%, population exposed) with an embedded
  `RainfallPanel.tsx` (rainfall vs. dynamic threshold chart). `AlertPanel.tsx`
  replaced the hardcoded "Heavy Rainfall Warning" cards with live
  HIGH/CRITICAL wards.

## Required before any of this works

1. **Run the FastAPI service**: `cd ml-pipeline && uvicorn src.api.main:app --port 8000`
   (needs the same `.env` as the rest of the pipeline — DB credentials).
2. **Run the Node SOS backend**: `cd backend && npm install && node server.js`
   (needs `.env` at repo root — see `.env.example`).
3. **Frontend**: `npm install && npm run dev` at repo root. Vite proxies
   `/api` -> Node backend, `/ffgs-api` -> FastAPI service (see `vite.config.ts`).
4. **I could not verify the frontend/backend actually build** — there is no
   Node.js installed in the environment I did this work in, so `npm install`,
   `tsc`, and `vite build` were never run. Please run `npm run build` locally
   as the first sanity check; if TypeScript errors show up in the new files
   (`FloodMap.tsx`, `WardDetailPanel.tsx`, `RainfallPanel.tsx`, `AlertPanel.tsx`,
   `ffgsApiService.ts`), they're almost certainly small type-import issues,
   not logic errors — the Python side (FastAPI + Postgres) I *did* run and
   verify end-to-end against the real DB.
5. **Authority SMS won't actually send** until `AUTHORITY_CONTACT_<DISTRICT>`
   env vars are filled in (see `.env.example` at repo root) and a TextBee or
   Twilio account is configured. Until then, `authority_sos.py` still
   correctly writes to the `alerts` table — there's just nowhere to SMS.
6. **`INTERNAL_API_KEY`** must be set to the same random string in both the
   Node backend's `.env` and the ml-pipeline's `.env`
   (`AUTHORITY_ALERT_API_KEY`) — the authority-alert endpoint fails closed
   (401) without it, by design (so a random internet client can't fabricate
   a flood-risk claim and trigger a real SMS to a real authority).

## Known gaps / caveats carried into this integration

- **No forecast rainfall ingestion exists** (see the "Forecast (GFS/IMD)" box
  in the original architecture diagram — never built). The hydrological
  engine (`src/hydrology/ffg_engine.py`) only scores already-observed
  rainfall. This means `lead_time_minutes` is `null` everywhere in the API
  and dashboard — a real lead time can't exist without something to look
  ahead into. **This is the single highest-value next addition**: ingest
  GFS/IMD forecast rainfall into a new `rainfall_forecast` table, add a
  forecast-vs-threshold comparison to `ffg_engine.py`, and lead time falls
  out of that (time until forecast rainfall is projected to cross the
  dynamic threshold).
- **Rainfall/soil-moisture/IoT/flood-event data is still synthetic**
  (tagged `source='SYNTHETIC'`) — real geography (villages/wards/terrain),
  fake weather/history. See `docs/PROGRESS.md` for what real data sources
  (IMERG/GSMaP/IMD, SMAP/ERA5, CWC/GSI) would replace each of these.
- **"Wards" are real villages, not real municipal wards** — no separate
  municipal/panchayat ward-subdivision shapefile has been sourced. Fine for
  rural Uttarakhand (a village usually *is* the smallest real administrative
  unit) but will under-resolve dense urban areas if/when the pilot expands
  to e.g. Dehradun city.
- **Grid/model only covers 5 pilot districts** (Chamoli, Bageshwar,
  Rudraprayag, Pithoragarh, Uttarkashi) — the highest flash-flood-risk
  Himalayan districts, chosen deliberately, not all of Uttarakhand. Village/
  ward boundaries ARE loaded for the whole state; extending the grid+model
  to the rest of the state is a config change (swap the boundary polygon in
  `run_phase1.ps1` Step 3.5/4) plus a lot more compute (full-state 250m grid
  is ~850M cells — needs a coarser resolution or a tiled approach first).
- **ML model's near-perfect AUC (~0.9999) is a label-leakage artifact**, not
  real skill — the synthetic training label is derived from the same
  formula as one of the model's own input features. Not fixed; would
  require redesigning the synthetic label generation, moot once real
  historical flood records replace it.
- **District-name encoding bug**: the source shapefile for `admin_districts`
  had corrupted characters (`'A'` read as `'>'`, `'U'` read as `'@'` — not a
  uniform shift, so a source-encoding guess in `admin_boundaries.py`'s
  `gpd.read_file()` call risks being wrong without checking the raw bytes).
  Fixed once in the DB directly (`UPDATE admin_districts SET district_name =
  replace(...)`), but will recur if district boundaries are ever re-ingested
  from the original raw shapefile. Worth root-causing before that happens.
- **Rivers/streams layer** (from the diagram) isn't in the map yet — a
  HydroRIVERS shapefile exists in the raw data folder but was never ingested
  into Postgres or exposed via the API.
- **312 of 16,202 villages** didn't resolve a `tehsil_id` via spatial join
  (harmless boundary/CRS mismatch between two independently-sourced
  shapefiles) — never investigated further.

## Phase 6/7 — what's still missing

- **Phase 6 (alert engine)**: `authority_sos.py` covers the "notify a
  district authority via SMS" slice specifically requested for this
  integration. Still missing: a real alert *lifecycle* UI (the dashboard's
  alert panel currently reads a live snapshot of ward_risk, not the `alerts`
  table itself, so there's a slight disconnect between "what got SMSed" and
  "what the panel shows" — worth reconciling), multi-channel delivery (SMS
  only right now, no app push / CAP feed), and alert severity calibration
  (thresholds are still the Phase-1 placeholders in `config.yaml`, never
  calibrated against real events).
- **Phase 7 (historical backtesting)**: not started, blocked on real
  historical flood/landslide records (Phase 4's synthetic events need
  replacing first) — false-alarm rate, missed-event rate, and the
  `ML_WEIGHT`/`HYDRO_WEIGHT` combine in `src/ml/predict.py` are all still
  unvalidated guesses.

## Suggested dashboard additions (not built — feasibility notes)

- **Time scrubber / playback**: a slider over the 66 scored timestamps so
  someone can watch risk evolve rather than only see the latest snapshot.
  Feasible now — the API already supports `?valid_for=` on every endpoint
  that needs it; just needs a UI control and re-fetching on change.
- **District-level rollup view**: aggregate ward_risk up one more level to
  district, for a "which district needs attention right now" summary before
  drilling into wards. Feasible now — same aggregation logic as
  `ward_aggregation.py`, one more GROUP BY.
- **Compare-two-wards view**: side-by-side WardDetailPanel for e.g. a
  downstream ward vs. its upstream neighbor. Feasible, mostly a UI
  composition exercise on top of the existing `/ward/{id}` endpoint.
- **Export/share a ward's current risk card** (image or link) for an
  authority to forward manually. Feasible, moderate effort (needs either a
  server-rendered image or a shareable read-only URL + route).
- **CAP (Common Alerting Protocol) XML feed** alongside the SMS channel, so
  the alert panel's "CAP-ready" badge in the original diagram becomes real
  and other systems (like NDMA SACHET) could consume it. Feasible, is a
  well-defined XML schema; moderate effort, no new data needed beyond what's
  already in `alerts`.
- **Sensor health page**: `iot_sensors.status` (ACTIVE/OFFLINE/FAULTY)
  already exists in the schema but nothing surfaces it — useful once real
  sensors exist, low effort now (endpoint + table already there).
- Anything involving route planning / safe houses is explicitly the
  navigation system's job (teammate-owned, out of scope here — see the
  "Find Safe Route" link in `App.tsx`).
