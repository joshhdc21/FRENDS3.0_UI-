import { useEffect, useState } from "react";

/* =========================================
   SENSOR CARD
========================================= */

function SensorCard({ title, value, unit, icon, type }) {
  return (
    <article className={`sensor-card sensor-card-${type}`}>
      <div className="sensor-card-header">
        <span>{title}</span>
        <span className="sensor-icon">{icon}</span>
      </div>

      <strong className="sensor-value">{value}</strong>

      <p className="sensor-unit">
        {unit}
      </p>
    </article>
  );
}

/* =========================================
   MONITORING SECTION
========================================= */

function MonitoringSection() {

  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [nextRefresh, setNextRefresh] = useState("");

  const API_KEY = "21604dffca378c5d621f8cf55ff15c08";

  // =====================================================
  // APPROVED PHILIPPINE NEWS SOURCES
  //
  // These sources are prioritized, but are NOT required.
  // The article itself must still be about the Philippines.
  // =====================================================

  const TRUSTED_SOURCES = [
    "gma",
    "abs-cbn",
    "inquirer",
    "philstar",
    "manila bulletin",
    "manilabulletin",
    "rappler",
    "pagasa",
    "mmda",

    // Additional Philippine publications
    "manila times",
    "the manila times",
    "manilatimes",

    "sunstar",
    "sun star",

    "manila standard",
    "manilastandard",

    "daily tribune",
    "tribune",

    "businessworld",
    "business world",

    "businessmirror",
    "business mirror",

    "pna",
    "philippine news agency",

    "pia",
    "philippine information agency",

    "interaksyon",

    "news5",
    "tv5",

    "one news",
    "onenews",

    "bombo radyo",

    "abante",

    "tempo",

    "the freeman",

    "cebu daily news",

    "panay news",
  ];

  // =====================================================
  // PHILIPPINE LOCATIONS
  // =====================================================

  const PHILIPPINE_LOCATIONS = [
    // Country
    "philippines",
    "philippine",
    "pilipinas",

    // Metro Manila
    "metro manila",
    "manila",
    "quezon city",
    "caloocan",
    "pasig",
    "makati",
    "taguig",
    "marikina",
    "parañaque",
    "paranaque",
    "pasay",
    "malabon",
    "navotas",
    "valenzuela",
    "mandaluyong",
    "muntinlupa",
    "las piñas",
    "las pinas",
    "san juan",

    // Luzon
    "luzon",
    "northern luzon",
    "central luzon",
    "southern luzon",

    // Provinces / cities
    "bulacan",
    "pampanga",
    "tarlac",
    "bataan",
    "zambales",
    "pangasinan",
    "la union",
    "ilocos",
    "cagayan",
    "isabela",
    "batanes",
    "aurora",
    "quezon province",
    "laguna",
    "cavite",
    "batangas",
    "rizal",
    "bicol",
    "albay",
    "sorsogon",
    "catanduanes",
    "camarines norte",
    "camarines sur",

    // Visayas
    "visayas",
    "cebu",
    "iloilo",
    "leyte",
    "eastern visayas",
    "western visayas",
    "central visayas",
    "samar",
    "bohol",
    "negros",
    "negros occidental",
    "negros oriental",
    "panay",
    "aklan",
    "antique",
    "capiz",

    // Mindanao
    "mindanao",
    "davao",
    "davao city",
    "cagayan de oro",
    "zamboanga",
    "cotabato",
    "misamis",
    "bukidnon",
    "surigao",
    "caraga",
    "basilan",
    "sulu",
    "tawi-tawi",

    // Philippine agencies
    "pagasa",
    "dost-pagasa",
    "ndrrmc",
    "mmda",
  ];

  // =====================================================
  // FOREIGN LOCATIONS
  //
  // Used to reject clearly foreign typhoon stories.
  // =====================================================

  const FOREIGN_LOCATIONS = [
    "hawaii",
    "hawai’i",
    "hawai'i",

    "united states",
    "usa",
    "u.s.",
    "america",

    "japan",
    "taiwan",
    "china",
    "hong kong",

    "vietnam",
    "thailand",
    "malaysia",
    "indonesia",

    "australia",
    "india",
    "bangladesh",

    "south korea",
    "korea",

    "mexico",

    "florida",
    "california",
    "texas",
    "new york",

    "atlantic ocean",
    "caribbean",

    "guam",

    "palau",

    "micronesia",

    "fiji",

    "samoa",
  ];

  // =====================================================
  // CHECK TRUSTED PHILIPPINE SOURCE
  // =====================================================

  const isTrustedSource = (article) => {
    const source = (
      article.source?.name || ""
    )
      .toLowerCase()
      .trim();

    return TRUSTED_SOURCES.some(
      (name) =>
        source.includes(name)
    );
  };

  // =====================================================
  // CHECK PHILIPPINE LOCATION
  // =====================================================

  const containsPhilippineLocation = (
    text
  ) => {
    return PHILIPPINE_LOCATIONS.some(
      (location) =>
        text.includes(location)
    );
  };

  // =====================================================
  // CHECK FOREIGN LOCATION
  // =====================================================

  const containsForeignLocation = (
    text
  ) => {
    return FOREIGN_LOCATIONS.some(
      (location) =>
        text.includes(location)
    );
  };

  // =====================================================
  // CHECK TYPHOON / WEATHER KEYWORDS
  // =====================================================

  const containsTyphoonKeyword = (
    text
  ) => {
    const keywords = [
      "typhoon",
      "bagyo",
      "tropical cyclone",
      "tropical storm",
      "tropical depression",
      "cyclone",
      "pagasa",

      "storm signal",
      "wind signal",
      "signal no.",
      "signal number",

      "rainfall alert",
      "rainfall warning",

      "yellow alert",
      "orange alert",
      "red alert",

      "heavy rainfall",
      "heavy rain",

      "torrential rain",

      "flood warning",
      "flood alert",

      "landfall",
      "storm surge",
    ];

    return keywords.some(
      (keyword) =>
        text.includes(keyword)
    );
  };

  // =====================================================
  // FINAL PHILIPPINE TYPHOON CHECK
  // =====================================================

  const isPhilippineTyphoonNews = (
    article
  ) => {
    const title = (
      article.title || ""
    ).toLowerCase();

    const description = (
      article.description || ""
    ).toLowerCase();

    const content = (
      article.content || ""
    ).toLowerCase();

    const text =
      `${title} ${description} ${content}`;

    // -----------------------------------------------
    // Must contain typhoon/weather keyword
    // -----------------------------------------------

    const hasTyphoonKeyword =
      containsTyphoonKeyword(
        text
      );

    if (!hasTyphoonKeyword) {
      return false;
    }

    // -----------------------------------------------
    // Check Philippine location
    // -----------------------------------------------

    const hasPhilippineLocation =
      containsPhilippineLocation(
        text
      );

    // -----------------------------------------------
    // Check foreign location
    // -----------------------------------------------

    const hasForeignLocation =
      containsForeignLocation(
        text
      );

    // -----------------------------------------------
    // Trusted Philippine publication
    // -----------------------------------------------

    const trustedSource =
      isTrustedSource(article);

    // -----------------------------------------------
    // PAGASA / MMDA automatically counts
    // as Philippine context
    // -----------------------------------------------

    const sourceName = (
      article.source?.name || ""
    ).toLowerCase();

    const officialPhilippineSource =
      sourceName.includes(
        "pagasa"
      ) ||
      sourceName.includes(
        "mmda"
      );

    // -----------------------------------------------
    // FINAL DECISION
    // -----------------------------------------------
    //
    // Accept if:
    //
    // 1. Typhoon/weather keyword exists
    //
    // AND
    //
    // 2. Philippine location exists
    //
    // OR trusted Philippine source
    //
    // AND
    //
    // 3. It is NOT clearly foreign
    //
    // -----------------------------------------------

    const isPhilippineNews =
      hasPhilippineLocation ||
      trustedSource ||
      officialPhilippineSource;

    if (
      hasTyphoonKeyword &&
      isPhilippineNews &&
      !hasForeignLocation
    ) {
      return true;
    }

    return false;
  };

  // =====================================================
  // FETCH NEWS
  // =====================================================

  const fetchNews = async () => {
    console.log(
      "========================================"
    );

    console.log(
      "Fetching Philippine typhoon news..."
    );

    console.log(
      "========================================"
    );

    setLoading(true);

    try {
      const random =
        Math.floor(
          Math.random() * 999999
        );

      // =================================================
      // ONE GNEWS REQUEST
      // =================================================

      const query =
        'typhoon OR bagyo OR "tropical cyclone" OR "tropical storm" OR "tropical depression" OR PAGASA';

      const url =
        `https://gnews.io/api/v4/search?` +
        `q=${encodeURIComponent(query)}` +
        `&country=ph` +
        `&lang=en` +
        `&max=10` +
        `&sortby=publishedAt` +
        `&apikey=${API_KEY}` +
        `&_=${random}`;

      console.log(
        "Sending one GNews request..."
      );

      const response =
        await fetch(url);

      // =================================================
      // RATE LIMIT
      // =================================================

      if (
        response.status === 429
      ) {
        console.error(
          "GNews API rate limit reached (429)."
        );

        setLoading(false);

        return;
      }

      // =================================================
      // OTHER API ERROR
      // =================================================

      if (!response.ok) {
        throw new Error(
          `GNews API Error: ${response.status}`
        );
      }

      // =================================================
      // READ RESPONSE
      // =================================================

      const data =
        await response.json();

      console.log(
        "GNews response:",
        data
      );

      const allArticles =
        data.articles || [];

      console.log(
        "Articles returned:",
        allArticles.length
      );

      // =================================================
      // FILTER ARTICLES
      // =================================================

      const filteredArticles =
        allArticles.filter(
          (article) => {
            const result =
              isPhilippineTyphoonNews(
                article
              );

            console.log(
              "--------------------------------"
            );

            console.log(
              "Title:",
              article.title
            );

            console.log(
              "Source:",
              article.source?.name
            );

            console.log(
              "Published:",
              article.publishedAt
            );

            console.log(
              "Philippine Typhoon News:",
              result
            );

            return result;
          }
        );

      console.log(
        "Filtered Philippine Typhoon Articles:",
        filteredArticles.length
      );

      // =================================================
      // REMOVE DUPLICATES
      // =================================================

      const uniqueArticles =
        filteredArticles.filter(
          (article, index, self) =>
            index ===
            self.findIndex(
              (other) =>
                other.url ===
                  article.url ||
                other.title ===
                  article.title
            )
        );

      console.log(
        "Unique Articles:",
        uniqueArticles.length
      );

      // =================================================
      // SORT NEWEST FIRST
      // =================================================

      uniqueArticles.sort(
        (a, b) =>
          new Date(
            b.publishedAt
          ) -
          new Date(
            a.publishedAt
          )
      );

      // =================================================
      // FORMAT ARTICLES
      // =================================================

      const formatted =
        uniqueArticles.map(
          (
            article,
            index
          ) => ({
            id:
              article.url ||
              `philippine-typhoon-${index}`,

            category:
              "Typhoon Advisory",

            source:
              article.source?.name ||
              "Philippine News",

            date:
              new Date(
                article.publishedAt
              ).toLocaleString(
                "en-PH",
                {
                  timeZone:
                    "Asia/Manila",
                }
              ),

            title:
              article.title,

            description:
              article.description ||
              "No description available.",

            image:
              article.image,

            url:
              article.url,
          })
        );

      // =================================================
      // SHOW MAXIMUM 9 ARTICLES
      // =================================================

      setNewsItems(
        formatted.slice(0, 6)
      );

      // =================================================
      // LAST UPDATED
      // =================================================

      setLastUpdated(
        new Date().toLocaleString(
          "en-PH",
          {
            timeZone:
              "Asia/Manila",
          }
        )
      );

      // =================================================
      // NEXT REFRESH
      // =================================================

      const next =
        new Date(
          Date.now() +
            5 * 60 * 1000
        );

      setNextRefresh(
        next.toLocaleTimeString(
          "en-PH",
          {
            timeZone:
              "Asia/Manila",
          }
        )
      );

      // =================================================
      // NO RESULTS
      // =================================================

      if (
        formatted.length === 0
      ) {
        console.log(
          "No Philippine typhoon news found."
        );
      }
    } catch (error) {
      console.error(
        "Philippine Typhoon News Error:",
        error
      );

      setNewsItems([]);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INITIAL FETCH
  // + REFRESH EVERY 5 MINUTES
  // =====================================================

  useEffect(() => {
    fetchNews();

    const interval =
      setInterval(
        fetchNews,
        5 * 60 * 1000
      );

    return () => {
      clearInterval(interval);
    };
  }, []);

  /* =========================================
     UI
  ========================================= */

  return (
    <section
      id="monitoring"
      className="page-section"
    >

      {/* =========================================
          MONITORING HERO
      ========================================= */}

      <div className="hero-panel">

        <div className="hero-content">

          <p className="eyebrow">
            REAL-TIME MONITORING
          </p>

          <h2>
            Smart Flood and Water-Level Monitoring
          </h2>

          <p className="hero-description">
            View live pressure readings, estimated
            water level, battery condition, and flood
            warnings transmitted by the ESP32-C3
            monitoring device.
          </p>

        </div>

        <div className="system-status-card">

          <span>
            System Status
          </span>

          <strong>
            Initializing
          </strong>

          <small>
            Waiting for sensor information
          </small>

        </div>

      </div>


      {/* =========================================
          LIVE SENSOR DATA
      ========================================= */}

      <div className="section-heading">

        <div>

          <p className="eyebrow">
            LIVE SENSOR DATA
          </p>

          <h3>
            Current Monitoring Values
          </h3>

        </div>

        <span className="last-update">
          No data received yet
        </span>

      </div>


      <div className="sensor-grid">

        <SensorCard
          title="Pressure"
          value="--"
          unit="hPa"
          icon="P"
          type="pressure"
        />

        <SensorCard
          title="Water Level"
          value="--"
          unit="meters"
          icon="W"
          type="water"
        />

        <SensorCard
          title="Battery Voltage"
          value="--"
          unit="volts"
          icon="B"
          type="battery"
        />

        <SensorCard
          title="Flood Status"
          value="Waiting"
          unit="No sensor data"
          icon="!"
          type="alert"
        />

      </div>


      {/* =========================================
          ABOUT FRENDS
      ========================================= */}

      <div className="frends-home-info-section">

        <div className="frends-home-info-header">

          <p className="eyebrow">
            ABOUT FRENDS
          </p>

          <h2>
            Your Smart Guide for Safer Journeys
          </h2>

          <p>
            FRENDS connects real-time flood monitoring,
            traffic information, weather conditions, and
            navigation assistance in one platform to help
            users make safer and smarter travel decisions.
          </p>

        </div>


        {/* =========================================
            FRENDS INFORMATION CARDS
        ========================================= */}

        <div className="frends-info-grid">

          <article className="frends-info-card">

            <div className="frends-info-icon">
              🌊
            </div>

            <div>

              <h3>
                Monitor Flood Conditions
              </h3>

              <p>
                Get real-time water-level readings
                and flood status from connected
                monitoring devices.
              </p>

            </div>

          </article>


          <article className="frends-info-card">

            <div className="frends-info-icon">
              🚦
            </div>

            <div>

              <h3>
                Check Traffic Conditions
              </h3>

              <p>
                View current traffic information
                on monitored roads and understand
                how congestion may affect your journey.
              </p>

            </div>

          </article>


          <article className="frends-info-card">

            <div className="frends-info-icon">
              ☁️
            </div>

            <div>

              <h3>
                Stay Updated With Weather
              </h3>

              <p>
                Access current weather information
                to help you prepare for changing
                road conditions.
              </p>

            </div>

          </article>


          <article className="frends-info-card">

            <div className="frends-info-icon">
              🗺️
            </div>

            <div>

              <h3>
                Make Smarter Travel Decisions
              </h3>

              <p>
                Use flood, traffic, and weather
                information to better understand
                current conditions before starting
                your journey.
              </p>

            </div>

          </article>

        </div>


        {/* =========================================
            HOW FRENDS WORKS
        ========================================= */}

        <div className="frends-how-section">

          <div className="frends-how-content">

            <p className="eyebrow">
              HOW FRENDS WORKS
            </p>

            <h2>
              From Real-Time Data to Better Decisions
            </h2>

            <p>
              FRENDS collects information from connected
              monitoring devices and external data sources,
              processes the information, and presents it
              in a simple interface that users can easily
              understand.
            </p>

          </div>


          <div className="frends-process-grid">

            <div className="frends-process-card">

              <span className="process-number">
                01
              </span>

              <h4>
                Collect
              </h4>

              <p>
                Sensors collect real-time water-level
                and environmental data.
              </p>

            </div>


            <div className="frends-process-card">

              <span className="process-number">
                02
              </span>

              <h4>
                Process
              </h4>

              <p>
                FRENDS processes incoming information
                and determines the current conditions.
              </p>

            </div>


            <div className="frends-process-card">

              <span className="process-number">
                03
              </span>

              <h4>
                Inform
              </h4>

              <p>
                Users receive updated flood, traffic,
                and weather information.
              </p>

            </div>


            <div className="frends-process-card">

              <span className="process-number">
                04
              </span>

              <h4>
                Decide
              </h4>

              <p>
                Users can make safer and more informed
                travel decisions.
              </p>

            </div>

          </div>

        </div>

      </div>


      {/* =========================================
          LIVE NEWS
      ========================================= */}

      <div
        id="news"
        className="news-section"
      >

        <div className="section-heading">

          <div>

            <p className="eyebrow">
              LIVE NEWS
            </p>

            <h3>
              Latest Flood, Traffic & Weather Updates
            </h3>

            <p className="next-refresh">
              Next Refresh:{" "}
              {nextRefresh ||
                "Calculating..."}
            </p>

            {lastUpdated && (
              <p className="last-update">
                Last Updated:{" "}
                {lastUpdated}
              </p>
            )}

          </div>

        </div>


        {/* =========================================
            LOADING
        ========================================= */}

        {loading ? (

          <div className="news-loading">

            <p>
              Loading latest news...
            </p>

          </div>

        ) : newsItems.length === 0 ? (

          <div className="news-empty">

            <p>
              No related flood, traffic,
              or weather news found.
            </p>

          </div>

        ) : (

          <div className="news-grid">

            {newsItems.map((news) => (

              <article
                className="news-card"
                key={news.id}
              >

                {/* NEWS IMAGE */}

                {news.image && (
                  <img
                    src={news.image}
                    alt={news.title}
                    className="news-image"
                  />
                )}


                {/* NEWS META */}

                <div className="news-meta">

                  <span>
                    {news.category}
                  </span>

                  <span>
                    {news.source}
                  </span>

                  <time>
                    {news.date}
                  </time>

                </div>


                {/* NEWS TITLE */}

                <h4>
                  {news.title}
                </h4>


                {/* NEWS DESCRIPTION */}

                <p>
                  {news.description}
                </p>


                {/* ARTICLE LINK */}

                {news.url && (
                  <a
                    href={news.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-button"
                  >
                    Read Full Article →
                  </a>
                )}

              </article>

            ))}

          </div>

        )}

      </div>

    </section>
  );
}

export default MonitoringSection;