import { useState } from "react";

type LoginPageProps = {
  onLogin: () => void;
};

function LoginPage({ onLogin }: LoginPageProps) {
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    relativeMobile: "",
    place: "",
    email: ""
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    console.log("User Data:", formData);

    onLogin();
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
                  placeholder="Enter your mobile number"
                  value={formData.mobile}
                  onChange={handleChange}
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                />
              </div>


              <div className="input-group">
                <label>
                  Close Relative's Mobile Number
                </label>

                <input
                  type="tel"
                  name="relativeMobile"
                  placeholder="Emergency contact number"
                  value={formData.relativeMobile}
                  onChange={handleChange}
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                />
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
}

export default LoginPage;