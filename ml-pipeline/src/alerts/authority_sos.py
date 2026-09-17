"""
Phase 6 (partial): watches ward_risk for wards crossing HIGH/CRITICAL and
  1. writes a row to `alerts` (the table Phase 6 was always meant to fill --
     see docs/PROGRESS.md, it existed with zero writers until this script)
  2. POSTs to the FLOODSAFE Node backend's authority-alert endpoint, which
     SMSes that district's configured authority contact(s)

This is the FFGS -> SOS interface: model predicts -> alert generated ->
authorities notified. It is unrelated to the personal-emergency SOS button
in the frontend (src/components/SOSButton.tsx) -- that is a person pressing
a button for themselves.

Run after ward_aggregation.py for the same --valid-for, e.g.:
    python -m src.aggregation.ward_aggregation --valid-for 2026-09-16T08:30:00
    python -m src.alerts.authority_sos --valid-for 2026-09-16T08:30:00

Dedup: one ACTIVE alert per ward at a time. A ward dropping back below HIGH
has its ACTIVE alert(s) marked EXPIRED; a ward newly crossing HIGH/CRITICAL
(no existing ACTIVE alert) gets exactly one new alert + one SMS attempt.
Re-running while a ward is still HIGH/CRITICAL is a no-op -- no repeat SMS
every scoring cycle.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pandas as pd
import requests
from sqlalchemy import text

sys.path.append(str(Path(__file__).resolve().parent.parent.parent))
from config.settings import MODEL_VERSION
from database.db_utils import get_engine, query_df

RISK_LEVEL_MAP = {"HIGH": "WARNING", "CRITICAL": "CRITICAL"}
AUTHORITY_ALERT_URL = os.environ.get("AUTHORITY_ALERT_API_URL", "http://localhost:3001/api/sos/authority-alert")
# Must match the FLOODSAFE backend's INTERNAL_API_KEY (see .env.example) --
# that endpoint fails closed (401) without a matching key.
AUTHORITY_ALERT_API_KEY = os.environ.get("AUTHORITY_ALERT_API_KEY", "")


def _district_for_ward(ward_id: int) -> str | None:
    df = query_df(
        """
        SELECT d.district_name FROM wards w
        JOIN villages v ON v.village_id = w.village_id
        JOIN admin_tehsils t ON t.tehsil_id = v.tehsil_id
        JOIN admin_districts d ON d.district_id = t.district_id
        WHERE w.ward_id = :ward_id
        """,
        {"ward_id": ward_id},
    )
    return None if df.empty else df.iloc[0]["district_name"]


def check_and_alert(valid_for: pd.Timestamp, model_version: str = MODEL_VERSION) -> dict:
    at_risk = query_df(
        """
        SELECT w.ward_id, w.ward_name, wr.risk_category, wr.ward_risk_score, wr.confidence
        FROM wards w
        JOIN ward_risk wr ON wr.ward_id = w.ward_id AND wr.valid_for = :valid_for
        WHERE wr.risk_category IN ('HIGH', 'CRITICAL')
        """,
        {"valid_for": valid_for},
    )
    at_risk_ids = set(at_risk["ward_id"].tolist())

    counts = {"new_alerts": 0, "expired": 0, "sms_attempted": 0, "sms_failed": 0}

    with get_engine().begin() as conn:
        # Expire alerts for wards that are no longer HIGH/CRITICAL.
        active = conn.execute(text("SELECT alert_id, ward_id FROM alerts WHERE status = 'ACTIVE'")).fetchall()
        for alert_id, ward_id in active:
            if ward_id not in at_risk_ids:
                conn.execute(text("UPDATE alerts SET status = 'EXPIRED' WHERE alert_id = :id"), {"id": alert_id})
                counts["expired"] += 1

        already_active = {
            row[0]
            for row in conn.execute(text("SELECT DISTINCT ward_id FROM alerts WHERE status = 'ACTIVE'")).fetchall()
        }

        for _, row in at_risk.iterrows():
            if row["ward_id"] in already_active:
                continue  # ongoing episode, already alerted -- no repeat SMS

            risk_level = RISK_LEVEL_MAP.get(row["risk_category"], "WARNING")
            message = (
                f"FFGS ALERT: {row['ward_name']} is at {row['risk_category']} flood risk "
                f"(score {row['ward_risk_score']:.2f}). Immediate attention advised."
            )
            conn.execute(
                text(
                    """
                    INSERT INTO alerts (ward_id, risk_level, probability, message, status)
                    VALUES (:ward_id, :risk_level, :probability, :message, 'ACTIVE')
                    """
                ),
                {
                    "ward_id": int(row["ward_id"]),
                    "risk_level": risk_level,
                    "probability": float(row["ward_risk_score"]),
                    "message": message,
                },
            )
            counts["new_alerts"] += 1

            district = _district_for_ward(row["ward_id"])
            counts["sms_attempted"] += 1
            try:
                resp = requests.post(
                    AUTHORITY_ALERT_URL,
                    json={
                        "wardName": row["ward_name"],
                        "district": district,
                        "riskLevel": row["risk_category"],
                        "floodProbability": float(row["ward_risk_score"]),
                        "validFor": valid_for.isoformat(),
                    },
                    headers={"X-Internal-Api-Key": AUTHORITY_ALERT_API_KEY},
                    timeout=10,
                )
                if not resp.ok:
                    counts["sms_failed"] += 1
                    print(
                        f"[authority_sos] SMS backend returned {resp.status_code} for "
                        f"ward {row['ward_name']}: {resp.text[:200]}"
                    )
            except requests.RequestException as exc:
                counts["sms_failed"] += 1
                print(f"[authority_sos] Could not reach SOS backend at {AUTHORITY_ALERT_URL}: {exc}")

    return counts


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--valid-for", required=True)
    args = parser.parse_args()

    result = check_and_alert(pd.Timestamp(args.valid_for))
    print(result)
