import { useState, useMemo, useRef, useCallback, memo } from "react";
import Map, {
  Layer,
  NavigationControl,
  Popup,
  Source
} from "react-map-gl/maplibre";
import type { MapLayerMouseEvent, FillLayerSpecification, LineLayerSpecification, SymbolLayerSpecification } from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

/* ==========================
   STATIC DEMO FLOOD INFO
========================== */

interface DistrictInfo {
  floods: number;
  risk: "Low" | "Moderate" | "High" | "Critical";
  description: string;
}

const DISTRICT_DATA: Record<string, DistrictInfo> = {
  Dehradun: {
    floods: 3,
    risk: "Low",
    description: "Urban flooding may occur during periods of intense rainfall."
  },
  Uttarkashi: {
    floods: 4,
    risk: "Moderate",
    description: "Flash floods and heavy rainfall can affect valleys and settlements."
  },
  Chamoli: {
    floods: 6,
    risk: "High",
    description: "Mountain district vulnerable to flash floods, landslides and river overflow."
  },
  Rudraprayag: {
    floods: 5,
    risk: "Critical",
    description: "Highly sensitive region due to steep terrain and river valleys."
  },
  Pithoragarh: {
    floods: 5,
    risk: "High",
    description: "Mountainous terrain increases flash-flood and landslide vulnerability."
  },
  Nainital: {
    floods: 3,
    risk: "Moderate",
    description: "Heavy rainfall can create drainage and slope instability problems."
  },
  Almora: {
    floods: 2,
    risk: "Low",
    description: "Mountain streams may rise rapidly during intense rainfall."
  },
  Haridwar: {
    floods: 4,
    risk: "High",
    description: "Low-lying areas near the Ganga can experience flooding."
  }
};

/* ==========================
   STATIC MAP STYLES & CONFIG
   (Allocated once at module level to eliminate MapLibre layer re-evaluation)
========================== */

const INITIAL_VIEW_STATE = {
  longitude: 79.0193,
  latitude: 30.0668,
  zoom: 7
};

const INTERACTIVE_LAYER_IDS = ["district-risk-fill"];

const UTTARAKHAND_FILL_PAINT: FillLayerSpecification["paint"] = {
  "fill-color": "#0ea5e9",
  "fill-opacity": 0.04
};

const UTTARAKHAND_BORDER_PAINT: LineLayerSpecification["paint"] = {
  "line-color": "#0f172a",
  "line-width": 3
};

const DISTRICT_RISK_FILL_PAINT: FillLayerSpecification["paint"] = {
  "fill-color": [
    "match",
    ["get", "district"],
    "Dehradun", "#22c55e",
    "Almora", "#22c55e",
    "Uttarkashi", "#eab308",
    "Nainital", "#eab308",
    "Chamoli", "#f97316",
    "Pithoragarh", "#f97316",
    "Haridwar", "#f97316",
    "Rudraprayag", "#ef4444",
    "#94a3b8"
  ],
  "fill-opacity": 0.48
};

const DISTRICT_BORDERS_PAINT: LineLayerSpecification["paint"] = {
  "line-color": "#334155",
  "line-width": 1.5
};

const HOVER_GLOW_PAINT: LineLayerSpecification["paint"] = {
  "line-color": "#ffffff",
  "line-width": 10,
  "line-opacity": 0.55,
  "line-blur": 5
};

const HOVER_BORDER_PAINT: LineLayerSpecification["paint"] = {
  "line-color": "#ffffff",
  "line-width": 5
};

const DISTRICT_LABELS_LAYOUT: SymbolLayerSpecification["layout"] = {
  "text-field": ["get", "district"],
  "text-size": 12,
  "text-anchor": "center"
};

const DISTRICT_LABELS_PAINT: SymbolLayerSpecification["paint"] = {
  "text-color": "#0f172a",
  "text-halo-color": "#ffffff",
  "text-halo-width": 2
};

function getRiskColor(risk?: string): string {
  if (risk === "Low") return "#22c55e";
  if (risk === "Moderate") return "#eab308";
  if (risk === "High") return "#f97316";
  if (risk === "Critical") return "#ef4444";
  return "#94a3b8";
}

/* ==========================
   COMPONENT
========================== */

