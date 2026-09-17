"""
Phase 2 placeholder data generator: rainfall, soil moisture, and IoT
sensors/observations for the pilot grid.

This is NOT real data. Every row is tagged source='SYNTHETIC' (rainfall,
soil_moisture) or built from a synthetic ESP32-style sensor_id (iot_sensors)
so it can be identified and purged in one shot once real ingestion lands:

    DELETE FROM rainfall WHERE source = 'SYNTHETIC';
    DELETE FROM soil_moisture WHERE source = 'SYNTHETIC';
    DELETE FROM iot_observations WHERE sensor_id LIKE 'SYN-%';
    DELETE FROM iot_sensors WHERE sensor_id LIKE 'SYN-%';

Two datasets are generated, matching two different downstream needs:

1. "Live" snapshot — every grid cell, a short recent hourly window (default
   6 hours). Lets src/hydrology/ffg_engine.py and the eventual dashboard show
   a risk map covering the whole pilot area right now.
2. "Training" history — a sampled subset of cells (spread across
   watersheds), a longer daily-resolution window (default 60 days) with
   occasional synthetic storm regimes. Gives Phase 3/4 (FFG calibration, ML
   training) enough temporal variation to be meaningful without generating
   440k cells x thousands of hourly timestamps (hundreds of millions of rows).

Rainfall accumulation columns (30min/1h/3h/6h/12h/24h/72h) are generated
directly per window (not derived as literal rolling sums across timestamps)
but are constructed to be monotonically non-decreasing with window length,
which is the only physical invariant downstream code relies on.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.append(str(Path(__file__).resolve().parent.parent.parent))
from config.settings import CONFIG
from database.db_utils import get_engine, query_df, upsert_dataframe
from src.hydrology.antecedent_wetness import antecedent_wetness_index
from sqlalchemy import text

SOURCE = "SYNTHETIC"

# (peak rain_mm_1h mean, std) per weather regime, and how likely a
# watershed/day draws each regime. Illustrative only.
REGIMES = {
    "DRY": (0.0, 1.0),
    "LIGHT": (4.0, 2.5),
    "MODERATE": (14.0, 6.0),
    "STORM": (35.0, 14.0),
}
REGIME_WEIGHTS = np.array([0.55, 0.25, 0.14, 0.06])
REGIME_NAMES = list(REGIMES.keys())


def _load_cells() -> pd.DataFrame:
    return query_df(
        """
        SELECT gc.cell_id, gc.watershed_id, tf.twi, tf.distance_to_stream_m
        FROM grid_cells gc
        JOIN terrain_features tf ON tf.cell_id = gc.cell_id
        WHERE gc.resolution_m = 250
        """
    )


def _draw_regime_peak(rng: np.random.Generator, n: int) -> np.ndarray:
    """One peak rain_mm_1h intensity per row, from a weighted regime mix."""
    regime_idx = rng.choice(len(REGIME_NAMES), size=n, p=REGIME_WEIGHTS)
    means = np.array([REGIMES[r][0] for r in REGIME_NAMES])[regime_idx]
    stds = np.array([REGIMES[r][1] for r in REGIME_NAMES])[regime_idx]
    return np.clip(rng.normal(means, stds), 0, None)


def _cascade_rainfall(rain_mm_1h: np.ndarray, rng: np.random.Generator) -> dict[str, np.ndarray]:
    """
    Builds every accumulation column from rain_mm_1h using random multipliers
    >= 1, so each wider window is guaranteed >= every narrower one it contains
    -- the one invariant worth preserving in placeholder data.
    """
    n = len(rain_mm_1h)
    rain_30min = rain_mm_1h * rng.uniform(0.45, 0.65, n)
    rain_3h = rain_mm_1h * rng.uniform(1.6, 3.0, n)
    rain_6h = rain_3h * rng.uniform(1.3, 2.0, n)
    rain_12h = rain_6h * rng.uniform(1.2, 1.7, n)
    rain_24h = rain_12h * rng.uniform(1.3, 1.9, n)
    rain_72h = rain_24h * rng.uniform(1.4, 2.6, n)
    return {
        "rain_mm_30min": rain_30min,
        "rain_mm_1h": rain_mm_1h,
        "rain_mm_3h": rain_3h,
        "rain_mm_6h": rain_6h,
        "rain_mm_12h": rain_12h,
        "rain_mm_24h": rain_24h,
        "rain_mm_72h": rain_72h,
    }


def _generate_rainfall(
    cells: pd.DataFrame, timestamps: pd.DatetimeIndex, rng: np.random.Generator,
    regime_per_watershed_per_timestamp: bool,
) -> pd.DataFrame:
    """
    regime_per_watershed_per_timestamp=True draws an independent regime per
    (watershed, timestamp) -- used for the daily training window, so storms
    come and go across days. False draws one regime per watershed for the
    WHOLE timestamp range (with light per-timestamp jitter) -- used for the
    live hourly window, so a few recent hours look like the same ongoing
    weather rather than independent random noise hour to hour.
    """
    watersheds = cells["watershed_id"].dropna().unique()
    n_ws, n_t = len(watersheds), len(timestamps)

    if regime_per_watershed_per_timestamp:
        ws_peak = _draw_regime_peak(rng, n_ws * n_t).reshape(n_ws, n_t)
    else:
        base_peak = _draw_regime_peak(rng, n_ws)
        jitter = rng.lognormal(0, 0.2, size=(n_ws, n_t))
        ws_peak = base_peak[:, None] * jitter

    ws_peak_df = pd.DataFrame(ws_peak, index=watersheds, columns=timestamps)

    rows = []
    for ts in timestamps:
        ws_series = ws_peak_df[ts]
        merged = cells.merge(
            ws_series.rename("ws_peak_mm_1h"), left_on="watershed_id", right_index=True, how="left"
        )
        merged["ws_peak_mm_1h"] = merged["ws_peak_mm_1h"].fillna(0.0)
        n = len(merged)
        cell_jitter = rng.lognormal(0, 0.3, n)
        rain_mm_1h = merged["ws_peak_mm_1h"].to_numpy() * cell_jitter
        cascade = _cascade_rainfall(rain_mm_1h, rng)
        chunk = pd.DataFrame(cascade)
        chunk["cell_id"] = merged["cell_id"].to_numpy()
        chunk["observed_at"] = ts
        rows.append(chunk)

    out = pd.concat(rows, ignore_index=True)
    out["source"] = SOURCE
    out["is_forecast"] = False
    return out


def _generate_soil_moisture(cells: pd.DataFrame, rainfall: pd.DataFrame, rng: np.random.Generator) -> pd.DataFrame:
    """
    Baseline wetness from TWI (higher topographic wetness index -> wetter
    baseline soil) plus a response to that same row's rain_mm_72h, then AWI
    via the real production formula (src/hydrology/antecedent_wetness.py) so
    Phase 3 exercises the exact function it will use on real data.
    """
    df = rainfall.merge(cells[["cell_id", "twi"]], on="cell_id", how="left")
    twi = df["twi"].fillna(df["twi"].median())
    twi_norm = ((twi - twi.quantile(0.02)) / (twi.quantile(0.98) - twi.quantile(0.02))).clip(0, 1)

    n = len(df)
    baseline = 12 + 20 * twi_norm.to_numpy() + rng.normal(0, 3, n)
    rain_response = np.clip(df["rain_mm_72h"].to_numpy() / 150.0, 0, 1) * 30
    soil_moisture_pct = pd.Series(np.clip(baseline + rain_response + rng.normal(0, 2, n), 2, 60), index=df.index)

    awi = antecedent_wetness_index(soil_moisture_pct, df["rain_mm_72h"])

    return pd.DataFrame(
        {
            "cell_id": df["cell_id"],
            "observed_at": df["observed_at"],
            "source": SOURCE,
            "soil_moisture_pct": soil_moisture_pct,
            "antecedent_wetness_index": awi,
        }
    )


def _write_rainfall(df: pd.DataFrame) -> None:
    cols = [
        "cell_id", "observed_at", "source",
        "rain_mm_30min", "rain_mm_1h", "rain_mm_3h", "rain_mm_6h",
        "rain_mm_12h", "rain_mm_24h", "rain_mm_72h", "is_forecast",
    ]
    upsert_dataframe(
        df[cols], "rainfall",
        conflict_columns=["cell_id", "observed_at", "source"],
        update_columns=[c for c in cols if c not in ("cell_id", "observed_at", "source")],
    )


def _write_soil_moisture(df: pd.DataFrame) -> None:
    cols = ["cell_id", "observed_at", "source", "soil_moisture_pct", "antecedent_wetness_index"]
    upsert_dataframe(
        df[cols], "soil_moisture",
        conflict_columns=["cell_id", "observed_at", "source"],
        update_columns=["soil_moisture_pct", "antecedent_wetness_index"],
    )


def _generate_iot(cells: pd.DataFrame, n_sensors: int, timestamps: pd.DatetimeIndex, rng: np.random.Generator) -> None:
    """Places n_sensors synthetic devices on real cell centroids and backfills
    a short observation history so a live IoT feed has something to show."""
    sensor_cell_ids = rng.choice(cells["cell_id"].to_numpy(), size=min(n_sensors, len(cells)), replace=False)
    sensor_types = rng.choice(
        ["RAIN_GAUGE", "WEATHER_STATION", "SOIL_MOISTURE", "WATER_LEVEL"],
        size=len(sensor_cell_ids), p=[0.35, 0.25, 0.2, 0.2],
    )
    statuses = rng.choice(["ACTIVE", "OFFLINE", "FAULTY"], size=len(sensor_cell_ids), p=[0.9, 0.07, 0.03])
    installed_days_ago = rng.integers(30, 365, size=len(sensor_cell_ids))

    sensors_df = pd.DataFrame(
        {
            "sensor_id": [f"SYN-{i:04d}" for i in range(len(sensor_cell_ids))],
            "sensor_type": sensor_types,
            "cell_id": sensor_cell_ids,
            "installed_days_ago": installed_days_ago,
            "status": statuses,
        }
    )

    with get_engine().begin() as conn:
        for _, row in sensors_df.iterrows():
            conn.execute(
                text(
                    """
                    INSERT INTO iot_sensors (sensor_id, sensor_type, cell_id, installed_at, status, geom)
                    SELECT :sensor_id, :sensor_type, :cell_id,
                           (now() - (:installed_days_ago || ' days')::interval)::date,
                           :status, gc.centroid
                    FROM grid_cells gc WHERE gc.cell_id = :cell_id
                    ON CONFLICT (sensor_id) DO UPDATE SET
                        sensor_type = excluded.sensor_type,
                        cell_id = excluded.cell_id,
                        status = excluded.status,
                        geom = excluded.geom
                    """
                ),
                {
                    "sensor_id": row["sensor_id"],
                    "sensor_type": row["sensor_type"],
                    "cell_id": int(row["cell_id"]),
                    "installed_days_ago": int(row["installed_days_ago"]),
                    "status": row["status"],
                },
            )

    # Observations: reuse each sensor's cell rainfall/soil-moisture rows
    # already written for the live window, plus a synthetic water level/battery.
    cell_ids = sensors_df["cell_id"].tolist()
    placeholders = ",".join(str(int(c)) for c in cell_ids)
    live_readings = query_df(
        f"""
        SELECT r.cell_id, r.observed_at, r.rain_mm_1h, sm.soil_moisture_pct,
               tf.distance_to_stream_m
        FROM rainfall r
        JOIN terrain_features tf ON tf.cell_id = r.cell_id
        LEFT JOIN soil_moisture sm ON sm.cell_id = r.cell_id AND sm.observed_at = r.observed_at
            AND sm.source = '{SOURCE}'
        WHERE r.cell_id IN ({placeholders}) AND r.source = '{SOURCE}'
        """
    )
    obs = live_readings.merge(sensors_df[["sensor_id", "cell_id"]], on="cell_id", how="inner")
    n = len(obs)
    proximity = 1 - np.clip(obs["distance_to_stream_m"].fillna(500) / 1000, 0, 1)
    obs_df = pd.DataFrame(
        {
            "sensor_id": obs["sensor_id"],
            "observed_at": obs["observed_at"],
            "rainfall_mm": (obs["rain_mm_1h"] * rng.lognormal(0, 0.1, n)).round(2),
            "soil_moisture_pct": (obs["soil_moisture_pct"] * rng.lognormal(0, 0.05, n)).round(2),
            "water_level_cm": np.round(20 + proximity.to_numpy() * 80 + rng.normal(0, 5, n), 1),
            "battery_v": np.round(np.clip(rng.normal(3.7, 0.15, n), 3.0, 4.2), 2),
        }
    )
    obs_df.to_sql("iot_observations", get_engine(), if_exists="append", index=False)

    print(f"Placed {len(sensors_df)} synthetic IoT sensors, wrote {len(obs_df)} observations.")


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live-hours", type=int, default=6, help="Hourly live window, all grid cells.")
    parser.add_argument("--train-days", type=int, default=60, help="Daily training window, sampled cells.")
    parser.add_argument("--train-cells", type=int, default=5000, help="Cell sample size for the training window.")
    parser.add_argument("--iot-sensors", type=int, default=40)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--skip-live", action="store_true")
    parser.add_argument("--skip-train", action="store_true")
    parser.add_argument("--skip-iot", action="store_true")
    args = parser.parse_args()

    rng = np.random.default_rng(args.seed)
    cells = _load_cells()
    print(f"Loaded {len(cells)} grid cells with terrain features.")

    now = pd.Timestamp.utcnow().tz_localize(None).floor("h")

    if not args.skip_live:
        live_timestamps = pd.date_range(end=now, periods=args.live_hours, freq="h")
        print(f"Generating LIVE window: {len(cells)} cells x {len(live_timestamps)} hourly timestamps...")
        rainfall_live = _generate_rainfall(cells, live_timestamps, rng, regime_per_watershed_per_timestamp=False)
        _write_rainfall(rainfall_live)
        soil_live = _generate_soil_moisture(cells, rainfall_live, rng)
        _write_soil_moisture(soil_live)
        print(f"  wrote {len(rainfall_live)} rainfall rows, {len(soil_live)} soil_moisture rows.")

    if not args.skip_train:
        train_cells = cells.sample(n=min(args.train_cells, len(cells)), random_state=args.seed)
        train_timestamps = pd.date_range(end=now.normalize(), periods=args.train_days, freq="D")
        print(f"Generating TRAINING window: {len(train_cells)} cells x {len(train_timestamps)} daily timestamps...")
        rainfall_train = _generate_rainfall(train_cells, train_timestamps, rng, regime_per_watershed_per_timestamp=True)
        _write_rainfall(rainfall_train)
        soil_train = _generate_soil_moisture(train_cells, rainfall_train, rng)
        _write_soil_moisture(soil_train)
        print(f"  wrote {len(rainfall_train)} rainfall rows, {len(soil_train)} soil_moisture rows.")

    if not args.skip_iot:
        _generate_iot(cells, args.iot_sensors, pd.date_range(end=now, periods=args.live_hours, freq="h"), rng)

    print("Phase 2 synthetic data generation complete.")


if __name__ == "__main__":
    main()
