import { useEffect, useState } from "react";
import { getActiveAlerts, type ActiveAlert } from "../services/ffgsApiService";
import "./AlertPanel.css";

/**
 * Live HIGH/CRITICAL wards from the FFGS model. Not a persisted "alerts
 * with lifecycle" feed yet (that's Phase 6 -- see ml-pipeline/src/alerts/
 * authority_sos.py for the piece of that which DOES exist: it writes to the
 * `alerts` table and notifies district authorities, but this panel reads
 * the live ward_risk snapshot directly rather than that table, so it
 * reflects the current model output even between authority-alert runs).
 */
function AlertPanel({ onSelectWard }: { onSelectWard?: (wardId: number) => void }) {
  const [alerts, setAlerts] = useState<ActiveAlert[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getActiveAlerts()
      .then(setAlerts)
      .catch((err) => setError(err.message || "Failed to load alerts."));
  }, []);

  if (error) return <div className="alert-panel-empty">⚠ {error}</div>;
  if (!alerts) return <div className="alert-panel-empty">Loading alerts…</div>;
  if (alerts.length === 0) return <div className="alert-panel-empty">No wards currently at HIGH/CRITICAL risk.</div>;

  return (
    <div className="alert-panel-list">
      {alerts.map((alert) => (
        <div
          key={alert.ward_id}
          className={`alert-panel-row ${alert.risk_category === "CRITICAL" ? "critical" : "high"}`}
          onClick={() => onSelectWard?.(alert.ward_id)}
          style={{ cursor: onSelectWard ? "pointer" : "default" }}
        >
          <span className="alert-panel-dot">{alert.risk_category === "CRITICAL" ? "🔴" : "🟠"}</span>
          <div className="alert-panel-body">
            <div className="alert-panel-ward">
              {alert.risk_category} — Ward {alert.ward_name}
            </div>
            <div className="alert-panel-meta">
              <span>Flood probability: {Math.round(alert.ward_risk_score * 100)}%</span>
              <span>Lead time: N/A</span>
            </div>
          </div>
          <span className="alert-panel-timestamp">{new Date(alert.valid_for).toLocaleString("en-IN")}</span>
        </div>
      ))}
    </div>
  );
}

export default AlertPanel;
