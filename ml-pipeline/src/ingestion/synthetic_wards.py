"""
Placeholder wards: no real municipal/panchayat ward-subdivision shapefile has
been sourced, but real village boundaries now have (see admin_boundaries.py
--level village). Seeds one ward per real village -- village geometry reused
directly, village_id set properly this time -- since a village is already the
closest real administrative unit to a "ward" for rural Uttarakhand (no
further municipal subdivision exists for most of the pilot area). Still a
simplification (an urban village_name may have several real municipal wards
in reality) but is a village-boundary-accurate placeholder, not a synthetic
one, wherever the source data has a named village.

Replace once real ward/municipal-body boundaries are sourced --
`TRUNCATE wards CASCADE` removes this cleanly first.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.append(str(Path(__file__).resolve().parent.parent.parent))
from database.db_utils import get_engine, query_df
from sqlalchemy import text


def seed_wards(seed: int = 42, force: bool = False) -> int:
    existing = query_df("SELECT count(*) AS n FROM wards").iloc[0]["n"]
    if existing and not force:
        print(f"wards already has {existing} rows -- skipping (pass --force to reseed).")
        return 0

    villages = query_df("SELECT village_id, village_code, village_name FROM villages")
    rng = np.random.default_rng(seed)
    populations = rng.integers(200, 6000, size=len(villages))

    with get_engine().begin() as conn:
        if force:
            conn.execute(text("TRUNCATE wards RESTART IDENTITY CASCADE"))
        for (_, row), population in zip(villages.iterrows(), populations):
            conn.execute(
                text(
                    """
                    INSERT INTO wards (village_id, ward_code, ward_name, population, geom)
                    SELECT :village_id, :ward_code, :ward_name, :population, geom
                    FROM villages WHERE village_id = :village_id
                    """
                ),
                {
                    "village_id": int(row["village_id"]),
                    "ward_code": row["village_code"],
                    "ward_name": row["village_name"],
                    "population": int(population),
                },
            )
    return len(villages)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="Truncate and reseed even if wards already has rows.")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    n = seed_wards(seed=args.seed, force=args.force)
    if n:
        print(f"Seeded {n} placeholder wards (one per real village).")
