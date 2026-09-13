import {
  useEffect,
  useState
} from "react";


/* ========================================
   TYPES
======================================== */

type UserLocation = {
  place: string;
  latitude: number;
  longitude: number;
};


type LocationStatsProps = {
  user: UserLocation;
};


type StatsData = {
  rainfall: number | null;
  discharge: number | null;
  shelters: number | null;
  alerts: number | null;
};


/* ========================================
   LOCATION STATS COMPONENT
======================================== */

function LocationStats({
  user
}: LocationStatsProps) {

  const [stats, setStats] =
    useState<StatsData>({
      rainfall: null,
      discharge: null,
      shelters: null,
      alerts: null
    });


  const [loading, setLoading] =
    useState(true);


  /* ========================================
     DISTANCE BETWEEN TWO COORDINATES
  ======================================== */

  const getDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {

    const R = 6371;


    const dLat =
      ((lat2 - lat1) * Math.PI) / 180;


    const dLon =
      ((lon2 - lon1) * Math.PI) / 180;


    const a =

      Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +

      Math.cos(
        (lat1 * Math.PI) / 180
      ) *

      Math.cos(
        (lat2 * Math.PI) / 180
      ) *

      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);


    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );


    return R * c;
  };


  /* ========================================
     LOAD LIVE LOCATION DATA
  ======================================== */

  useEffect(() => {

    if (
      !user.latitude ||
      !user.longitude
    ) {

      setLoading(false);

      return;
    }


    const loadData = async () => {

      setLoading(true);


      const lat =
        user.latitude;


      const lon =
        user.longitude;



      /* ========================================
         1. RAINFALL
         OPEN-METEO
      ======================================== */

      let rainfall:
        number | null = null;


      try {

        const weatherURL =

          "https://api.open-meteo.com/v1/forecast" +

          `?latitude=${lat}` +

          `&longitude=${lon}` +

          "&hourly=precipitation" +

          "&past_hours=24" +

          "&forecast_hours=1";


        const response =
          await fetch(
            weatherURL
          );


        if (!response.ok) {

          throw new Error(
            `Weather API failed: ${response.status}`
          );

        }


        const data =
          await response.json();


        const rainfallValues:
          number[] =

          data.hourly
            ?.precipitation || [];


        const previous24Hours =
          rainfallValues.slice(
            0,
            24
          );


        const totalRainfall =
          previous24Hours.reduce(
            (
              total,
              value
            ) => {

              return (
                total +
                (value || 0)
              );

            },
            0
          );


        rainfall =
          Number(
            totalRainfall.toFixed(1)
          );


      } catch (error) {

        console.error(
          "Rainfall API error:",
          error
        );

      }



      /* ========================================
         2. RIVER DISCHARGE
         OPEN-METEO GLOFAS
      ======================================== */

      let discharge:
        number | null = null;


      try {

        const floodURL =

          "https://flood-api.open-meteo.com/v1/flood" +

          `?latitude=${lat}` +

          `&longitude=${lon}` +

          "&daily=river_discharge" +

          "&forecast_days=1";


        const response =
          await fetch(
            floodURL
          );


        if (!response.ok) {

          throw new Error(
            `Flood API failed: ${response.status}`
          );

        }


        const data =
          await response.json();


        const value =
          data.daily
            ?.river_discharge
            ?.[0];


        if (
          typeof value ===
          "number"
        ) {

          discharge =
            Number(
              value.toFixed(1)
            );

        }


      } catch (error) {

        console.error(
          "Flood API error:",
          error
        );

      }



      /* ========================================
         3. NEARBY EMERGENCY SHELTERS
         OPENSTREETMAP OVERPASS
      ======================================== */

      let shelters:
        number | null = null;


      try {

        /*
          Search 15 km around
          the selected location.

          We only ask for the COUNT,
          not full map geometry.
        */

        const overpassQuery = `

          [out:json][timeout:25];

          (

            nwr
              ["amenity"="social_facility"]
              ["social_facility"="shelter"]
              (around:15000,${lat},${lon});

            nwr
              ["emergency:social_facility"="shelter"]
              (around:15000,${lat},${lon});

            nwr
              ["evacuation_center"="yes"]
              (around:15000,${lat},${lon});

          );

          out count;

        `;


        /*
          If one public server is slow,
          automatically try another.
        */

        const overpassServers = [

          "https://overpass-api.de/api/interpreter",

          "https://overpass.kumi.systems/api/interpreter"

        ];


        for (
          const server
          of overpassServers
        ) {

          try {

            const controller =
              new AbortController();


            /*
              Stop waiting after
              30 seconds.
            */

            const timeout =
              setTimeout(
                () => {

                  controller.abort();

                },
                30000
              );


            const response =
              await fetch(
                server,
                {

                  method:
                    "POST",

                  headers: {

                    "Content-Type":
                      "application/x-www-form-urlencoded"

                  },

                  body:
                    "data=" +
                    encodeURIComponent(
                      overpassQuery
                    ),

                  signal:
                    controller.signal

                }
              );


            clearTimeout(
              timeout
            );


            if (!response.ok) {

              console.warn(
                "Overpass server failed:",
                server,
                response.status
              );

              continue;

            }


            const contentType =
              response.headers.get(
                "content-type"
              ) || "";


            if (
              !contentType.includes(
                "json"
              )
            ) {

              console.warn(
                "Overpass returned non-JSON:",
                server
              );

              continue;

            }


            const data =
              await response.json();


            /*
              out count returns:

              {
                elements: [
                  {
                    type: "count",
                    tags: {
                      total: "4"
                    }
                  }
                ]
              }
            */

            const total =
              data.elements?.[0]
                ?.tags
                ?.total;


            if (
              total !== undefined
            ) {

              shelters =
                Number(total);

            } else {

              shelters = 0;

            }


            console.log(
              "Mapped shelters:",
              shelters
            );


            /*
              Successful server.
              Stop trying others.
            */

            break;


          } catch (error: any) {

            if (
              error.name ===
              "AbortError"
            ) {

              console.warn(
                "Overpass server timed out:",
                server
              );

            } else {

              console.warn(
                "Overpass server error:",
                server,
                error
              );

            }

          }

        }


      } catch (error) {

        console.error(
          "Shelter lookup failed:",
          error
        );

      }



      /* ========================================
         4. OFFICIAL NDMA SACHET ALERTS

         Uses Vite proxy:
         /api/sachet
      ======================================== */

      let alerts:
        number | null = null;


      try {

        const response =
          await fetch(
            "/api/sachet"
          );


        if (!response.ok) {

          throw new Error(
            `SACHET request failed: ${response.status}`
          );

        }


        const contentType =
          response.headers.get(
            "content-type"
          ) || "";


        if (
          !contentType.includes(
            "json"
          )
        ) {

          throw new Error(
            "SACHET did not return JSON"
          );

        }


        const data =
          await response.json();


        const alertArray =
          Array.isArray(data)
            ? data
            : [];


        /* ========================================
           USER LOCATION TERMS

           Example:

           Dehradun, Uttarakhand

           becomes:

           dehradun
           uttarakhand
        ======================================== */

        const locationTerms =
          user.place

            .toLowerCase()

            .split(",")

            .map(
              (item) =>
                item.trim()
            )

            .filter(
              (item) =>
                item.length > 2
            );


        /* ========================================
           FILTER RELEVANT ALERTS
        ======================================== */

        const relevantAlerts =
          alertArray.filter(
            (alert: any) => {


              const alertText =

                (
                  `${alert.area_description || ""} ` +

                  `${alert.warning_message || ""} ` +

                  `${alert.disaster_type || ""}`
                )

                  .toLowerCase();


              /*
                Check text for the
                selected place.
              */

              const textMatch =
                locationTerms.some(
                  (location) =>

                    alertText.includes(
                      location
                    )

                );


              if (textMatch) {

                return true;

              }


              /*
                Also check alert coordinates
                if centroid is available.

                Expected:
                longitude,latitude
              */

              if (
                alert.centroid
              ) {

                const coordinates =
                  String(
                    alert.centroid
                  )

                    .split(",")

                    .map(Number);


                if (
                  coordinates.length === 2 &&

                  !Number.isNaN(
                    coordinates[0]
                  ) &&

                  !Number.isNaN(
                    coordinates[1]
                  )
                ) {

                  const alertLon =
                    coordinates[0];


                  const alertLat =
                    coordinates[1];


                  const distance =
                    getDistance(

                      lat,
                      lon,

                      alertLat,
                      alertLon

                    );


                  /*
                    Show alerts within
                    approximately 100 km.
                  */

                  return (
                    distance <= 100
                  );

                }

              }


              return false;

            }
          );


        /* ========================================
           REMOVE DUPLICATES
        ======================================== */

        const uniqueAlerts =
          relevantAlerts.filter(
            (
              alert: any,
              index: number,
              array: any[]
            ) => {

              const identifier =
                String(
                  alert.identifier ||
                  `${alert.area_description}-${alert.disaster_type}`
                );


              return (

                index ===

                array.findIndex(
                  (item: any) => {

                    const itemIdentifier =
                      String(
                        item.identifier ||
                        `${item.area_description}-${item.disaster_type}`
                      );


                    return (
                      itemIdentifier ===
                      identifier
                    );

                  }
                )

              );

            }
          );


        alerts =
          uniqueAlerts.length;


      } catch (error) {

        console.error(
          "NDMA SACHET error:",
          error
        );


        /*
          Do not fake alert data.
        */

        alerts =
          null;

      }



      /* ========================================
         UPDATE ALL CARDS
      ======================================== */

      setStats({

        rainfall:
          rainfall,

        discharge:
          discharge,

        shelters:
          shelters,

        alerts:
          alerts

      });


      setLoading(false);

    };


    loadData();


  }, [
    user.latitude,
    user.longitude,
    user.place
  ]);



  /* ========================================
     PAGE
  ======================================== */

  return (

    <section className="local-stats-section">


      {/* ========================================
          LOCATION TITLE
      ======================================== */}

      <div className="stats-location-heading">


        <div>


          <p className="small-heading">

            LIVE LOCAL CONDITIONS

          </p>


          <h2>

            📍 {user.place}

          </h2>


        </div>



        <div className="live-data-badge">


          <span className="status-dot">
          </span>


          Live Data


        </div>


      </div>



      {/* ========================================
          STAT CARDS
      ======================================== */}

      <div className="stats">


        {/* ========================================
            RAINFALL
        ======================================== */}

        <div className="card">


          <div className="card-icon">

            🌧️

          </div>


          <div>


            <p className="card-title">

              Rainfall

            </p>


            <h2>

              {
                loading

                  ? "..."

                  : stats.rainfall !== null

                  ? `${stats.rainfall} mm`

                  : "—"
              }

            </h2>


            <p className="card-text">

              Previous 24 Hours

            </p>


          </div>


        </div>



        {/* ========================================
            RIVER DISCHARGE
        ======================================== */}

        <div className="card">


          <div className="card-icon">

            🌊

          </div>


          <div>


            <p className="card-title">

              River Discharge

            </p>


            <h2>

              {
                loading

                  ? "..."

                  : stats.discharge !== null

                  ? `${stats.discharge} m³/s`

                  : "—"
              }

            </h2>


            <p className="card-text">

              GloFAS Estimate

            </p>


          </div>


        </div>



        {/* ========================================
            SHELTERS
        ======================================== */}

        <div className="card">


          <div className="card-icon">

            🏠

          </div>


          <div>


            <p className="card-title">

              Mapped Shelters

            </p>


            <h2>

              {
                loading

                  ? "..."

                  : stats.shelters !== null

                  ? stats.shelters

                  : "—"
              }

            </h2>


            <p className="card-text">

              Within 15 km

            </p>


          </div>


        </div>



        {/* ========================================
            OFFICIAL ALERTS
        ======================================== */}

        <div className="card">


          <div className="card-icon">

            ⚠️

          </div>


          <div>


            <p className="card-title">

              Official Alerts

            </p>


            <h2>

              {
                loading

                  ? "..."

                  : stats.alerts !== null

                  ? stats.alerts

                  : "—"
              }

            </h2>


            <p className="card-text">

              NDMA SACHET

            </p>


          </div>


        </div>


      </div>


    </section>

  );

}


export default LocationStats;