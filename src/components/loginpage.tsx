import { useEffect, useState } from "react";


/* ========================================
   TYPES
======================================== */

type UserData = {
  name: string;
  mobile: string;
  place: string;
  email: string;
  latitude: number;
  longitude: number;
};


type LoginPageProps = {
  onLogin: (data: UserData) => void;
};


type LocationSuggestion = {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
};


type Language = "en" | "hi";


/* ========================================
   TRANSLATIONS
======================================== */

const translations = {

  en: {

    platform:
      "UTTARAKHAND FLOOD SAFETY & AWARENESS PLATFORM",

    brandDescription:
      "Flood monitoring, emergency awareness and safer navigation for Uttarakhand",

    historyLabel:
      "UTTARAKHAND FLOOD HISTORY",

    historyTitle:
      "Why preparedness matters",

    historyDescription:
      "Uttarakhand's mountain terrain and river valleys can experience rapidly changing conditions during intense rainfall.",

    kedarnathTitle:
      "Kedarnath Flood Disaster",

    kedarnathText:
      "Extreme rainfall and flooding caused widespread destruction around Kedarnath and Rudraprayag.",

    chamoliTitle:
      "Chamoli Flash Flood",

    chamoliText:
      "A major flash flood affected the Rishiganga and Dhauliganga valleys.",

    quote:
      "Awareness before an emergency can make every minute more useful.",

    getStarted:
      "GET STARTED",

    profileTitle:
      "Set up your safety profile",

    profileDescription:
      "Enter a few details so FLOODSAFE can show information relevant to your area.",

    fullName:
      "Full name",

    fullNamePlaceholder:
      "Enter your full name",

    mobile:
      "Mobile number",

    mobilePlaceholder:
      "10-digit mobile number",

    currentLocation:
      "Current location",

    locationHelp:
      "Used for local conditions",

    locationPlaceholder:
      "Start typing a place...",

    searching:
      "Searching...",

    detectingLocation:
      "Detecting your location...",

    useLocation:
      "Use my current location",

    locationDetected:
      "Location detected successfully",

    locationSelected:
      "Location selected",

    locationNotSupported:
      "Location is not supported by this browser.",

    locationPermissionDenied:
      "Location permission was denied.",

    locationUnavailable:
      "Your location could not be detected.",

    locationTimeout:
      "Location request timed out.",

    locationGenericError:
      "Unable to detect your location.",

    locationNameError:
      "Location detected, but the place name could not be loaded.",

    email:
      "Email address",

    emailPlaceholder:
      "name@example.com",

    continue:
      "Continue to FLOODSAFE",

    privacy:
      "Your location is used to provide relevant flood-safety information and local conditions.",

    whyLocation:
      "WHY YOUR LOCATION MATTERS",

    locationInfoTitle:
      "Information that follows your location",

    rainfall:
      "Local rainfall",

    rainfallText:
      "View recent rainfall conditions near your selected location.",

    river:
      "River conditions",

    riverText:
      "Monitor estimated river discharge near your area.",

    alerts:
      "Official alerts",

    alertsText:
      "Check available emergency information relevant to your location.",

    navigation:
      "Safer navigation",

    navigationText:
      "Use FLOODSAFE to understand flood risk before choosing your route.",

    stayPrepared:
      "STAY PREPARED",

    preparedText:
      "Avoid flooded roads, follow official instructions and check conditions before travelling.",

    footer:
      "Built for flood awareness and safer decision-making."

  },


  hi: {

    platform:
      "उत्तराखंड बाढ़ सुरक्षा एवं जागरूकता मंच",

    brandDescription:
      "उत्तराखंड के लिए बाढ़ निगरानी, आपातकालीन जागरूकता और सुरक्षित मार्ग सहायता",

    historyLabel:
      "उत्तराखंड बाढ़ इतिहास",

    historyTitle:
      "तैयारी क्यों महत्वपूर्ण है",

    historyDescription:
      "उत्तराखंड के पहाड़ी क्षेत्रों और नदी घाटियों में भारी वर्षा के दौरान परिस्थितियाँ तेजी से बदल सकती हैं।",

    kedarnathTitle:
      "केदारनाथ बाढ़ आपदा",

    kedarnathText:
      "अत्यधिक वर्षा और बाढ़ ने केदारनाथ और रुद्रप्रयाग के आसपास व्यापक नुकसान पहुँचाया।",

    chamoliTitle:
      "चमोली अचानक बाढ़",

    chamoliText:
      "एक बड़ी अचानक बाढ़ ने ऋषिगंगा और धौलीगंगा घाटियों को प्रभावित किया।",

    quote:
      "आपदा से पहले की जागरूकता हर महत्वपूर्ण मिनट को अधिक उपयोगी बना सकती है।",

    getStarted:
      "शुरू करें",

    profileTitle:
      "अपना सुरक्षा प्रोफ़ाइल बनाएं",

    profileDescription:
      "कुछ आवश्यक जानकारी दर्ज करें ताकि FLOODSAFE आपके क्षेत्र से संबंधित जानकारी दिखा सके।",

    fullName:
      "पूरा नाम",

    fullNamePlaceholder:
      "अपना पूरा नाम दर्ज करें",

    mobile:
      "मोबाइल नंबर",

    mobilePlaceholder:
      "10 अंकों का मोबाइल नंबर",

    currentLocation:
      "वर्तमान स्थान",

    locationHelp:
      "स्थानीय जानकारी के लिए उपयोग किया जाएगा",

    locationPlaceholder:
      "स्थान लिखना शुरू करें...",

    searching:
      "खोज जारी है...",

    detectingLocation:
      "आपका स्थान खोजा जा रहा है...",

    useLocation:
      "मेरे वर्तमान स्थान का उपयोग करें",

    locationDetected:
      "स्थान सफलतापूर्वक प्राप्त हुआ",

    locationSelected:
      "स्थान चुना गया",

    locationNotSupported:
      "यह ब्राउज़र स्थान सेवा का समर्थन नहीं करता है।",

    locationPermissionDenied:
      "स्थान की अनुमति नहीं दी गई।",

    locationUnavailable:
      "आपका वर्तमान स्थान प्राप्त नहीं हो सका।",

    locationTimeout:
      "स्थान खोजने में बहुत अधिक समय लग गया।",

    locationGenericError:
      "आपका स्थान प्राप्त नहीं किया जा सका।",

    locationNameError:
      "स्थान प्राप्त हुआ, लेकिन स्थान का नाम लोड नहीं हो सका।",

    email:
      "ईमेल पता",

    emailPlaceholder:
      "name@example.com",

    continue:
      "FLOODSAFE पर आगे बढ़ें",

    privacy:
      "आपके स्थान का उपयोग केवल संबंधित बाढ़ सुरक्षा और स्थानीय जानकारी दिखाने के लिए किया जाता है।",

    whyLocation:
      "आपका स्थान क्यों महत्वपूर्ण है",

    locationInfoTitle:
      "आपके स्थान के अनुसार महत्वपूर्ण जानकारी",

    rainfall:
      "स्थानीय वर्षा",

    rainfallText:
      "अपने चुने हुए स्थान के आसपास की हाल की वर्षा की स्थिति देखें।",

    river:
      "नदी की स्थिति",

    riverText:
      "अपने क्षेत्र के पास अनुमानित नदी जल प्रवाह की निगरानी करें।",

    alerts:
      "आधिकारिक चेतावनियाँ",

    alertsText:
      "अपने स्थान से संबंधित उपलब्ध आपातकालीन चेतावनियाँ देखें।",

    navigation:
      "सुरक्षित मार्ग",

    navigationText:
      "यात्रा का मार्ग चुनने से पहले FLOODSAFE से बाढ़ जोखिम की जानकारी प्राप्त करें।",

    stayPrepared:
      "सुरक्षित रहें और तैयार रहें",

    preparedText:
      "बाढ़ वाली सड़कों से बचें, आधिकारिक निर्देशों का पालन करें और यात्रा से पहले परिस्थितियों की जाँच करें।",

    footer:
      "बाढ़ जागरूकता और सुरक्षित निर्णय लेने के लिए विकसित।"

  }

};


