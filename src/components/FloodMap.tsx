import { useState } from "react";

import Map, {
  Layer,
  NavigationControl,
  Popup,
  Source
} from "react-map-gl/maplibre";

import "maplibre-gl/dist/maplibre-gl.css";


/* ==========================
   DEMO FLOOD INFORMATION
========================== */

const districtData: any = {
  Dehradun: {
    floods: 3,
    risk: "Low",
    description:
      "Urban flooding may occur during periods of intense rainfall."
  },

  Uttarkashi: {
    floods: 4,
    risk: "Moderate",
    description:
      "Flash floods and heavy rainfall can affect valleys and settlements."
  },

  Chamoli: {
    floods: 6,
    risk: "High",
    description:
      "Mountain district vulnerable to flash floods, landslides and river overflow."
  },

  Rudraprayag: {
    floods: 5,
    risk: "Critical",
    description:
      "Highly sensitive region due to steep terrain and river valleys."
  },

  Pithoragarh: {
    floods: 5,
    risk: "High",
    description:
      "Mountainous terrain increases flash-flood and landslide vulnerability."
  },

  Nainital: {
    floods: 3,
    risk: "Moderate",
    description:
      "Heavy rainfall can create drainage and slope instability problems."
  },

  Almora: {
    floods: 2,
    risk: "Low",
    description:
      "Mountain streams may rise rapidly during intense rainfall."
  },

  Haridwar: {
    floods: 4,
    risk: "High",
    description:
      "Low-lying areas near the Ganga can experience flooding."
  }
};


/* ==========================
   RISK COLOR FUNCTION
========================== */

function getRiskColor(risk: string) {
  if (risk === "Low") return "#22c55e";

  if (risk === "Moderate") return "#eab308";

  if (risk === "High") return "#f97316";

  if (risk === "Critical") return "#ef4444";

  return "#94a3b8";
}


