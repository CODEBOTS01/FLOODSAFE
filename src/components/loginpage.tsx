import { useState, memo } from "react";
import type { UserData } from "../types/user";

type LoginPageProps = {
  onLogin: (data: UserData) => void;
};

const LoginPage = memo(function LoginPage({ onLogin }: LoginPageProps) {
  const [formData, setFormData] = useState<UserData>({
    name: "",
    mobile: "",
    relativeMobile: "",
    place: "",
    email: ""
  });
  const [error, setError] = useState<string | null>(null);

  const [mobileError, setMobileError] = useState<string | null>(null);
  const [relativeMobileError, setRelativeMobileError] = useState<string | null>(null);

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep only numbers
    const cleanVal = e.target.value.replace(/\D/g, "");
    setFormData((prev) => ({ ...prev, mobile: cleanVal }));
    setMobileError(null);
    if (error) setError(null);
  };

  const handleRelativeMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep only numbers
    const cleanVal = e.target.value.replace(/\D/g, "");
    setFormData((prev) => ({ ...prev, relativeMobile: cleanVal }));
    setRelativeMobileError(null);
    if (error) setError(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value
    });
    if (error) setError(null);
  };

  const handleSubmit = (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setMobileError(null);
    setRelativeMobileError(null);
    setError(null);

    const mobile = formData.mobile.trim();
    const relative = formData.relativeMobile.trim();

    if (mobile.length < 10) {
      setMobileError("Please enter a valid 10-digit mobile number (digits only).");
      return;
    }

    if (relative.length < 10) {
      setRelativeMobileError("Please enter a valid 10-digit mobile number (digits only).");
      return;
    }

    if (mobile === relative) {
      setRelativeMobileError("Emergency contact number cannot be the same as your own mobile number.");
      return;
    }

    console.log("User Data:", formData);
    onLogin(formData);
  };

  return (
    <div className="login-page">
      <div className="login-layout">

        {/* LEFT INFORMATION PANEL */}
        <section className="flood-info-panel">

          <div className="info-content">
            <p className="info-small">
              UTTARAKHAND FLOOD AWARENESS
            </p>

            <h1>
              Learn From The Past.
              <br />
              Prepare For The Future.
            </h1>

            <p className="info-description">
              Uttarakhand has experienced several severe flood
              and flash-flood disasters. FLOODSAFE aims to help
              people understand risk and reach safer routes faster.
            </p>

            <div className="history-cards">

              <div className="history-card critical-history">
                <div className="history-year">
                  2013
                </div>

                <div>
                  <h3>
                    Kedarnath Flood Disaster
                  </h3>

                  <p>
                    Extreme rainfall and flooding caused widespread
                    destruction across Kedarnath and surrounding
                    areas.
                  </p>

                  <span>
                    Kedarnath • Rudraprayag
                  </span>
                </div>
              </div>


              <div className="history-card high-history">
                <div className="history-year">
                  2021
                </div>

                <div>
                  <h3>
                    Chamoli Flash Flood
                  </h3>

                  <p>
                    A sudden flood affected the Rishiganga and
                    Dhauliganga valleys and damaged infrastructure.
                  </p>

                  <span>
                    Chamoli District
                  </span>
                </div>
              </div>


              <div className="history-card moderate-history">
                <div className="history-year">
                  ⚠
                </div>

                <div>
                  <h3>
                    Mountain Flood Risk
                  </h3>

                  <p>
                    Steep terrain, intense rainfall, landslides and
                    rapidly rising rivers can create dangerous
                    flash-flood conditions.
                  </p>

                  <span>
                    Stay alert • Know your route
                  </span>
                </div>
              </div>

            </div>

            <div className="safety-message">
              <span className="safety-icon">
                🛡️
              </span>

              <div>
                <strong>
                  FLOODSAFE Mission
                </strong>

                <p>
                  Predict risk. Visualize danger. Find safer routes.
                </p>
              </div>
            </div>
          </div>
        </section>


        {/* RIGHT REGISTRATION PANEL */}
        <section className="registration-panel">

          <div className="login-card">

            <div className="login-logo">
              FLOODSAFE
            </div>

            <p className="login-small">
              EMERGENCY SAFETY REGISTRATION
            </p>

            <h2>
              Welcome to FLOODSAFE
            </h2>

            <p className="login-description">
              Enter your emergency contact information to continue.
            </p>


            <form
              className="login-form"
              onSubmit={handleSubmit}
            >

              <div className="input-group">
                <label>
                  Full Name
                </label>

                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>


              <div className="input-group">
                <label>
                  Mobile Number
                </label>

                <input
                  type="tel"
                  name="mobile"
                  placeholder="10-digit mobile number"
                  value={formData.mobile}
                  onChange={handleMobileChange}
                  pattern="[0-9]{10}"
                  maxLength={10}
                  title="Please enter exactly 10 digits (numbers only)"
                  required
                />
                {mobileError && (
                  <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                    ⚠️ {mobileError}
                  </span>
                )}
              </div>


              <div className="input-group">
                <label>
                  Close Relative's Mobile Number (Primary Emergency Contact)
                </label>

                <input
                  type="tel"
                  name="relativeMobile"
                  placeholder="10-digit emergency contact number"
                  value={formData.relativeMobile}
                  onChange={handleRelativeMobileChange}
                  pattern="[0-9]{10}"
                  maxLength={10}
                  title="Please enter exactly 10 digits (numbers only)"
                  required
                />
                {relativeMobileError && (
                  <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                    ⚠️ {relativeMobileError}
                  </span>
                )}
              </div>


              <div className="input-group">
                <label>
                  Current Place
                </label>

                <input
                  type="text"
                  name="place"
                  placeholder="Example: Chamoli, Uttarakhand"
                  value={formData.place}
                  onChange={handleChange}
                  required
                />
              </div>


              <div className="input-group">
                <label>
                  Email Address
                </label>

                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>


              {error && (
                <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "8px", fontWeight: "bold" }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                className="login-button"
              >
                Continue to FLOODSAFE →
              </button>

            </form>


            <p className="privacy-message">
              🔒 Emergency information should only be used
              for safety and response purposes.
            </p>

          </div>
        </section>

      </div>
    </div>
  );
});

export default LoginPage;