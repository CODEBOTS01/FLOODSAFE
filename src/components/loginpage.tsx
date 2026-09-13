import { useEffect, useState, memo } from "react";
import type { UserData } from "../types/user";


/* ========================================
   TYPES
======================================== */

type LoginPageProps = {
  onLogin: (data: UserData) => void;
};


type LocationSuggestion = {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
};


/* ========================================
   LOGIN PAGE
======================================== */

const LoginPage = memo(function LoginPage({ onLogin }: LoginPageProps) {

  /* ========================================
     FORM DATA
  ======================================== */

  const [formData, setFormData] =
    useState<UserData>({
      name: "",
      mobile: "",
      relativeMobile: "",
      place: "",
      email: "",
      latitude: 0,
      longitude: 0
    });

  const [error, setError] = useState<string | null>(null);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [relativeMobileError, setRelativeMobileError] = useState<string | null>(null);

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanVal = e.target.value.replace(/\D/g, "");
    setFormData((prev) => ({ ...prev, mobile: cleanVal }));
    setMobileError(null);
    if (error) setError(null);
  };

  const handleRelativeMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanVal = e.target.value.replace(/\D/g, "");
    setFormData((prev) => ({ ...prev, relativeMobile: cleanVal }));
    setRelativeMobileError(null);
    if (error) setError(null);
  };


  /* ========================================
     GPS STATES
  ======================================== */

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [locationError, setLocationError] =
    useState("");

  const [gpsDetected, setGpsDetected] =
    useState(false);


  /* ========================================
     LOCATION SEARCH STATES
  ======================================== */

  const [suggestions, setSuggestions] =
    useState<LocationSuggestion[]>([]);

  const [showSuggestions, setShowSuggestions] =
    useState(false);

  const [searchLoading, setSearchLoading] =
    useState(false);

  const [locationTyping, setLocationTyping] =
    useState(false);


  /* ========================================
     HANDLE INPUT CHANGE
  ======================================== */

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    const { name, value } = e.target;


    /* LOCATION INPUT */

    if (name === "place") {

      setFormData((previousData) => ({
        ...previousData,

        place: value,

        /*
          Remove old coordinates
          when user manually types
          another location.
        */

        latitude: 0,
        longitude: 0
      }));


      setLocationTyping(true);

      setGpsDetected(false);

      setLocationError("");

      return;
    }


    /* OTHER INPUTS */

    setFormData((previousData) => ({
      ...previousData,
      [name]: value
    }));
    if (error) setError(null);
  };


  /* ========================================
     LOCATION AUTOCOMPLETE

     Searches Uttarakhand locations.
  ======================================== */

  useEffect(() => {

    const query =
      formData.place.trim();


    /*
      Don't search when the value came
      from GPS or suggestion selection.
    */

    if (!locationTyping) {
      return;
    }


    /*
      Start searching after user
      types at least 2 characters.
    */

    if (query.length < 2) {

      setSuggestions([]);

      setShowSuggestions(false);

      setSearchLoading(false);

      return;
    }


    const controller =
      new AbortController();


    /*
      Wait 400ms before searching.
      This prevents API requests for
      every single keystroke.
    */

    const timer = setTimeout(
      async () => {

        try {

          setSearchLoading(true);


          /*
            Approximate Uttarakhand
            geographic bounding box.

            west,south,east,north
          */

          const uttarakhandBBox =
            "77.3,28.4,81.3,31.6";


          const url =
            "https://photon.komoot.io/api/?" +
            `q=${encodeURIComponent(query)}` +
            `&bbox=${uttarakhandBBox}` +
            "&limit=10" +
            "&lang=en";


          const response =
            await fetch(
              url,
              {
                signal:
                  controller.signal
              }
            );


          if (!response.ok) {

            throw new Error(
              "Location search failed"
            );

          }


          const data =
            await response.json();


          const results:
            LocationSuggestion[] =
            (data.features || [])

              .filter(
                (feature: any) => {

                  const properties =
                    feature.properties || {};


                  const state =
                    (
                      properties.state ||
                      ""
                    ).toLowerCase();


                  /*
                    Only keep places
                    inside Uttarakhand.
                  */

                  return (
                    state.includes(
                      "uttarakhand"
                    )
                  );

                }
              )

              .map(
                (feature: any) => {

                  const properties =
                    feature.properties || {};


                  const coordinates =
                    feature.geometry
                      ?.coordinates || [
                      0,
                      0
                    ];


                  const name =
                    properties.name ||
                    properties.city ||
                    properties.locality ||
                    properties.district ||
                    properties.county ||
                    "Unknown Place";


                  const district =
                    properties.district ||
                    properties.county ||
                    "";


                  const state =
                    properties.state ||
                    "Uttarakhand";


                  let displayName =
                    name;


                  /*
                    Example:

                    Tapovan,
                    Chamoli,
                    Uttarakhand
                  */

                  if (
                    district &&
                    district
                      .toLowerCase() !==
                      name.toLowerCase()
                  ) {

                    displayName +=
                      `, ${district}`;

                  }


                  if (
                    state &&
                    !displayName
                      .toLowerCase()
                      .includes(
                        state.toLowerCase()
                      )
                  ) {

                    displayName +=
                      `, ${state}`;

                  }


                  return {

                    name:
                      name,

                    displayName:
                      displayName,

                    longitude:
                      coordinates[0],

                    latitude:
                      coordinates[1]

                  };

                }
              );


          /* REMOVE DUPLICATES */

          const uniqueResults =
            results.filter(
              (
                location,
                index,
                array
              ) =>

                index ===
                array.findIndex(
                  (item) =>
                    item.displayName ===
                    location.displayName
                )

            );


          setSuggestions(
            uniqueResults
          );


          setShowSuggestions(
            uniqueResults.length > 0
          );


          setSearchLoading(false);

        }

        catch (error: any) {

          if (
            error.name !==
            "AbortError"
          ) {

            console.error(
              "Location search error:",
              error
            );


            setSuggestions([]);

            setShowSuggestions(false);

            setSearchLoading(false);

          }

        }

      },

      400
    );


    /* CLEANUP */

    return () => {

      clearTimeout(timer);

      controller.abort();

    };

  }, [
    formData.place,
    locationTyping
  ]);


  /* ========================================
     SELECT AUTOCOMPLETE LOCATION
  ======================================== */

  const selectLocation = (
    location: LocationSuggestion
  ) => {

    setLocationTyping(false);


    setFormData(
      (previousData) => ({

        ...previousData,

        place:
          location.displayName,

        latitude:
          location.latitude,

        longitude:
          location.longitude

      })
    );


    setSuggestions([]);

    setShowSuggestions(false);

    setGpsDetected(false);

    setLocationError("");


    console.log(
      "Selected location:",
      location.displayName
    );


    console.log(
      "Latitude:",
      location.latitude
    );


    console.log(
      "Longitude:",
      location.longitude
    );

  };


  /* ========================================
     GPS CURRENT LOCATION
  ======================================== */

  const getCurrentLocation = () => {

    setLocationError("");

    setGpsDetected(false);

    setLocationTyping(false);

    setSuggestions([]);

    setShowSuggestions(false);


    /* CHECK GPS SUPPORT */

    if (!navigator.geolocation) {

      setLocationError(
        "GPS location is not supported by your browser."
      );

      return;

    }


    setLocationLoading(true);


    navigator.geolocation.getCurrentPosition(

      /* ========================================
         GPS SUCCESS
      ======================================== */

      async (position) => {

        const latitude =
          position.coords.latitude;

        const longitude =
          position.coords.longitude;


        try {

          /*
            Convert coordinates into
            readable location name.
          */

          const response =
            await fetch(

              "https://nominatim.openstreetmap.org/reverse" +

              "?format=json" +

              `&lat=${latitude}` +

              `&lon=${longitude}`

            );


          if (!response.ok) {

            throw new Error(
              "Could not load location name."
            );

          }


          const data =
            await response.json();


          const address =
            data.address || {};


          const city =
            address.city ||
            address.town ||
            address.village ||
            address.suburb ||
            address.city_district ||
            address.county ||
            address.state_district ||
            "";


          const state =
            address.state ||
            "";


          let readableLocation =
            city;


          if (
            state &&
            !city
              .toLowerCase()
              .includes(
                state.toLowerCase()
              )
          ) {

            readableLocation +=
              `${city ? ", " : ""}${state}`;

          }


          /*
            Save readable location AND
            exact coordinates.
          */

          setFormData(
            (previousData) => ({

              ...previousData,

              place:
                readableLocation ||
                `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,

              latitude:
                latitude,

              longitude:
                longitude

            })
          );


          setGpsDetected(true);

          setLocationLoading(false);


          console.log(
            "GPS Location:",
            readableLocation
          );


          console.log(
            "GPS Latitude:",
            latitude
          );


          console.log(
            "GPS Longitude:",
            longitude
          );

        }

        catch (error) {

          /*
            GPS worked, but readable
            place lookup failed.

            Keep coordinates instead.
          */

          setFormData(
            (previousData) => ({

              ...previousData,

              place:
                `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,

              latitude:
                latitude,

              longitude:
                longitude

            })
          );


          setGpsDetected(true);


          setLocationError(
            "GPS detected, but the place name could not be loaded."
          );


          setLocationLoading(false);

        }

      },


      /* ========================================
         GPS ERROR
      ======================================== */

      (error) => {

        setLocationLoading(false);


        if (error.code === 1) {

          setLocationError(
            "Location permission denied. Please allow location access."
          );

        }

        else if (
          error.code === 2
        ) {

          setLocationError(
            "Your current location could not be detected."
          );

        }

        else if (
          error.code === 3
        ) {

          setLocationError(
            "Location request timed out."
          );

        }

        else {

          setLocationError(
            "Unable to get your current location."
          );

        }

      },


      /* ========================================
         GPS OPTIONS
      ======================================== */

      {
        enableHighAccuracy:
          true,

        timeout:
          10000,

        maximumAge:
          0
      }

    );

  };


  /* ========================================
     FORM SUBMIT
  ======================================== */

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

    console.log("FLOODSAFE User Data:", formData);
    onLogin(formData);
  };


  /* ========================================
     PAGE
  ======================================== */

  return (

    <div className="login-page">

      <div className="login-layout">


        {/* ========================================
            LEFT INFORMATION PANEL
        ======================================== */}

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



            {/* ========================================
                HISTORY CARDS
            ======================================== */}

            <div className="history-cards">


              {/* KEDARNATH */}

              <div
                className="
                  history-card
                  critical-history
                "
              >

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



              {/* CHAMOLI */}

              <div
                className="
                  history-card
                  high-history
                "
              >

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



              {/* MOUNTAIN FLOOD RISK */}

              <div
                className="
                  history-card
                  moderate-history
                "
              >

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



            {/* ========================================
                FLOODSAFE MISSION
            ======================================== */}

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



        {/* ========================================
            RIGHT REGISTRATION PANEL
        ======================================== */}

        <section className="registration-panel">

          <div className="login-card">


            {/* LOGO */}

            <div className="login-logo">

              FLOODSAFE

            </div>


            <p className="login-small">

              FLOOD SAFETY REGISTRATION

            </p>


            <h2>

              Welcome to FLOODSAFE

            </h2>


            <p className="login-description">

              Enter your basic information to continue to FLOODSAFE.

            </p>



            {/* ========================================
                FORM
            ======================================== */}

            <form
              className="login-form"
              onSubmit={handleSubmit}
            >


              {/* ========================================
                  NAME
              ======================================== */}

              <div className="input-group">

                <label>

                  Full Name

                </label>


                <input

                  type="text"

                  name="name"

                  placeholder="Enter your full name"

                  value={
                    formData.name
                  }

                  onChange={
                    handleChange
                  }

                  required

                />

              </div>



              {/* ========================================
                  MOBILE
              ======================================== */}

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
                  <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    ⚠️ {mobileError}
                  </span>
                )}
              </div>


              {/* ========================================
                  CLOSE RELATIVE / PRIMARY EMERGENCY CONTACT
              ======================================== */}
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
                  <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    ⚠️ {relativeMobileError}
                  </span>
                )}
              </div>

              {/* ========================================
                  CURRENT LOCATION
              ======================================== */}

              <div className="input-group">

                <label>

                  Current Place

                </label>


                <div className="location-search-wrapper">


                  {/* LOCATION INPUT */}

                  <input

                    type="text"

                    name="place"

                    autoComplete="off"

                    placeholder="Start typing a place in Uttarakhand..."

                    value={
                      formData.place
                    }

                    onChange={
                      handleChange
                    }


                    onFocus={() => {

                      if (
                        suggestions.length > 0
                      ) {

                        setShowSuggestions(
                          true
                        );

                      }

                    }}


                    onBlur={() => {

                      /*
                        Small delay so user
                        can click suggestion.
                      */

                      setTimeout(
                        () => {

                          setShowSuggestions(
                            false
                          );

                        },

                        200
                      );

                    }}

                    required

                  />



                  {/* ========================================
                      SEARCH LOADING
                  ======================================== */}

                  {searchLoading &&
                    locationTyping && (

                    <div className="location-searching">

                      Searching...

                    </div>

                  )}



                  {/* ========================================
                      AUTOCOMPLETE SUGGESTIONS
                  ======================================== */}

                  {showSuggestions &&
                    suggestions.length > 0 && (

                    <div className="location-suggestions">


                      {suggestions.map(
                        (
                          location,
                          index
                        ) => (

                        <button

                          key={
                            `${location.displayName}-${index}`
                          }

                          type="button"

                          className="location-suggestion"

                          onMouseDown={() => {

                            selectLocation(
                              location
                            );

                          }}

                        >


                          <span className="suggestion-icon">

                            📍

                          </span>


                          <div className="suggestion-text">


                            <strong>

                              {
                                location.name
                              }

                            </strong>


                            <small>

                              {
                                location.displayName
                              }

                            </small>


                          </div>


                        </button>

                      ))}


                    </div>

                  )}

                </div>



                {/* ========================================
                    GPS BUTTON
                ======================================== */}

                <button

                  type="button"

                  className="gps-button"

                  onClick={
                    getCurrentLocation
                  }

                  disabled={
                    locationLoading
                  }

                >

                  {locationLoading

                    ? "📡 Detecting Location..."

                    : "📍 Use My Current Location"

                  }

                </button>



                {/* ========================================
                    GPS ERROR
                ======================================== */}

                {locationError && (

                  <p className="location-error">

                    {
                      locationError
                    }

                  </p>

                )}



                {/* ========================================
                    GPS SUCCESS
                ======================================== */}

                {gpsDetected && (

                  <p className="location-success">

                    ✓ GPS location detected

                  </p>

                )}



                {/* ========================================
                    AUTOCOMPLETE LOCATION SELECTED
                ======================================== */}

                {!gpsDetected &&
                  formData.latitude !== 0 &&
                  formData.longitude !== 0 && (

                  <p className="location-selected">

                    ✓ Location selected

                  </p>

                )}

              </div>



              {/* ========================================
                  EMAIL
              ======================================== */}

              <div className="input-group">

                <label>

                  Email Address

                </label>


                <input

                  type="email"

                  name="email"

                  placeholder="Enter your email address"

                  value={
                    formData.email
                  }

                  onChange={
                    handleChange
                  }

                  required

                />

              </div>


              {error && (
                <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "8px", marginBottom: "8px", fontWeight: "bold" }}>
                  ⚠️ {error}
                </div>
              )}

              {/* ========================================
                  CONTINUE BUTTON
              ======================================== */}
              <button

                type="submit"

                className="login-button"

              >

                Continue to FLOODSAFE →

              </button>

            </form>



            {/* ========================================
                PRIVACY MESSAGE
            ======================================== */}

            <p className="privacy-message">

              🔒 Your location and information should only
              be used for flood safety and response purposes.

            </p>

          </div>

        </section>

      </div>

    </div>

  );
});

export default LoginPage;