function FloodMapComponent() {
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const [popupLocation, setPopupLocation] = useState<{ longitude: number; latitude: number } | null>(null);

  // RAF ref to debounce mouse movements and keep 60fps interaction
  const rafId = useRef<number | null>(null);
  const lastDistrictRef = useRef<string | null>(null);

  // Memoize dynamic hover filter so reference only changes when active district changes
  const hoverFilter = useMemo(() => {
    return (hoveredDistrict
      ? ["==", ["get", "district"], hoveredDistrict]
      : ["==", ["get", "district"], ""]) as unknown as import("maplibre-gl").FilterSpecification;
  }, [hoveredDistrict]);

  const handleMouseMove = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    const district = feature?.properties?.district as string | undefined;

    if (!district) {
      if (lastDistrictRef.current !== null) {
        lastDistrictRef.current = null;
        setHoveredDistrict(null);
        setPopupLocation(null);
        event.target.getCanvas().style.cursor = "";
      }
      return;
    }

    event.target.getCanvas().style.cursor = "pointer";

    // Throttle popup position updates with requestAnimationFrame
    const lng = event.lngLat.lng;
    const lat = event.lngLat.lat;

    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      lastDistrictRef.current = district;
      setHoveredDistrict(district);
      setPopupLocation({ longitude: lng, latitude: lat });
    });
  }, []);

  const handleMouseLeave = useCallback((event: MapLayerMouseEvent) => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    lastDistrictRef.current = null;
    setHoveredDistrict(null);
    setPopupLocation(null);
    event.target.getCanvas().style.cursor = "";
  }, []);

  const currentDistrictInfo = hoveredDistrict ? DISTRICT_DATA[hoveredDistrict] : undefined;

  return (
    <div style={{ width: "100%", height: "500px", position: "relative" }}>
      <Map
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle="https://demotiles.maplibre.org/style.json"
        interactiveLayerIds={INTERACTIVE_LAYER_IDS}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <NavigationControl position="top-right" />

        {/* =========================
            UTTARAKHAND BORDER
        ========================== */}
        <Source id="uttarakhand" type="geojson" data="/data/uttarakhand.geojson">
          <Layer id="uttarakhand-fill" type="fill" paint={UTTARAKHAND_FILL_PAINT} />
          <Layer id="uttarakhand-border" type="line" paint={UTTARAKHAND_BORDER_PAINT} />
        </Source>

        {/* =========================
            DISTRICTS
        ========================== */}
        <Source id="districts" type="geojson" data="/data/uttarakhand-districts.geojson">
          <Layer id="district-risk-fill" type="fill" paint={DISTRICT_RISK_FILL_PAINT} />
          <Layer id="district-borders" type="line" paint={DISTRICT_BORDERS_PAINT} />
          <Layer id="hover-glow" type="line" filter={hoverFilter} paint={HOVER_GLOW_PAINT} />
          <Layer id="hover-border" type="line" filter={hoverFilter} paint={HOVER_BORDER_PAINT} />
          <Layer id="district-labels" type="symbol" layout={DISTRICT_LABELS_LAYOUT} paint={DISTRICT_LABELS_PAINT} />
        </Source>

        {/* =========================
            HOVER POPUP
        ========================== */}
        {hoveredDistrict && popupLocation && (
          <Popup
            longitude={popupLocation.longitude}
            latitude={popupLocation.latitude}
            closeButton={false}
            closeOnClick={false}
            offset={20}
          >
            <div className="district-popup">
              <p className="popup-small">FLOOD HISTORY</p>
              <h2>{hoveredDistrict}</h2>

              <div className="popup-stat">
                <span>🌊 Flood Events</span>
                <strong>{currentDistrictInfo?.floods ?? 0}</strong>
              </div>

              <div className="popup-stat">
                <span>⚠ Risk Level</span>
                <strong style={{ color: getRiskColor(currentDistrictInfo?.risk) }}>
                  {currentDistrictInfo?.risk ?? "Unassigned"}
                </strong>
              </div>

              <p className="popup-description">
                {currentDistrictInfo?.description ?? "Flood information is currently unavailable."}
              </p>

              <p className="demo-warning">Demo frontend data</p>
            </div>
          </Popup>
        )}
      </Map>

      {/* =========================
          FLOOD RISK LEGEND
      ========================== */}
      <div className="risk-legend">
        <h3>Flood Risk</h3>
        <div className="legend-item">
          <span className="legend-color" style={{ background: "#22c55e" }}></span>
          Low
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: "#eab308" }}></span>
          Moderate
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: "#f97316" }}></span>
          High
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: "#ef4444" }}></span>
          Critical
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: "#94a3b8" }}></span>
          Unassigned
        </div>
      </div>
    </div>
  );
}

const FloodMap = memo(FloodMapComponent);
export default FloodMap;
