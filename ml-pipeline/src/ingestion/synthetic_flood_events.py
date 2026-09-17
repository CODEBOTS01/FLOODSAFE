"""
Placeholder flood_events / flood_event_cells / landslides: real historical
records (CWC flood events, GSI Bhu-Sanket landslide inventory) haven't been
sourced yet, but src/ml/train_model.py refuses to train with only one class
present in `was_flooded` (see feature_engineering.build_training_table) --
so the ML pipeline is otherwise completely unexercisable.

Reuses the SAME dynamic-threshold formula src/hydrology/ffg_engine.py scores
with (not an independent guess) against the synthetic training-window
rainfall/soil-moisture/terrain data already written by synthetic_phase2.py:
any (cell, day) where rain_mm_6h meets or exceeds that cell's dynamic
threshold is a flood candidate; days with enough flagged cells become one
flood_events row + one flood_event_cells row per flagged cell. A handful of
the most severe candidate cells also get a landslides point.

All rows carry source='SYNTHETIC' (flood_events, landslides) so they're
identifiable and purgeable once real event records replace them:
    DELETE FROM flood_event_cells WHERE event_id IN
        (SELECT event_id FROM flood_events WHERE source = 'SYNTHETIC');
    DELETE FROM flood_events WHERE source = 'SYNTHETIC';
    DELETE FROM landslides WHERE source = 'SYNTHETIC';
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.append(str(Path(__file__).resolve().parent.parent.parent))
from database.db_utils import get_engine, query_df
from src.hydrology.ffg_engine import dynamic_rainfall_threshold
from sqlalchemy import text

SOURCE = "SYNTHETIC"
MIN_FLAGGED_CELLS_PER_EVENT = 3


def _candidate_rows() -> pd.DataFrame:
    """
    Training-sample cells only (identified by having far more than the live
    window's 6 timestamps of history), joined with terrain + soil moisture,
    with the same dynamic threshold ffg_engine.py itself would compute.
    """
    df = query_df(
        f"""
        WITH training_cells AS (
            SELECT cell_id FROM rainfall WHERE source = '{SOURCE}'
            GROUP BY cell_id HAVING count(DISTINCT observed_at) > 6
        )
        SELECT
            r.cell_id, r.observed_at, r.rain_mm_6h,
            gc.watershed_id,
            tf.slope_deg, tf.twi, tf.distance_to_stream_m,
            sm.antecedent_wetness_index
        FROM rainfall r
        JOIN training_cells tc ON tc.cell_id = r.cell_id
        JOIN grid_cells gc ON gc.cell_id = r.cell_id
        JOIN terrain_features tf ON tf.cell_id = r.cell_id
        LEFT JOIN LATERAL (
            SELECT antecedent_wetness_index FROM soil_moisture sm
            WHERE sm.cell_id = r.cell_id AND sm.observed_at <= r.observed_at
            ORDER BY sm.observed_at DESC LIMIT 1
        ) sm ON true
        WHERE r.source = '{SOURCE}'
        """
    )
    return df.dropna(subset=["slope_deg", "twi", "distance_to_stream_m", "antecedent_wetness_index"])


def _flag_events(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["dynamic_threshold_mm"] = dynamic_rainfall_threshold(
        df["antecedent_wetness_index"], df["slope_deg"], df["twi"], df["distance_to_stream_m"]
    )
    df["severity_ratio"] = df["rain_mm_6h"] / df["dynamic_threshold_mm"].replace(0, np.nan)
    return df[df["severity_ratio"] >= 1.0]


def _severity_label(ratio: float) -> str:
    if ratio >= 2.0:
        return "SEVERE"
    if ratio >= 1.4:
        return "MODERATE"
    return "MINOR"


def seed_flood_events(force: bool = False) -> dict:
    existing = query_df(f"SELECT count(*) AS n FROM flood_events WHERE source = '{SOURCE}'").iloc[0]["n"]
    if existing and not force:
        print(f"flood_events already has {existing} synthetic rows -- skipping (pass --force to reseed).")
        return {}

    candidates = _candidate_rows()
    flagged = _flag_events(candidates)
    print(f"{len(candidates)} candidate (cell, day) rows, {len(flagged)} exceeded their dynamic threshold.")

    counts = {"flood_events": 0, "flood_event_cells": 0, "landslides": 0}
    if flagged.empty:
        print("No cells exceeded threshold -- try a longer --train-days window in synthetic_phase2.py.")
        return counts

    with get_engine().begin() as conn:
        if force:
            conn.execute(text(f"DELETE FROM flood_event_cells WHERE event_id IN (SELECT event_id FROM flood_events WHERE source = '{SOURCE}')"))
            conn.execute(text(f"DELETE FROM flood_events WHERE source = '{SOURCE}'"))
            conn.execute(text(f"DELETE FROM landslides WHERE source = '{SOURCE}'"))

        for observed_at, day_group in flagged.groupby("observed_at"):
            if len(day_group) < MIN_FLAGGED_CELLS_PER_EVENT:
                continue
            watershed_id = int(day_group["watershed_id"].mode().iloc[0]) if day_group["watershed_id"].notna().any() else None
            max_ratio = float(day_group["severity_ratio"].max())

            event_id = conn.execute(
                text(
                    """
                    INSERT INTO flood_events (source, event_start, event_end, watershed_id, severity, fatalities, description)
                    VALUES (:source, :event_start, :event_end, :watershed_id, :severity, 0, :description)
                    RETURNING event_id
                    """
                ),
                {
                    "source": SOURCE,
                    "event_start": observed_at,
                    "event_end": observed_at + pd.Timedelta(hours=6),
                    "watershed_id": watershed_id,
                    "severity": _severity_label(max_ratio),
                    "description": f"Synthetic placeholder event ({len(day_group)} cells flagged, "
                                    f"max rain/threshold ratio {max_ratio:.2f}).",
                },
            ).scalar_one()
            counts["flood_events"] += 1

            for cell_id in day_group["cell_id"]:
                conn.execute(
                    text("INSERT INTO flood_event_cells (event_id, cell_id, was_flooded) VALUES (:event_id, :cell_id, true)"),
                    {"event_id": event_id, "cell_id": int(cell_id)},
                )
                counts["flood_event_cells"] += 1

            # A few of the most severe cells in this event also get a landslide point.
            top_cells = day_group.nlargest(min(2, len(day_group)), "severity_ratio")["cell_id"].tolist()
            for cell_id in top_cells:
                conn.execute(
                    text(
                        """
                        INSERT INTO landslides (source, event_date, cell_id, severity, geom)
                        SELECT :source, :event_date, :cell_id, :severity, gc.centroid
                        FROM grid_cells gc WHERE gc.cell_id = :cell_id
                        """
                    ),
                    {
                        "source": SOURCE,
                        "event_date": observed_at.date(),
                        "cell_id": int(cell_id),
                        "severity": _severity_label(max_ratio),
                    },
                )
                counts["landslides"] += 1

    return counts


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    result = seed_flood_events(force=args.force)
    if result:
        print(
            f"Seeded {result['flood_events']} flood_events, {result['flood_event_cells']} flood_event_cells, "
            f"{result['landslides']} landslides."
        )