/* ========================================
   LOGIN PAGE
======================================== */

function LoginPage({
  onLogin
}: LoginPageProps) {


  /* ========================================
     LANGUAGE
  ======================================== */

  const [language, setLanguage] =
    useState<Language>("en");


  const t =
    translations[language];


  /* ========================================
     FORM DATA
  ======================================== */

  const [formData, setFormData] =
    useState<UserData>({

      name: "",

      mobile: "",

      place: "",

      email: "",

      latitude: 0,

      longitude: 0

    });


  /* ========================================
     LOCATION STATES
  ======================================== */

  const [locationLoading, setLocationLoading] =
    useState(false);


  const [locationError, setLocationError] =
    useState("");


  const [gpsDetected, setGpsDetected] =
    useState(false);


  /* ========================================
     AUTOCOMPLETE STATES
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
     INPUT CHANGE
  ======================================== */

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    const {
      name,
      value
    } = e.target;


    /* LOCATION INPUT */

    if (
      name === "place"
    ) {

      setFormData(
        (previous) => ({

          ...previous,

          place:
            value,

          latitude:
            0,

          longitude:
            0

        })
      );


      setLocationTyping(
        true
      );


      setGpsDetected(
        false
      );


      setLocationError(
        ""
      );


      return;
    }


    /* NORMAL INPUT */

    setFormData(
      (previous) => ({

        ...previous,

        [name]:
          value

      })
    );

  };



  /* ========================================
     UTTARAKHAND AUTOCOMPLETE
  ======================================== */

  useEffect(() => {

    const query =
      formData.place.trim();


    if (
      !locationTyping
    ) {

      return;
    }


    if (
      query.length < 2
    ) {

      setSuggestions([]);

      setShowSuggestions(
        false
      );

      setSearchLoading(
        false
      );

      return;
    }


    const controller =
      new AbortController();


    const timer =
      setTimeout(

        async () => {

          try {

            setSearchLoading(
              true
            );


            /*
              Approximate Uttarakhand
              geographic bounding box.
            */

            const uttarakhandBBox =
              "77.3,28.4,81.3,31.6";


            /*
              Search language changes
              with English / Hindi.
            */

            const searchLanguage =
              language === "hi"
                ? "hi"
                : "en";


            const url =

              "https://photon.komoot.io/api/?" +

              `q=${encodeURIComponent(query)}` +

              `&bbox=${uttarakhandBBox}` +

              "&limit=10" +

              `&lang=${searchLanguage}`;


            const response =
              await fetch(
                url,
                {
                  signal:
                    controller.signal
                }
              );


            if (
              !response.ok
            ) {

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

                    const state =
                      (
                        feature.properties
                          ?.state ||
                        ""
                      )
                        .toLowerCase();


                    /*
                      Accept English and
                      Hindi state name.
                    */

                    return (

                      state.includes(
                        "uttarakhand"
                      ) ||

                      state.includes(
                        "उत्तराखंड"
                      )

                    );

                  }
                )

                .map(
                  (feature: any) => {

                    const properties =
                      feature.properties ||
                      {};


                    const coordinates =
                      feature.geometry
                        ?.coordinates ||
                      [
                        0,
                        0
                      ];


                    const name =

                      properties.name ||

                      properties.city ||

                      properties.locality ||

                      properties.district ||

                      properties.county ||

                      (
                        language === "hi"

                          ? "अज्ञात स्थान"

                          : "Unknown Place"
                      );


                    const district =

                      properties.district ||

                      properties.county ||

                      "";


                    const state =

                      properties.state ||

                      (
                        language === "hi"

                          ? "उत्तराखंड"

                          : "Uttarakhand"
                      );


                    let displayName =
                      name;


                    if (
                      district &&

                      district
                        .toLowerCase() !==
                      name
                        .toLowerCase()
                    ) {

                      displayName +=
                        `, ${district}`;

                    }


                    if (
                      state &&

                      !displayName
                        .toLowerCase()
                        .includes(
                          state
                            .toLowerCase()
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


            setSearchLoading(
              false
            );

          }

          catch (
            error: any
          ) {

            if (
              error.name !==
              "AbortError"
            ) {

              console.error(
                "Location search error:",
                error
              );


              setSuggestions(
                []
              );


              setShowSuggestions(
                false
              );


              setSearchLoading(
                false
              );

            }

          }

        },

        400

      );


    return () => {

      clearTimeout(
        timer
      );


      controller.abort();

    };


  }, [

    formData.place,

    locationTyping,

    language

  ]);



  /* ========================================
     SELECT AUTOCOMPLETE LOCATION
  ======================================== */

  const selectLocation = (
    location: LocationSuggestion
  ) => {

    setLocationTyping(
      false
    );


    setFormData(
      (previous) => ({

        ...previous,

        place:
          location.displayName,

        latitude:
          location.latitude,

        longitude:
          location.longitude

      })
    );


    setSuggestions(
      []
    );


    setShowSuggestions(
      false
    );


    setGpsDetected(
      false
    );


    setLocationError(
      ""
    );


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
     GPS
  ======================================== */

  const getCurrentLocation = () => {

    setLocationError(
      ""
    );


    setGpsDetected(
      false
    );


    setLocationTyping(
      false
    );


    setSuggestions(
      []
    );


    setShowSuggestions(
      false
    );


    /* CHECK GPS SUPPORT */

    if (
      !navigator.geolocation
    ) {

      setLocationError(
        t.locationNotSupported
      );


      return;
    }


    setLocationLoading(
      true
    );


    navigator.geolocation
      .getCurrentPosition(


        /* ========================================
           GPS SUCCESS
        ======================================== */

        async (
          position
        ) => {

          const latitude =
            position.coords.latitude;


          const longitude =
            position.coords.longitude;


          try {

            const searchLanguage =
              language === "hi"
                ? "hi"
                : "en";


            /*
              Convert coordinates to
              readable location.
            */

            const response =
              await fetch(

                "https://nominatim.openstreetmap.org/reverse" +

                "?format=json" +

                `&lat=${latitude}` +

                `&lon=${longitude}` +

                `&accept-language=${searchLanguage}`

              );


            if (
              !response.ok
            ) {

              throw new Error(
                "Could not load location name."
              );

            }


            const data =
              await response.json();


            const address =
              data.address ||
              {};


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


            const readableLocation =

              `${city}${
                city && state

                  ? ", "

                  : ""
              }${state}`;


            setFormData(
              (previous) => ({

                ...previous,

                place:

                  readableLocation ||

                  `${latitude.toFixed(
                    6
                  )}, ${longitude.toFixed(
                    6
                  )}`,

                latitude:
                  latitude,

                longitude:
                  longitude

              })
            );


            setGpsDetected(
              true
            );


            setLocationLoading(
              false
            );


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

          catch (
            error
          ) {

            console.error(
              "Reverse geocoding error:",
              error
            );


            setFormData(
              (previous) => ({

                ...previous,

                place:

                  `${latitude.toFixed(
                    6
                  )}, ${longitude.toFixed(
                    6
                  )}`,

                latitude:
                  latitude,

                longitude:
                  longitude

              })
            );


            setGpsDetected(
              true
            );


            setLocationError(
              t.locationNameError
            );


            setLocationLoading(
              false
            );

          }

        },


        /* ========================================
           GPS ERROR
        ======================================== */

        (
          error
        ) => {

          setLocationLoading(
            false
          );


          if (
            error.code === 1
          ) {

            setLocationError(
              t.locationPermissionDenied
            );

          }

          else if (
            error.code === 2
          ) {

            setLocationError(
              t.locationUnavailable
            );

          }

          else if (
            error.code === 3
          ) {

            setLocationError(
              t.locationTimeout
            );

          }

          else {

            setLocationError(
              t.locationGenericError
            );

          }

        },


        /* GPS OPTIONS */

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
     SUBMIT
  ======================================== */

  const handleSubmit = (
    e: React.FormEvent<HTMLFormElement>
  ) => {

    e.preventDefault();


    console.log(
      "FLOODSAFE User Data:",
      formData
    );


    onLogin(
      formData
    );

  };



  /* ========================================
     PAGE
  ======================================== */

  return (

    <div className="new-login-page">


      {/* ========================================
          TOP BRAND
      ======================================== */}

      <header className="login-brand-header">


        {/* LANGUAGE SWITCHER */}

        <div className="language-switcher">


          <button

            type="button"

            className={

              language === "en"

                ? "language-button active-language"

                : "language-button"

            }

            onClick={() => {

              setLanguage(
                "en"
              );

            }}

          >

            English

          </button>


          <span>
            |
          </span>


          <button

            type="button"

            className={

              language === "hi"

                ? "language-button active-language"

                : "language-button"

            }

            onClick={() => {

              setLanguage(
                "hi"
              );

            }}

          >

            हिन्दी

          </button>


        </div>



        <div className="login-brand-center">


          <p className="login-government-line">

            {
              t.platform
            }

          </p>


          <h1>

            FLOODSAFE

          </h1>


          <p className="login-brand-description">

            {
              t.brandDescription
            }

          </p>


        </div>


      </header>



      {/* ========================================
          MAIN 3 COLUMN LAYOUT
      ======================================== */}

      <main className="login-main-layout">


        {/* ========================================
            LEFT - FLOOD HISTORY
        ======================================== */}

        <aside className="login-info-column">


          <p className="login-side-label">

            {
              t.historyLabel
            }

          </p>


          <h1 className="login-side-title">

            {
              t.historyTitle
            }

          </h1>


          <p className="login-side-description">

            {
              t.historyDescription
            }

          </p>



          <div className="flood-timeline">


            {/* 2013 */}

            <div className="timeline-item">


              <div className="timeline-marker">

                2013

              </div>


              <div className="timeline-content">


                <h3>

                  {
                    t.kedarnathTitle
                  }

                </h3>


                <p>

                  {
                    t.kedarnathText
                  }

                </p>


              </div>


            </div>



            <div className="timeline-line">
            </div>



            {/* 2021 */}

            <div className="timeline-item">


              <div className="timeline-marker">

                2021

              </div>


              <div className="timeline-content">


                <h3>

                  {
                    t.chamoliTitle
                  }

                </h3>


                <p>

                  {
                    t.chamoliText
                  }

                </p>


              </div>


            </div>


          </div>



          <div className="login-quote">


            <span>
              “
            </span>


            <p>

              {
                t.quote
              }

            </p>


          </div>


        </aside>



        {/* ========================================
            CENTER - FORM
        ======================================== */}

        <section className="login-center-column">


          <div className="professional-login-card">


            {/* FORM HEADING */}

            <div className="login-card-heading">


              <span className="login-card-eyebrow">

                {
                  t.getStarted
                }

              </span>


              <h2>

                {
                  t.profileTitle
                }

              </h2>


              <p>

                {
                  t.profileDescription
                }

              </p>


            </div>



            <form

              className="professional-login-form"

              onSubmit={
                handleSubmit
              }

            >


              {/* ========================================
                  NAME
              ======================================== */}

              <div className="professional-field">


                <label>

                  {
                    t.fullName
                  }

                </label>


                <input

                  type="text"

                  name="name"

                  placeholder={
                    t.fullNamePlaceholder
                  }

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

              <div className="professional-field">


                <label>

                  {
                    t.mobile
                  }

                </label>


                <input

                  type="tel"

                  name="mobile"

                  placeholder={
                    t.mobilePlaceholder
                  }

                  value={
                    formData.mobile
                  }

                  onChange={
                    handleChange
                  }

                  pattern="[0-9]{10}"

                  maxLength={
                    10
                  }

                  required

                />


              </div>



              {/* ========================================
                  LOCATION
              ======================================== */}

              <div className="professional-field">


                <div className="field-heading-row">


                  <label>

                    {
                      t.currentLocation
                    }

                  </label>


                  <span>

                    {
                      t.locationHelp
                    }

                  </span>


                </div>



                <div className="location-search-wrapper">


                  <input

                    type="text"

                    name="place"

                    autoComplete="off"

                    placeholder={
                      t.locationPlaceholder
                    }

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



                  {/* SEARCH STATUS */}

                  {searchLoading &&
                    locationTyping && (

                    <span className="new-search-status">

                      {
                        t.searching
                      }

                    </span>

                  )}



                  {/* ========================================
                      LOCATION SUGGESTIONS
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


                          <span className="suggestion-pin">

                            ●

                          </span>


                          <div>


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

                  className="new-gps-button"

                  onClick={
                    getCurrentLocation
                  }

                  disabled={
                    locationLoading
                  }

                >


                  <span className="gps-circle">

                    ◎

                  </span>


                  {locationLoading

                    ? t.detectingLocation

                    : t.useLocation

                  }


                </button>



                {/* GPS ERROR */}

                {locationError && (

                  <p className="new-location-error">

                    {
                      locationError
                    }

                  </p>

                )}



                {/* GPS SUCCESS */}

                {gpsDetected && (

                  <p className="new-location-success">

                    {
                      t.locationDetected
                    }

                  </p>

                )}



                {/* AUTOCOMPLETE SELECTED */}

                {!gpsDetected &&

                  formData.latitude !== 0 &&

                  formData.longitude !== 0 && (

                  <p className="new-location-success">

                    {
                      t.locationSelected
                    }

                  </p>

                )}


              </div>



              {/* ========================================
                  EMAIL
              ======================================== */}

              <div className="professional-field">


                <label>

                  {
                    t.email
                  }

                </label>


                <input

                  type="email"

                  name="email"

                  placeholder={
                    t.emailPlaceholder
                  }

                  value={
                    formData.email
                  }

                  onChange={
                    handleChange
                  }

                  required

                />


              </div>



              {/* ========================================
                  CONTINUE
              ======================================== */}

              <button

                type="submit"

                className="professional-continue-button"

              >


                {
                  t.continue
                }


                <span>

                  →

                </span>


              </button>


            </form>



            {/* PRIVACY MESSAGE */}

            <p className="professional-privacy">

              {
                t.privacy
              }

            </p>


          </div>


        </section>



        {/* ========================================
            RIGHT - LOCATION INFORMATION
        ======================================== */}

        <aside className="login-info-column login-right-info">


          <p className="login-side-label">

            {
              t.whyLocation
            }

          </p>


          <h2 className="right-info-heading">

            {
              t.locationInfoTitle
            }

          </h2>



          <div className="location-benefits">


            {/* 01 */}

            <div className="benefit-item">


              <div className="benefit-number">

                01

              </div>


              <div>


                <h3>

                  {
                    t.rainfall
                  }

                </h3>


                <p>

                  {
                    t.rainfallText
                  }

                </p>


              </div>


            </div>



            {/* 02 */}

            <div className="benefit-item">


              <div className="benefit-number">

                02

              </div>


              <div>


                <h3>

                  {
                    t.river
                  }

                </h3>


                <p>

                  {
                    t.riverText
                  }

                </p>


              </div>


            </div>



            {/* 03 */}

            <div className="benefit-item">


              <div className="benefit-number">

                03

              </div>


              <div>


                <h3>

                  {
                    t.alerts
                  }

                </h3>


                <p>

                  {
                    t.alertsText
                  }

                </p>


              </div>


            </div>



            {/* 04 */}

            <div className="benefit-item">


              <div className="benefit-number">

                04

              </div>


              <div>


                <h3>

                  {
                    t.navigation
                  }

                </h3>


                <p>

                  {
                    t.navigationText
                  }

                </p>


              </div>


            </div>


          </div>



          {/* ========================================
              STAY PREPARED
          ======================================== */}

          <div className="prepared-card">


            <p className="prepared-label">

              {
                t.stayPrepared
              }

            </p>


            <p>

              {
                t.preparedText
              }

            </p>


          </div>


        </aside>


      </main>



      {/* ========================================
          FOOTER
      ======================================== */}

      <footer className="login-page-footer">


        <span>

          FLOODSAFE

        </span>


        <p>

          {
            t.footer
          }

        </p>


      </footer>


    </div>

  );

}


export default LoginPage;