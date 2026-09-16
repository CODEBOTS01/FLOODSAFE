import { useState } from "react";

import FloodMap from "./components/FloodMap";
import LoginPage from "./components/loginpage";
import LocationStats from "./components/Locationstats";
import OfficialAlerts from "./components/OfficialAlerts";

import "./App.css";


type UserData = {
  name: string;
  mobile: string;
  place: string;
  email: string;
  latitude: number;
  longitude: number;
};


type Language = "en" | "hi";


const translations = {

  en: {

    platform:
      "Uttarakhand Flood Safety & Awareness Platform",

    platformRight:
      "Emergency Information System",

    floodMonitoring:
      "Flood Monitoring System",

    home:
      "Home",

    map:
      "Map",

    alerts:
      "Alerts",

    dashboard:
      "Dashboard",

    heroLabel:
      "UTTARAKHAND FLOOD SAFETY SYSTEM",

    heroLine1:
      "Flood awareness.",

    heroLine2:
      "Safer decisions.",

    heroLine3:
      "Better preparedness.",

    heroDescription:
      "Monitor local conditions, understand flood risk and find safer routes during uncertain weather conditions.",

    findRoute:
      "Find Safe Route",

    viewAlerts:
      "View Alerts",

    mapLabel:
      "LIVE RISK MAP",

    mapTitle:
      "Flood Risk Across Uttarakhand",

    mapDescription:
      "Explore district-level flood-risk information across Uttarakhand.",

    monitoring:
      "Monitoring Active",

    mapName:
      "Uttarakhand Risk Map",

    mapSubtext:
      "Interactive flood-risk visualization",

    live:
      "LIVE",

    safetyLabel:
      "SAFETY REMINDER",

    safetyTitle:
      "Never attempt to cross a flooded road.",

    safetyText:
      "Flood depth, current strength and road damage may not be visible. Use safer routes and follow official instructions.",

    alertLabel:
      "OFFICIAL ALERTS",

    alertTitle:
      "Emergency Alerts",

    alertDescription:
      "Available public emergency information relevant to your selected location.",

    footerText:
      "Flood monitoring, awareness and safer navigation.",

    footerSafety:
      "Safety information platform"

  },


  hi: {

    platform:
      "उत्तराखंड बाढ़ सुरक्षा एवं जागरूकता मंच",

    platformRight:
      "आपातकालीन सूचना प्रणाली",

    floodMonitoring:
      "बाढ़ निगरानी प्रणाली",

    home:
      "होम",

    map:
      "मानचित्र",

    alerts:
      "चेतावनियाँ",

    dashboard:
      "डैशबोर्ड",

    heroLabel:
      "उत्तराखंड बाढ़ सुरक्षा प्रणाली",

    heroLine1:
      "बाढ़ के प्रति जागरूकता।",

    heroLine2:
      "सुरक्षित निर्णय।",

    heroLine3:
      "बेहतर तैयारी।",

    heroDescription:
      "स्थानीय परिस्थितियों की निगरानी करें, बाढ़ जोखिम को समझें और खराब मौसम के दौरान सुरक्षित मार्ग खोजें।",

    findRoute:
      "सुरक्षित मार्ग खोजें",

    viewAlerts:
      "चेतावनियाँ देखें",

    mapLabel:
      "लाइव जोखिम मानचित्र",

    mapTitle:
      "उत्तराखंड में बाढ़ जोखिम",

    mapDescription:
      "उत्तराखंड के जिलों में बाढ़ जोखिम की जानकारी इंटरैक्टिव मानचित्र पर देखें।",

    monitoring:
      "निगरानी सक्रिय",

    mapName:
      "उत्तराखंड जोखिम मानचित्र",

    mapSubtext:
      "इंटरैक्टिव बाढ़ जोखिम दृश्य",

    live:
      "लाइव",

    safetyLabel:
      "सुरक्षा संदेश",

    safetyTitle:
      "बाढ़ वाली सड़क को पार करने का प्रयास न करें।",

    safetyText:
      "पानी की गहराई, बहाव और सड़क की क्षति दिखाई नहीं दे सकती। सुरक्षित मार्ग का उपयोग करें और आधिकारिक निर्देशों का पालन करें।",

    alertLabel:
      "आधिकारिक चेतावनियाँ",

    alertTitle:
      "आपातकालीन चेतावनियाँ",

    alertDescription:
      "आपके चुने हुए स्थान से संबंधित उपलब्ध सार्वजनिक आपातकालीन जानकारी।",

    footerText:
      "बाढ़ निगरानी, जागरूकता और सुरक्षित मार्ग सहायता।",

    footerSafety:
      "सुरक्षा सूचना मंच"

  }

};


