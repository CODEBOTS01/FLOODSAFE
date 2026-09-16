import { useEffect, useMemo, useState } from "react";
import { getWardTimeseries, type WardTimeseriesPoint } from "../services/ffgsApiService";
import "./RainfallPanel.css";

const WIDTH = 360;
const HEIGHT = 140;
const PADDING = 24;

interface RainfallPanelProps {
  wardId: number;
}

/**
 * Rainfall (6h accumulation) vs. the hydrological engine's dynamic flood
 * threshold, over every timestamp the pipeline has scored for this ward.
 * Hand-rolled SVG line chart -- no charting library in this repo yet, and
 * this is the only chart in the app so far.
 */
function RainfallPanel({ wardId }: RainfallPanelProps) {
  const [points, setPoints] = useState<WardTimeseriesPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPoints(null);
    setError(null);

    getWardTimeseries(wardId)
      .then((p) => {
        if (!cancelled) setPoints(p);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load rainfall history.");
      });

    return () => {
      cancelled = true;
    };
  }, [wardId]);

  const chart = useMemo(() => {
    if (!points || points.length === 0) return null;

    const rainValues = points.map((p) => p.rain_mm_6h ?? 0);
    const thresholdValues = points.map((p) => p.dynamic_threshold_mm ?? 0);
    const maxY = Math.max(...rainValues, ...thresholdValues, 1) * 1.1;

    const n = points.length;
    const xStep = n > 1 ? (WIDTH - 2 * PADDING) / (n - 1) : 0;
    const yScale = (v: number) => HEIGHT - PADDING - (v / maxY) * (HEIGHT - 2 * PADDING);
    const xScale = (i: number) => PADDING + i * xStep;

    const toPath = (values: number[]) =>
      values.map((v, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(v).toFixed(1)}`).join(" ");

    return {
      rainPath: toPath(rainValues),
      thresholdPath: toPath(thresholdValues),
      maxY,
    };
  }, [points]);

  if (error) return <div className="rainfall-panel-empty">⚠ {error}</div>;
  if (!points) return <div className="rainfall-panel-empty">Loading…</div>;
  if (!chart) return <div className="rainfall-panel-empty">No rainfall history for this ward yet.</div>;

  return (
    <div className="rainfall-panel">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT}>
        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={PADDING}
            x2={WIDTH - PADDING}
            y1={PADDING + f * (HEIGHT - 2 * PADDING)}
            y2={PADDING + f * (HEIGHT - 2 * PADDING)}
            stroke="rgba(148,163,184,0.12)"
            strokeWidth={1}
          />
        ))}

        <path d={chart.thresholdPath} fill="none" stroke="#eab308" strokeWidth={2} strokeDasharray="5 4" />
        <path d={chart.rainPath} fill="none" stroke="#38bdf8" strokeWidth={2.5} />
      </svg>

      <div className="rainfall-panel-legend">
        <span>
          <span className="swatch" style={{ background: "#38bdf8" }} /> Rainfall (6h)
        </span>
        <span>
          <span className="swatch" style={{ background: "#eab308" }} /> Dynamic threshold
        </span>
      </div>
    </div>
  );
}

export default RainfallPanel;
