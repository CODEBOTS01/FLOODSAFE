import { useState } from "react";
import FloodMap from "./components/FloodMap";
import LoginPage from "./components/loginpage";
import "./App.css";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  if (!loggedIn) {
    return (
      <LoginPage
        onLogin={() => setLoggedIn(true)}
      />
    );
  }

  return (
    <div className="app-background">
      {/* Animated glowing background */}
      <div className="blob blob1"></div>
      <div className="blob blob2"></div>
      <div className="blob blob3"></div>

      <div className="page">
        {/* NAVBAR */}
        <header className="navbar">
          <h2>FLOODSAFE</h2>

          <nav>
            <span>Home</span>
            <span>Map</span>
            <span>Alerts</span>
            <span>Dashboard</span>
          </nav>
        </header>

        {/* HERO */}
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
              <button
                className="primary-btn"
                onClick={() => {
                  window.location.href =
                    "https://floodsafe-u207.onrender.com/app";
                }}
              >
                Find Safe Route
              </button>

              <button className="secondary-btn">
                View Alerts
              </button>
            </div>
          </div>
        </section>

        {/* MAP SECTION */}
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
              <span className="status-dot"></span>
              Monitoring Active
            </div>
          </div>

          <div className="map-card">
            <FloodMap />
          </div>
        </section>

        {/* STATISTICS */}
        <section className="stats">
          <div className="card">
            <div className="card-icon">
              🌧️
            </div>

            <div>
              <p className="card-title">
                Rainfall
              </p>

              <h2>72 mm</h2>

              <p className="card-text">
                Last 24 Hours
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-icon">
              🌊
            </div>

            <div>
              <p className="card-title">
                Water Level
              </p>

              <h2>2.4 m</h2>

              <p className="card-text">
                Moderate
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-icon">
              🏠
            </div>

            <div>
              <p className="card-title">
                Safe Shelters
              </p>

              <h2>18</h2>

              <p className="card-text">
                Available
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-icon">
              ⚠️
            </div>

            <div>
              <p className="card-title">
                Active Alerts
              </p>

              <h2>2</h2>

              <p className="card-text">
                Requires Attention
              </p>
            </div>
          </div>
        </section>

        {/* ALERTS */}
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

          <div className="alert high-alert">
            <div className="alert-icon">
              ⚠️
            </div>

            <div>
              <h3>
                Heavy Rainfall Warning
              </h3>

              <p>
                Heavy rainfall reported in Chamoli district.
              </p>
            </div>

            <span className="high-label">
              HIGH
            </span>
          </div>

          <div className="alert moderate-alert">
            <div className="alert-icon">
              🌊
            </div>

            <div>
              <h3>
                Water Level Rising
              </h3>

              <p>
                Increased water level detected near Rudraprayag.
              </p>
            </div>

            <span className="moderate-label">
              MODERATE
            </span>
          </div>
        </section>

        {/* FOOTER */}
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