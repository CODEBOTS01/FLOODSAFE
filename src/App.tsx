import { useState } from "react";

import FloodMap from "./components/FloodMap";
import LoginPage from "./components/loginpage";
import LocationStats from "./components/Locationstats";
import OfficialAlerts from "./components/OfficialAlerts";

import "./App.css";


/* ========================================
   USER DATA TYPE
======================================== */

type UserData = {
  name: string;
  mobile: string;
  place: string;
  email: string;
  latitude: number;
  longitude: number;
};


function App() {

  /* ========================================
     STORE USER + LOCATION
  ======================================== */

  const [userData, setUserData] =
    useState<UserData | null>(null);


  /* ========================================
     SHOW LOGIN PAGE FIRST
  ======================================== */

  if (!userData) {

    return (

      <LoginPage

        onLogin={(data) => {

          setUserData(data);

        }}

      />

    );

  }


  /* ========================================
     MAIN FLOODSAFE DASHBOARD
  ======================================== */

  return (

    <div className="app-background">


      {/* ========================================
          ANIMATED BACKGROUND
      ======================================== */}

      <div className="blob blob1"></div>

      <div className="blob blob2"></div>

      <div className="blob blob3"></div>



      <div className="page">


        {/* ========================================
            NAVBAR
        ======================================== */}

        <header className="navbar">

          <h2>
            FLOODSAFE
          </h2>


          <nav>


            {/* HOME */}

            <span
              onClick={() => {

                window.scrollTo({
                  top: 0,
                  behavior: "smooth"
                });

              }}
            >

              Home

            </span>



            {/* MAP */}

            <span
              onClick={() => {

                document
                  .getElementById("flood-map")
                  ?.scrollIntoView({
                    behavior: "smooth"
                  });

              }}
            >

              Map

            </span>



            {/* ALERTS */}

            <span
              onClick={() => {

                document
                  .getElementById(
                    "official-alerts"
                  )
                  ?.scrollIntoView({
                    behavior: "smooth"
                  });

              }}
            >

              Alerts

            </span>



            {/* DASHBOARD */}

            <span

              onClick={() => {

                window.location.href =
                  "https://floodsafe-u207.onrender.com/";

              }}

            >

              Dashboard

            </span>


          </nav>

        </header>



        {/* ========================================
            HERO SECTION
        ======================================== */}

        <section className="hero">

          <div className="hero-content">


            <p className="hero-badge">

              UTTARAKHAND FLOOD SAFETY SYSTEM

            </p>


            <h1>

              Stay Safe During Flood Emergencies

            </h1>


            <p className="hero-description">

              Flood risk visualization and safer route planning
              for Uttarakhand.

            </p>



            <div className="hero-buttons">


              {/* ========================================
                  FIND SAFE ROUTE
              ======================================== */}

              <button

                className="primary-btn"

                onClick={() => {

                  window.location.href =
                    "https://floodsafe-u207.onrender.com/app";

                }}

              >

                Find Safe Route

              </button>



              {/* ========================================
                  VIEW ALERTS
              ======================================== */}

              <button

                className="secondary-btn"

                onClick={() => {

                  document
                    .getElementById(
                      "official-alerts"
                    )
                    ?.scrollIntoView({
                      behavior: "smooth"
                    });

                }}

              >

                View Alerts

              </button>


            </div>

          </div>

        </section>



        {/* ========================================
            FLOOD MAP SECTION
        ======================================== */}

        <section
          className="map-section"
          id="flood-map"
        >


          <div className="section-heading">


            <div>


              <p className="small-heading">

                LIVE RISK MAP

              </p>


              <h2>

                Flood Risk Across Uttarakhand

              </h2>


            </div>



            <div className="status-badge">


              <span className="status-dot">
              </span>


              Monitoring Active


            </div>


          </div>



          <div className="map-card">

            <FloodMap />

          </div>


        </section>



        {/* ========================================
            LIVE USER LOCATION DATA
        ======================================== */}

        <LocationStats
          user={userData}
        />



        {/* ========================================
            OFFICIAL EMERGENCY ALERTS

            Fake alerts removed.

            This component uses the
            user's selected location.
        ======================================== */}

        <div id="official-alerts">

          <OfficialAlerts
            user={userData}
          />

        </div>



        {/* ========================================
            FOOTER
        ======================================== */}

        <footer className="footer">


          <div>


            <h3>

              FLOODSAFE

            </h3>


            <p>

              Flood monitoring and safety visualization system.

            </p>


          </div>



          <p>

            © 2026 FLOODSAFE

          </p>


        </footer>


      </div>

    </div>

  );

}


export default App;