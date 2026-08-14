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

  const API_KEY =
    "21604dffca378c5d621f8cf55ff15c08";

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
  ];

  /* =========================================
     FETCH NEWS
  ========================================= */

  const fetchNews = async () => {
    console.log("Fetching latest news...");

    setLoading(true);

    const random =
      Math.floor(Math.random() * 999999);

    try {
      /* =========================================
         FLOOD NEWS
      ========================================= */

      const floodRequest = fetch(
        `https://gnews.io/api/v4/search?q=flood OR flooding&country=ph&lang=en&max=10&sortby=publishedAt&apikey=${API_KEY}&_=${random}`
      );

      /* =========================================
         TRAFFIC NEWS
      ========================================= */

      const trafficRequest = fetch(
        `https://gnews.io/api/v4/search?q=traffic OR mmda OR road OR accident&country=ph&lang=en&max=10&sortby=publishedAt&apikey=${API_KEY}&_=${random}`
      );

      /* =========================================
         WEATHER NEWS
      ========================================= */

      const weatherRequest = fetch(
        `https://gnews.io/api/v4/search?q=weather OR pagasa OR rainfall OR typhoon&country=ph&lang=en&max=10&sortby=publishedAt&apikey=${API_KEY}&_=${random}`
      );

      /* =========================================
         GET ALL RESPONSES
      ========================================= */

      const responses = await Promise.all([
        floodRequest,
        trafficRequest,
        weatherRequest,
      ]);

      const [
        floodData,
        trafficData,
        weatherData,
      ] = await Promise.all(
        responses.map((response) =>
          response.json()
        )
      );

      console.log(
        "Flood Data:",
        floodData
      );

      console.log(
        "Traffic Data:",
        trafficData
      );

      console.log(
        "Weather Data:",
        weatherData
      );

      /* =========================================
         COMBINE ARTICLES
      ========================================= */

      const allArticles = [
        ...(floodData.articles || []),
        ...(trafficData.articles || []),
        ...(weatherData.articles || []),
      ];

      console.log(
        "Flood Articles:",
        floodData.articles?.length
      );

      console.log(
        "Traffic Articles:",
        trafficData.articles?.length
      );

      console.log(
        "Weather Articles:",
        weatherData.articles?.length
      );

      console.log(
        "Total Articles:",
        allArticles.length
      );

      /* =========================================
         FILTER ARTICLES
      ========================================= */

      if (allArticles.length > 0) {
        const filtered =
          allArticles.filter((article) => {
            const text = (
              (article.title || "") +
              " " +
              (article.description || "")
            ).toLowerCase();

            const source = (
              article.source?.name || ""
            ).toLowerCase();

            const isRelevant =
              text.includes("flood") ||
              text.includes("flooding") ||
              text.includes("rain") ||
              text.includes("rainfall") ||
              text.includes("weather") ||
              text.includes("traffic") ||
              text.includes("road") ||
              text.includes("expressway") ||
              text.includes("highway") ||
              text.includes("accident") ||
              text.includes("collision") ||
              text.includes("congestion") ||
              text.includes("vehicle") ||
              text.includes("commuter") ||
              text.includes("typhoon") ||
              text.includes("storm") ||
              text.includes("pagasa") ||
              text.includes("mmda") ||
              text.includes("lto") ||
              text.includes("ltfrb");

            const isTrusted =
              TRUSTED_SOURCES.some(
                (name) =>
                  source.includes(name)
              );

            return (
              isRelevant ||
              isTrusted
            );
          });

        console.log(
          "Filtered Articles:",
          filtered.length
        );

        /* =========================================
           REMOVE DUPLICATES
        ========================================= */

        const uniqueArticles =
          filtered.filter(
            (
              article,
              index,
              self
            ) =>
              index ===
              self.findIndex(
                (a) =>
                  a.title ===
                    article.title ||
                  a.url ===
                    article.url
              )
          );

        console.log(
          "Unique Articles:",
          uniqueArticles.length
        );

        /* =========================================
           SORT ARTICLES
           TRUSTED SOURCES FIRST
        ========================================= */

        uniqueArticles.sort(
          (a, b) => {
            const trustedA =
              TRUSTED_SOURCES.some(
                (name) =>
                  (
                    a.source?.name ||
                    ""
                  )
                    .toLowerCase()
                    .includes(name)
              );

            const trustedB =
              TRUSTED_SOURCES.some(
                (name) =>
                  (
                    b.source?.name ||
                    ""
                  )
                    .toLowerCase()
                    .includes(name)
              );

            if (
              trustedA &&
              !trustedB
            ) {
              return -1;
            }

            if (
              !trustedA &&
              trustedB
            ) {
              return 1;
            }

            return (
              new Date(
                b.publishedAt
              ) -
              new Date(
                a.publishedAt
              )
            );
          }
        );

        /* =========================================
           FORMAT ARTICLES
        ========================================= */

        const formatted =
          uniqueArticles.map(
            (
              article,
              index
            ) => {
              const text = (
                (article.title || "") +
                " " +
                (article.description || "")
              ).toLowerCase();

              let category =
                "General News";

              /* =========================================
                 FLOOD CATEGORY
              ========================================= */

              if (
                text.includes("flood") ||
                text.includes("flooding") ||
                text.includes("water level") ||
                text.includes("river")
              ) {
                category =
                  "Flood Advisory";
              }

              /* =========================================
                 TRAFFIC CATEGORY
              ========================================= */

              else if (
                text.includes("traffic") ||
                text.includes("road") ||
                text.includes("mmda") ||
                text.includes("congestion") ||
                text.includes("accident") ||
                text.includes("commuter")
              ) {
                category =
                  "Traffic Advisory";
              }

              /* =========================================
                 WEATHER CATEGORY
              ========================================= */

              else if (
                text.includes("weather") ||
                text.includes("rain") ||
                text.includes("rainfall") ||
                text.includes("storm") ||
                text.includes("typhoon") ||
                text.includes("pagasa")
              ) {
                category =
                  "Weather Advisory";
              }

              return {
                id:
                  article.url ||
                  index,

                category,

                source:
                  article.source?.name ||
                  "Unknown Source",

                date:
                  new Date(
                    article.publishedAt
                  ).toLocaleString(),

                title:
                  article.title ||
                  "Untitled Article",

                description:
                  article.description ||
                  "No description available.",

                image:
                  article.image,

                url:
                  article.url,
              };
            }
          );

        /* =========================================
           SHOW ONLY 3 ARTICLES
        ========================================= */

        setNewsItems(
          formatted.slice(0, 3)
        );

        /* =========================================
           LAST UPDATED
        ========================================= */

        setLastUpdated(
          new Date().toLocaleString()
        );

        /* =========================================
           NEXT REFRESH
        ========================================= */

        const next =
          new Date(
            Date.now() +
              5 * 60 * 1000
          );

        setNextRefresh(
          next.toLocaleTimeString()
        );

      } else {
        setNewsItems([]);
      }

    } catch (error) {
      console.error(
        "News Fetch Error:",
        error
      );

      setNewsItems([]);

    } finally {
      setLoading(false);
    }
  };

  /* =========================================
     LOAD NEWS AUTOMATICALLY
     EVERY 5 MINUTES
  ========================================= */

  useEffect(() => {
    fetchNews();

    const interval =
      setInterval(
        fetchNews,
        5 * 60 * 1000
      );

    return () =>
      clearInterval(interval);
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