function FloodMap() {

  const [hoveredDistrict, setHoveredDistrict] =
    useState<string | null>(null);

  const [popupLocation, setPopupLocation] =
    useState<{
      longitude: number;
      latitude: number;
    } | null>(null);


  return (
    <div
      style={{
        width: "100%",
        height: "500px",
        position: "relative"
      }}
    >

      <Map
        initialViewState={{
          longitude: 79.0193,
          latitude: 30.0668,
          zoom: 7
        }}

        mapStyle="https://demotiles.maplibre.org/style.json"

        interactiveLayerIds={[
          "district-risk-fill"
        ]}

        onMouseMove={(event) => {

          const feature =
            event.features?.[0];

          if (!feature) {
            setHoveredDistrict(null);
            setPopupLocation(null);
            return;
          }

          const district =
            feature.properties?.district;

          if (!district) {
            return;
          }

          setHoveredDistrict(district);

          setPopupLocation({
            longitude: event.lngLat.lng,
            latitude: event.lngLat.lat
          });

          event.target.getCanvas().style.cursor =
            "pointer";
        }}

        onMouseLeave={(event) => {

          setHoveredDistrict(null);

          setPopupLocation(null);

          event.target.getCanvas().style.cursor =
            "";
        }}
      >

        <NavigationControl
          position="top-right"
        />


        {/* =========================
            UTTARAKHAND BORDER
        ========================== */}

        <Source
          id="uttarakhand"
          type="geojson"
          data="/data/uttarakhand.geojson"
        >

          <Layer
            id="uttarakhand-fill"
            type="fill"
            paint={{
              "fill-color": "#0ea5e9",
              "fill-opacity": 0.04
            }}
          />

          <Layer
            id="uttarakhand-border"
            type="line"
            paint={{
              "line-color": "#0f172a",
              "line-width": 3
            }}
          />

        </Source>


        {/* =========================
            DISTRICTS
        ========================== */}

        <Source
          id="districts"
          type="geojson"
          data="/data/uttarakhand-districts.geojson"
        >

          {/* RISK COLORS */}

          <Layer
            id="district-risk-fill"
            type="fill"

            paint={{
              "fill-color": [

                "match",
                ["get", "district"],

                /* LOW RISK */

                "Dehradun",
                "#22c55e",

                "Almora",
                "#22c55e",


                /* MODERATE RISK */

                "Uttarkashi",
                "#eab308",

                "Nainital",
                "#eab308",


                /* HIGH RISK */

                "Chamoli",
                "#f97316",

                "Pithoragarh",
                "#f97316",

                "Haridwar",
                "#f97316",


                /* CRITICAL */

                "Rudraprayag",
                "#ef4444",


                /* UNASSIGNED */

                "#94a3b8"
              ],

              "fill-opacity": 0.48
            }}
          />


          {/* NORMAL BORDERS */}

          <Layer
            id="district-borders"
            type="line"
            paint={{
              "line-color": "#334155",
              "line-width": 1.5
            }}
          />


          {/* HOVER GLOW */}

          <Layer
            id="hover-glow"
            type="line"

            filter={
              hoveredDistrict
                ? [
                    "==",
                    ["get", "district"],
                    hoveredDistrict
                  ]
                : [
                    "==",
                    ["get", "district"],
                    ""
                  ]
            }

            paint={{
              "line-color": "#ffffff",
              "line-width": 10,
              "line-opacity": 0.55,
              "line-blur": 5
            }}
          />


          {/* POP OUT BORDER */}

          <Layer
            id="hover-border"
            type="line"

            filter={
              hoveredDistrict
                ? [
                    "==",
                    ["get", "district"],
                    hoveredDistrict
                  ]
                : [
                    "==",
                    ["get", "district"],
                    ""
                  ]
            }

            paint={{
              "line-color": "#ffffff",
              "line-width": 5
            }}
          />


          {/* DISTRICT LABELS */}

          <Layer
            id="district-labels"
            type="symbol"

            layout={{
              "text-field":
                ["get", "district"],

              "text-size": 12,

              "text-anchor":
                "center"
            }}

            paint={{
              "text-color": "#0f172a",

              "text-halo-color":
                "#ffffff",

              "text-halo-width": 2
            }}
          />

        </Source>


        {/* =========================
            HOVER POPUP
        ========================== */}

        {hoveredDistrict &&
          popupLocation && (

          <Popup
            longitude={
              popupLocation.longitude
            }

            latitude={
              popupLocation.latitude
            }

            closeButton={false}

            closeOnClick={false}

            offset={20}
          >

            <div className="district-popup">

              <p className="popup-small">
                FLOOD HISTORY
              </p>

              <h2>
                {hoveredDistrict}
              </h2>


              <div className="popup-stat">

                <span>
                  🌊 Flood Events
                </span>

                <strong>
                  {
                    districtData[
                      hoveredDistrict
                    ]?.floods ?? 0
                  }
                </strong>

              </div>


              <div className="popup-stat">

                <span>
                  ⚠ Risk Level
                </span>

                <strong
                  style={{
                    color: getRiskColor(
                      districtData[
                        hoveredDistrict
                      ]?.risk
                    )
                  }}
                >
                  {
                    districtData[
                      hoveredDistrict
                    ]?.risk ??
                    "Unassigned"
                  }
                </strong>

              </div>


              <p className="popup-description">

                {
                  districtData[
                    hoveredDistrict
                  ]?.description ??
                  "Flood information is currently unavailable."
                }

              </p>

              <p className="demo-warning">
                Demo frontend data
              </p>

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

          <span
            className="legend-color"
            style={{
              background: "#22c55e"
            }}
          ></span>

          Low

        </div>


        <div className="legend-item">

          <span
            className="legend-color"
            style={{
              background: "#eab308"
            }}
          ></span>

          Moderate

        </div>


        <div className="legend-item">

          <span
            className="legend-color"
            style={{
              background: "#f97316"
            }}
          ></span>

          High

        </div>


        <div className="legend-item">

          <span
            className="legend-color"
            style={{
              background: "#ef4444"
            }}
          ></span>

          Critical

        </div>


        <div className="legend-item">

          <span
            className="legend-color"
            style={{
              background: "#94a3b8"
            }}
          ></span>

          Unassigned

        </div>

      </div>

    </div>
  );
}

export default FloodMap;