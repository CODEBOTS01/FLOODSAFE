import { useState, lazy, Suspense, useCallback, memo } from "react";
import LoginPage from "./components/loginpage";
import LocationStats from "./components/Locationstats";
import SOSButton from "./components/SOSButton";
import EmergencyContacts from "./components/EmergencyContacts";
import { toE164, type UserData } from "./types/user";
import "./App.css";

// Lazy-load FloodMap so the 1.05MB MapLibre bundle is not downloaded until after login
const FloodMap = lazy(() => import("./components/FloodMap"));

/* =======================================================================
   MEMOIZED STATIC SECTIONS
   Eliminates unnecessary re-renders when modal state changes
======================================================================= */

const Navbar = memo(function Navbar({
  contactsCount,
  onOpenContacts,
}: {
  contactsCount: number;
  onOpenContacts: () => void;
}) {
  return (
    <header className="navbar">
      <h2>FLOODSAFE</h2>

      <nav>
        <span
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          Home
        </span>

        <span
          onClick={() => {
            document.querySelector(".map-section")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          Map
        </span>

        <span
          onClick={() => {
            document.querySelector(".alerts")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          Alerts
        </span>

        <span
          onClick={onOpenContacts}
          style={{
            color: "#38bdf8",
            cursor: "pointer",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "5px"
          }}
          title="View and manage emergency contacts"
        >
          📞 Contacts ({contactsCount})
        </span>

        <a
          href="https://floodsafe-u207.onrender.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "inherit",
            textDecoration: "none",
            cursor: "pointer"
          }}
        >
          Dashboard
        </a>
      </nav>
    </header>
  );
});

const HeroSection = memo(function HeroSection() {
  return (
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
            className="secondary-btn"
            onClick={() => {
              document.querySelector(".alerts")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            View Alerts
          </button>
        </div>
      </div>
    </section>
  );
});

const MapSection = memo(function MapSection() {
  return (
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
        <Suspense
          fallback={
            <div
              style={{
                width: "100%",
                height: "500px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(3, 22, 37, 0.95)",
                borderRadius: "14px",
                color: "#38bdf8",
                fontSize: "15px",
                fontWeight: 600,
                letterSpacing: "0.03em"
              }}
            >
              🌊 Loading Uttarakhand Risk Map…
            </div>
          }
        >
          <FloodMap />
        </Suspense>
      </div>
    </section>
  );
});

const AlertsSection = memo(function AlertsSection() {
  return (
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
  );
});

const FooterSection = memo(function FooterSection() {
  return (
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
  );
});

/* =======================================================================
   APP ROOT
======================================================================= */

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [contacts, setContacts] = useState<string[]>([]);
  const [showContactsModal, setShowContactsModal] = useState(false);

  const handleLogin = useCallback((data: UserData) => {
    setUserData(data);
    const primaryContact = toE164(data.relativeMobile);
    setContacts([primaryContact]);
    setLoggedIn(true);
  }, []);

  const handleOpenContacts = useCallback(() => {
    setShowContactsModal(true);
  }, []);

  const handleCloseContacts = useCallback(() => {
    setShowContactsModal(false);
  }, []);

  const handleUpdateContacts = useCallback((updatedContacts: string[]) => {
    setContacts(updatedContacts);
  }, []);

  if (!loggedIn || !userData) {
    return (
      <LoginPage
        onLogin={handleLogin}
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
        {/* NAVBAR */}
        <Navbar
          contactsCount={contacts.length}
          onOpenContacts={handleOpenContacts}
        />

        {/* HERO */}
        <HeroSection />

        {/* MAP SECTION */}
        <MapSection />

        {/* LIVE USER LOCATION STATS */}
        <LocationStats
          user={{
            place: userData.place,
            latitude: userData.latitude || 0,
            longitude: userData.longitude || 0,
          }}
        />

        {/* ALERTS */}
        <AlertsSection />

        {/* FOOTER */}
        <FooterSection />

        {/* Emergency Contacts Modal */}
        {showContactsModal && (
          <EmergencyContacts
            contacts={contacts}
            userMobile={userData.mobile}
            onUpdateContacts={handleUpdateContacts}
            onClose={handleCloseContacts}
          />
        )}

        {/* SOS Emergency Alert — fixed FAB, always accessible on the dashboard */}
        <SOSButton contacts={contacts} userName={userData.name} />
      </div>

    </div>

  );

}

export default App;
