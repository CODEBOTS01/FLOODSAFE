import { useState } from "react";

import FloodMap from "./components/FloodMap";
import LoginPage from "./components/loginpage";
import LocationStats from "./components/Locationstats";

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
     STORE LOGGED-IN USER + LOCATION
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

            <span>
              Home
            </span>

            <span>
              Map
            </span>

            <span>
              Alerts
            </span>

            <span>
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


              {/* SAFE ROUTE */}

              <button

                className="primary-btn"

                onClick={() => {

                  window.location.href =
                    "https://floodsafe-u207.onrender.com/app";

                }}

              >

                Find Safe Route

              </button>



              {/* ALERT BUTTON */}

              <button 
                className="secondary-btn">

                View Alerts

              </button>


            </div>

          </div>

        </section>



        {/* ========================================
            FLOOD MAP SECTION
        ======================================== */}

        <section className="map-section">


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

            Uses:
            - User's selected/GPS location
            - Latitude
            - Longitude

            LocationStats fetches:
            Rainfall
            River discharge
            Shelters
            Alerts
        ======================================== */}

        <LocationStats
          user={userData}
        />



        {/* ========================================
            EMERGENCY ALERTS SECTION
        ======================================== */}

        <section className="alerts">


          <div className="alert-heading">


            <div>

              <p className="small-heading">
                EMERGENCY INFORMATION
              </p>


              <h2>
                Active Emergency Alerts
              </h2>

            </div>



            <button className="view-all">

              View All

            </button>


          </div>



          {/* ========================================
              HIGH ALERT
          ======================================== */}

          <div className="alert high-alert">


            <div className="alert-icon">
              ⚠️
            </div>


            <div>

              <h3>
                Heavy Rainfall Warning
              </h3>


              <p>
                Monitor official flood and rainfall alerts
                for affected areas.
              </p>

            </div>


            <span className="high-label">
              HIGH
            </span>


          </div>



          {/* ========================================
              MODERATE ALERT
          ======================================== */}

          <div className="alert moderate-alert">


            <div className="alert-icon">
              🌊
            </div>


            <div>

              <h3>
                River Monitoring
              </h3>


              <p>
                Check local river conditions before travelling
                through flood-prone routes.
              </p>

            </div>


            <span className="moderate-label">
              MODERATE
            </span>


          </div>


        </section>



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