function App() {

  const [userData, setUserData] =
    useState<UserData | null>(null);


  const [language, setLanguage] =
    useState<Language>("en");


  const t =
    translations[language];


  /* ========================================
     LOGIN
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
     MAIN FLOODSAFE WEBSITE
  ======================================== */

  return (

    <div className="official-app">


      {/* ========================================
          TOP INFORMATION BAR
      ======================================== */}

      <div className="official-topbar">

        <div className="official-topbar-inner">

          <span>
            {t.platform}
          </span>


          <span className="topbar-right">
            {t.platformRight}
          </span>

        </div>

      </div>



      {/* ========================================
          NAVBAR
      ======================================== */}

      <header className="official-navbar">

        <div className="official-navbar-inner">


          {/* LOGO */}

          <div
            className="official-brand"
            onClick={() => {

              window.scrollTo({
                top: 0,
                behavior: "smooth"
              });

            }}
          >

            <div className="official-brand-mark">
              FS
            </div>


            <div className="official-brand-text">

              <h1>
                FLOODSAFE
              </h1>

              <p>
                {t.floodMonitoring}
              </p>

            </div>

          </div>



          {/* RIGHT NAVIGATION AREA */}

          <div className="navbar-right-area">


            <nav className="official-nav-links">


              <button
                type="button"
                onClick={() => {

                  window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                  });

                }}
              >
                {t.home}
              </button>


              <button
                type="button"
                onClick={() => {

                  document
                    .getElementById("flood-map")
                    ?.scrollIntoView({
                      behavior: "smooth"
                    });

                }}
              >
                {t.map}
              </button>


              <button
                type="button"
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
                {t.alerts}
              </button>


              <button
                type="button"
                onClick={() => {

                  window.location.href =
                    "https://floodsafe-u207.onrender.com/";

                }}
              >
                {t.dashboard}
              </button>


            </nav>



            {/* ========================================
                LANGUAGE CHOOSER
            ======================================== */}

            <div className="dashboard-language-switcher">


              <button
                type="button"
                className={
                  language === "en"
                    ? "dashboard-language active-dashboard-language"
                    : "dashboard-language"
                }
                onClick={() =>
                  setLanguage("en")
                }
              >
                ENGLISH
              </button>


              <span>
                |
              </span>


              <button
                type="button"
                className={
                  language === "hi"
                    ? "dashboard-language active-dashboard-language"
                    : "dashboard-language"
                }
                onClick={() =>
                  setLanguage("hi")
                }
              >
                हिन्दी
              </button>


            </div>


          </div>


        </div>

      </header>



      {/* ========================================
          SAFFRON LINE
      ======================================== */}

      <div className="official-accent-line">
      </div>



      {/* ========================================
          HERO
      ======================================== */}

      <section className="official-hero">

        <div className="official-hero-inner">


          <p className="official-hero-label">
            {t.heroLabel}
          </p>


          <h2>

            {t.heroLine1}

            <br />

            <span>
              {t.heroLine2}
            </span>

            <br />

            <strong>
              {t.heroLine3}
            </strong>

          </h2>


          <p className="official-hero-description">
            {t.heroDescription}
          </p>



          <div className="official-hero-actions">


            <button
              type="button"
              className="official-primary-button"
              onClick={() => {

                window.location.href =
                  "https://floodsafe-u207.onrender.com/app";

              }}
            >

              {t.findRoute}

              <span>
                →
              </span>

            </button>


            <button
              type="button"
              className="official-secondary-button"
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

              {t.viewAlerts}

            </button>


          </div>


        </div>

      </section>



      {/* ========================================
          MAIN CONTENT
      ======================================== */}

      <main className="official-main-content">


        {/* ========================================
            MAP
        ======================================== */}

        <section
          className="official-section"
          id="flood-map"
        >


          <div className="official-section-header">


            <div>

              <p className="official-section-label">
                {t.mapLabel}
              </p>


              <h2>
                {t.mapTitle}
              </h2>


              <p className="official-section-description">
                {t.mapDescription}
              </p>

            </div>



            <div className="official-status-badge">

              <span className="official-live-dot">
              </span>

              {t.monitoring}

            </div>


          </div>



          <div className="official-map-container">


            <div className="official-map-topbar">


              <div>

                <strong>
                  {t.mapName}
                </strong>


                <span>
                  {t.mapSubtext}
                </span>

              </div>


              <div className="official-live-badge">
                {t.live}
              </div>


            </div>



            <div className="official-map-wrapper">

              <FloodMap />

            </div>


          </div>


        </section>



        {/* ========================================
            LIVE LOCAL CONDITIONS
        ======================================== */}

        <section className="dashboard-local-section">

          <LocationStats
            user={userData}
          />

        </section>



        {/* ========================================
            SAFETY REMINDER
        ======================================== */}

        <section className="official-safety-strip">


          <div className="safety-strip-number">
            01
          </div>


          <div>

            <p className="official-section-label">
              {t.safetyLabel}
            </p>


            <h3>
              {t.safetyTitle}
            </h3>


            <p>
              {t.safetyText}
            </p>

          </div>


        </section>



        {/* ========================================
            OFFICIAL ALERTS
        ======================================== */}

        <section
          className="official-alert-area"
          id="official-alerts"
        >


          <div className="official-section-header">


            <div>

              <p className="official-section-label">
                {t.alertLabel}
              </p>


              <h2>
                {t.alertTitle}
              </h2>


              <p className="official-section-description">
                {t.alertDescription}
              </p>

            </div>


            <div className="official-source-badge">
              NDMA SACHET
            </div>


          </div>



          <OfficialAlerts
            user={userData}
          />


        </section>


      </main>



      {/* ========================================
          FOOTER
      ======================================== */}

      <footer className="official-footer">


        <div className="official-footer-inner">


          <div>

            <h2>
              FLOODSAFE
            </h2>


            <p>
              {t.footerText}
            </p>

          </div>



          <div className="official-footer-right">

            <p>
              {t.footerSafety}
            </p>


            <span>
              © 2026 FLOODSAFE
            </span>

          </div>


        </div>


      </footer>


    </div>

  );

}


export default App;