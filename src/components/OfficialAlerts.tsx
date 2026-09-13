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


type OfficialAlertsProps = {
  user: UserLocation;
};


type AlertData = {
  identifier: string | number;

  severity?: string;

  severity_color?: string;

  disaster_type?: string;

  area_description?: string;

  warning_message?: string;

  alert_source?: string;

  effective_start_time?: string;

  effective_end_time?: string;

  actual_lang?: string;

  centroid?: string;
};


/* ========================================
   OFFICIAL ALERTS COMPONENT
======================================== */

function OfficialAlerts({
  user
}: OfficialAlertsProps) {

  const [alerts, setAlerts] =
    useState<AlertData[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  /* ========================================
     LOAD OFFICIAL NDMA ALERTS
  ======================================== */

  useEffect(() => {

    const loadAlerts = async () => {

      setLoading(true);

      setError("");


      try {

        const response =
          await fetch(

            "/api/sachet"

          );


        if (!response.ok) {

          throw new Error(
            "Official alert service unavailable"
          );

        }


        const data =
          await response.json();


        const allAlerts:
          AlertData[] =
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
           FILTER ALERTS FOR USER LOCATION
        ======================================== */

        const filteredAlerts =
          allAlerts.filter(
            (alert) => {

              /*
                Prefer English alerts
              */

              if (
                alert.actual_lang &&
                alert.actual_lang !== "en"
              ) {

                return false;

              }


              const searchableText =

                `${alert.area_description || ""} ` +

                `${alert.warning_message || ""} ` +

                `${alert.disaster_type || ""}`

                  .toLowerCase();


              const locationMatched =
                locationTerms.some(
                  (term) =>
                    searchableText.includes(
                      term
                    )
                );


              return locationMatched;

            }
          );


        /* ========================================
           REMOVE DUPLICATES
        ======================================== */

        const uniqueAlerts =
          filteredAlerts.filter(
            (
              alert,
              index,
              array
            ) =>

              index ===

              array.findIndex(
                (item) =>

                  String(
                    item.identifier
                  ) ===

                  String(
                    alert.identifier
                  )
              )

          );


        setAlerts(
          uniqueAlerts
        );


        setLoading(false);

      }

      catch (error) {

        console.error(
          "NDMA alert error:",
          error
        );


        setError(
          "Official alert data is temporarily unavailable."
        );


        setLoading(false);

      }

    };


    loadAlerts();


    /* ========================================
       AUTO REFRESH EVERY 5 MINUTES
    ======================================== */

    const interval =
      setInterval(
        loadAlerts,
        5 * 60 * 1000
      );


    return () => {

      clearInterval(
        interval
      );

    };


  }, [
    user.place,
    user.latitude,
    user.longitude
  ]);


  /* ========================================
     ALERT STYLE
  ======================================== */

  const getAlertClass = (
    alert: AlertData
  ) => {

    const color =
      alert.severity_color
        ?.toLowerCase();


    if (color === "red") {

      return (
        "official-alert " +
        "critical-official-alert"
      );

    }


    if (color === "orange") {

      return (
        "official-alert " +
        "high-official-alert"
      );

    }


    if (color === "yellow") {

      return (
        "official-alert " +
        "moderate-official-alert"
      );

    }


    return (
      "official-alert " +
      "normal-official-alert"
    );

  };


  /* ========================================
     OPEN NDMA SACHET
  ======================================== */

  const openOfficialAlerts = () => {

    window.open(
      "https://sachet.ndma.gov.in/CapFeed",
      "_blank"
    );

  };


  /* ========================================
     PAGE
  ======================================== */

  return (

    <section className="alerts">


      {/* ========================================
          HEADING
      ======================================== */}

      <div className="alert-heading">


        <div>

          <p className="small-heading">

            OFFICIAL EMERGENCY INFORMATION

          </p>


          <h2>

            Alerts Near {user.place}

          </h2>

        </div>



        <button
          className="view-all"
          onClick={
            openOfficialAlerts
          }
        >

          View All

        </button>


      </div>



      {/* ========================================
          LOADING
      ======================================== */}

      {loading && (

        <div className="alert-loading">


          <span className="alert-loader">
          </span>


          <div>


            <strong>

              Checking official alerts...

            </strong>


            <p>

              Looking for active alerts near
              {" "}
              {user.place}

            </p>


          </div>


        </div>

      )}



      {/* ========================================
          ERROR
      ======================================== */}

      {!loading &&
        error && (

        <div className="alert-unavailable">


          <span>

            ⚠️

          </span>


          <div>


            <strong>

              Official alert service unavailable

            </strong>


            <p>

              {error}

            </p>


          </div>


        </div>

      )}



      {/* ========================================
          NO ALERTS
      ======================================== */}

      {!loading &&
        !error &&
        alerts.length === 0 && (

        <div className="no-official-alerts">


          <div className="safe-alert-icon">

            ✓

          </div>


          <div>


            <h3>

              No active official alerts found

            </h3>


            <p>

              No current NDMA SACHET alerts
              matched {user.place}.

            </p>


            <small>

              Continue monitoring local conditions
              and official instructions.

            </small>


          </div>


        </div>

      )}



      {/* ========================================
          ACTIVE ALERTS
      ======================================== */}

      {!loading &&
        !error &&
        alerts.map(
          (alert) => (

          <div

            key={
              alert.identifier
            }

            className={
              getAlertClass(
                alert
              )
            }

          >


            {/* ICON */}

            <div className="official-alert-icon">

              ⚠️

            </div>



            {/* CONTENT */}

            <div className="official-alert-content">


              <div className="official-alert-top">


                <h3>

                  {
                    alert.disaster_type ||
                    "Emergency Alert"
                  }

                </h3>



                <span className="official-severity">

                  {
                    alert.severity ||
                    "ALERT"
                  }

                </span>


              </div>



              {/* AREA */}

              {alert.area_description && (

                <p className="official-area">

                  📍 {
                    alert.area_description
                  }

                </p>

              )}



              {/* WARNING MESSAGE */}

              {alert.warning_message && (

                <p className="official-warning">

                  {
                    alert.warning_message
                  }

                </p>

              )}



              {/* DETAILS */}

              <div className="official-alert-meta">


                {alert.alert_source && (

                  <span>

                    Source:
                    {" "}
                    {
                      alert.alert_source
                    }

                  </span>

                )}



                {alert.effective_start_time && (

                  <span>

                    Start:
                    {" "}
                    {
                      alert.effective_start_time
                    }

                  </span>

                )}



                {alert.effective_end_time && (

                  <span>

                    Valid until:
                    {" "}
                    {
                      alert.effective_end_time
                    }

                  </span>

                )}


              </div>


            </div>


          </div>

        ))}


    </section>

  );

}


export default OfficialAlerts;