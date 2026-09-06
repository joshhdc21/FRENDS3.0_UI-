import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";

import { database } from "../firebase/firebaseConfig";
import { fetchTrafficData } from "../services/trafficService";

// =====================================================
// NODE NAMES
// =====================================================

const NODE_NAMES = {
  "node-01": "Leon Guinto St., Manila",
  "node-02": "Remedios St., Manila",
  "node-03": "Pilar Hidalgo St., Manila",
  "node-04": "San Andres St., Manila",
  "node-05": "Maginhawa St., Manila",
  "node-06": "Fidel Reyes St., Manila",
  "node-07": "Taft Avenue",
  "node-08": "Pablo Ocampo St., Manila",
  "node-09": "A. Estrada St., Manila",
  "node-10": "Castro St., Manila",
};

// =====================================================
// CONSTANTS
// =====================================================

const CM_TO_FEET = 0.0328084;

// =====================================================
// FLOOD CLASSIFICATION
// =====================================================

const getFloodLevel = (waterLevel, status) => {
  if (status === "offline") {
    return "Offline";
  }

  const level = Number(waterLevel || 0);

  if (level <= 10) return "Normal";
  if (level <= 25) return "Caution";
  if (level <= 50) return "Warning";

  return "Critical";
};

// =====================================================
// SUMMARY CARD
// =====================================================

function SummaryCard({
  icon,
  title,
  value,
  status,
  description,
  type,
}) {
  return (
    <div className={`summary-card ${type || ""}`}>
      {/* CARD HEADER */}
      <div className="summary-card-header">
        <div className="summary-card-icon">
          {icon}
        </div>

        <div className="summary-card-title">
          <h3>{title}</h3>

          {status && (
            <span
              className={`summary-status ${status
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
            >
              {status}
            </span>
          )}
        </div>
      </div>

      {/* MAIN VALUE */}
      <div className="summary-card-value">
        {value}
      </div>

      {/* DESCRIPTION */}
      <p className="summary-card-description">
        {description}
      </p>
    </div>
  );
}

// =====================================================
// MONITORING SECTION
// =====================================================

export default function MonitoringSection() {
  // ===================================================
  // FLOOD STATE
  // ===================================================

  const [floodSummary, setFloodSummary] = useState({
    totalNodes: 0,
    onlineNodes: 0,
    offlineNodes: 0,
    normalNodes: 0,
    cautionNodes: 0,
    warningNodes: 0,
    criticalNodes: 0,
    highestWaterLevel: 0,
    highestWaterLevelFeet: 0,
    overallStatus: "Normal",
    highestLocation: "No data",
  });

  // ===================================================
  // TRAFFIC STATE
  // ===================================================

  const [trafficSummary, setTrafficSummary] = useState({
    totalRoads: 0,
    highestCongestion: 0,
    highestRoad: "No data",
    overallStatus: "Normal",
  });

  const [trafficLoading, setTrafficLoading] =
    useState(true);

  // ===================================================
  // NEWS STATE
  // ===================================================

  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] =
    useState(true);

  // ===================================================
  // FIREBASE FLOOD MONITORING
  // ===================================================

  useEffect(() => {
    const nodesRef = ref(database, "nodes");

    const unsubscribe = onValue(
      nodesRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setFloodSummary({
            totalNodes: 0,
            onlineNodes: 0,
            offlineNodes: 0,
            normalNodes: 0,
            cautionNodes: 0,
            warningNodes: 0,
            criticalNodes: 0,
            highestWaterLevel: 0,
            highestWaterLevelFeet: 0,
            overallStatus: "Normal",
            highestLocation: "No data",
          });

          return;
        }

        let totalNodes = 0;
        let onlineNodes = 0;
        let offlineNodes = 0;

        let normalNodes = 0;
        let cautionNodes = 0;
        let warningNodes = 0;
        let criticalNodes = 0;

        let highestWaterLevel = 0;
        let highestLocation = "No data";

        // =================================================
        // PROCESS EACH NODE
        // =================================================

        Object.entries(data).forEach(
          ([nodeId, nodeData]) => {
            totalNodes++;

            let latestReading = null;

            // ---------------------------------------------
            // FIND LATEST READING
            // ---------------------------------------------

            if (
              nodeData &&
              typeof nodeData === "object"
            ) {
              const readings =
                Object.entries(nodeData);

              readings.forEach(
                ([key, reading]) => {
                  if (
                    reading &&
                    typeof reading === "object" &&
                    reading.timestamp
                  ) {
                    if (
                      !latestReading ||
                      Number(reading.timestamp) >
                        Number(
                          latestReading.timestamp
                        )
                    ) {
                      latestReading = reading;
                    }
                  }
                }
              );
            }

            // ---------------------------------------------
            // OFFLINE NODE
            // ---------------------------------------------

            if (!latestReading) {
              offlineNodes++;
              return;
            }

            const nodeStatus = String(
              latestReading.status || "online"
            ).toLowerCase();

            if (nodeStatus === "offline") {
              offlineNodes++;
              return;
            }

            onlineNodes++;

            // ---------------------------------------------
            // WATER LEVEL
            // ---------------------------------------------

            const waterLevel = Number(
              latestReading.waterLevel ??
                latestReading.water_level ??
                latestReading.level ??
                latestReading.distance ??
                0
            );

            // ---------------------------------------------
            // FLOOD CLASSIFICATION
            // ---------------------------------------------

            const floodLevel = getFloodLevel(
              waterLevel,
              nodeStatus
            );

            // ---------------------------------------------
            // CLASSIFICATION COUNT
            // ---------------------------------------------

            switch (floodLevel) {
              case "Normal":
                normalNodes++;
                break;

              case "Caution":
                cautionNodes++;
                break;

              case "Warning":
                warningNodes++;
                break;

              case "Critical":
                criticalNodes++;
                break;

              default:
                break;
            }

            // ---------------------------------------------
            // HIGHEST WATER LEVEL
            // ---------------------------------------------

            if (
              waterLevel > highestWaterLevel
            ) {
              highestWaterLevel = waterLevel;

              highestLocation =
                NODE_NAMES[nodeId] || nodeId;
            }
          }
        );

        // =================================================
        // OVERALL FLOOD STATUS
        // =================================================

        let overallStatus = "Normal";

        if (criticalNodes > 0) {
          overallStatus = "Critical";
        } else if (warningNodes > 0) {
          overallStatus = "Warning";
        } else if (cautionNodes > 0) {
          overallStatus = "Caution";
        }

        // =================================================
        // UPDATE FLOOD SUMMARY
        // =================================================

        setFloodSummary({
          totalNodes,
          onlineNodes,
          offlineNodes,
          normalNodes,
          cautionNodes,
          warningNodes,
          criticalNodes,
          highestWaterLevel,
          highestWaterLevelFeet:
            highestWaterLevel *
            CM_TO_FEET,
          overallStatus,
          highestLocation,
        });
      },
      (error) => {
        console.error(
          "Firebase flood monitoring error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, []);

  // ===================================================
  // TRAFFIC MONITORING
  // ===================================================

  useEffect(() => {
    let mounted = true;

    const loadTraffic = async () => {
      try {
        setTrafficLoading(true);

        const traffic =
          await fetchTrafficData();

        if (!mounted) return;

        const roads = Array.isArray(
          traffic?.roads
        )
          ? traffic.roads
          : [];

        // ---------------------------------------------
        // VALID ROADS
        // ---------------------------------------------

        const validRoads = roads.filter(
          (road) =>
            road &&
            Number.isFinite(
              Number(road.congestion)
            )
        );

        // ---------------------------------------------
        // HIGHEST CONGESTION
        // ---------------------------------------------

        const highestCongestion =
          validRoads.length > 0
            ? Math.max(
                ...validRoads.map((road) =>
                  Number(
                    road.congestion || 0
                  )
                )
              )
            : 0;

        // ---------------------------------------------
        // HIGHEST CONGESTION ROAD
        // ---------------------------------------------

        const highestCongestionRoad =
          validRoads.find(
            (road) =>
              Number(
                road.congestion || 0
              ) === highestCongestion
          );

        // ---------------------------------------------
        // OVERALL TRAFFIC STATUS
        // ---------------------------------------------

        let overallStatus = String(
          traffic?.status || ""
        );

        if (!overallStatus) {
          if (highestCongestion >= 75) {
            overallStatus = "Critical";
          } else if (
            highestCongestion >= 50
          ) {
            overallStatus = "Heavy";
          } else if (
            highestCongestion >= 25
          ) {
            overallStatus = "Moderate";
          } else {
            overallStatus = "Light";
          }
        }

        // ---------------------------------------------
        // UPDATE TRAFFIC SUMMARY
        // ---------------------------------------------

        setTrafficSummary({
          totalRoads:
            validRoads.length,

          highestCongestion,

          highestRoad:
            highestCongestionRoad?.name ||
            "No data",

          overallStatus,
        });
      } catch (error) {
        console.error(
          "Traffic monitoring error:",
          error
        );

        if (mounted) {
          setTrafficSummary({
            totalRoads: 0,
            highestCongestion: 0,
            highestRoad: "Unavailable",
            overallStatus: "Unavailable",
          });
        }
      } finally {
        if (mounted) {
          setTrafficLoading(false);
        }
      }
    };

    // INITIAL LOAD
    loadTraffic();

    // REFRESH EVERY 60 SECONDS
    const interval = setInterval(
      loadTraffic,
      60 * 1000
    );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // ===================================================
  // GNEWS CONFIGURATION
  // ===================================================

  const GNEWS_API_KEY =
    import.meta.env.VITE_GNEWS_API_KEY ||
    "21604dffca378c5d621f8cf55ff15c08";

  // ===================================================
  // TRUSTED PHILIPPINE SOURCES
  // ===================================================

  const TRUSTED_SOURCES = [
    "PAGASA",
    "GMA News",
    "ABS-CBN",
    "Inquirer",
    "Philstar",
    "Manila Bulletin",
    "Rappler",
    "CNN Philippines",
    "Manila Standard",
    "The Philippine Star",
    "Philippine News Agency",
    "PNA",
  ];

  // ===================================================
  // PHILIPPINE LOCATIONS
  // ===================================================

  const PHILIPPINE_LOCATIONS = [
    "Philippines",
    "Metro Manila",
    "Manila",
    "Quezon City",
    "Makati",
    "Pasig",
    "Taguig",
    "Pasay",
    "Parañaque",
    "Paranaque",
    "Caloocan",
    "Malabon",
    "Navotas",
    "Valenzuela",
    "Marikina",
    "Mandaluyong",
    "San Juan",
    "Las Piñas",
    "Las Pinas",
    "Muntinlupa",
    "Pateros",
    "Luzon",
    "Visayas",
    "Mindanao",
  ];

  // ===================================================
  // FOREIGN LOCATIONS
  // ===================================================

  const FOREIGN_LOCATIONS = [
    "United States",
    "USA",
    "US",
    "Japan",
    "China",
    "Taiwan",
    "Hong Kong",
    "Vietnam",
    "Thailand",
    "Indonesia",
    "Malaysia",
    "India",
    "Australia",
    "Canada",
    "United Kingdom",
    "UK",
    "Europe",
    "Korea",
    "South Korea",
  ];

  // ===================================================
  // CHECK TRUSTED SOURCE
  // ===================================================

  const isTrustedSource = (article) => {
    const sourceName =
      article?.source?.name?.toLowerCase() ||
      "";

    return TRUSTED_SOURCES.some(
      (source) =>
        sourceName.includes(
          source.toLowerCase()
        )
    );
  };

  // ===================================================
  // CHECK PHILIPPINE LOCATION
  // ===================================================

  const containsPhilippineLocation = (
    article
  ) => {
    const text = `
      ${article?.title || ""}
      ${article?.description || ""}
      ${article?.content || ""}
    `.toLowerCase();

    return PHILIPPINE_LOCATIONS.some(
      (location) =>
        text.includes(
          location.toLowerCase()
        )
    );
  };

  // ===================================================
  // CHECK FOREIGN LOCATION
  // ===================================================

  const containsForeignLocation = (
    article
  ) => {
    const text = `
      ${article?.title || ""}
      ${article?.description || ""}
      ${article?.content || ""}
    `.toLowerCase();

    return FOREIGN_LOCATIONS.some(
      (location) =>
        text.includes(
          location.toLowerCase()
        )
    );
  };

  // ===================================================
  // CHECK WEATHER / TYPHOON NEWS
  // ===================================================

  const isWeatherNews = (article) => {
    const text = `
      ${article?.title || ""}
      ${article?.description || ""}
      ${article?.content || ""}
    `.toLowerCase();

    const keywords = [
      "typhoon",
      "bagyo",
      "tropical cyclone",
      "tropical storm",
      "tropical depression",
      "storm",
      "weather",
      "rainfall",
      "rain",
      "flood",
      "flooding",
      "pagasa",
      "monsoon",
      "habagat",
      "amihan",
      "low pressure area",
      "lpa",
    ];

    return keywords.some(
      (keyword) =>
        text.includes(keyword)
    );
  };

  // ===================================================
  // LOAD NEWS
  // ===================================================

  const loadNews = async () => {
    try {
      setNewsLoading(true);

      const query =
        'typhoon OR bagyo OR "tropical cyclone" OR "tropical storm" OR "tropical depression" OR PAGASA';

      const url =
        `https://gnews.io/api/v4/search?` +
        `q=${encodeURIComponent(query)}` +
        `&country=ph` +
        `&lang=en` +
        `&max=10` +
        `&sortby=publishedAt` +
        `&apikey=${GNEWS_API_KEY}`;

      const response =
        await fetch(url);

      if (!response.ok) {
        throw new Error(
          `GNews request failed: ${response.status}`
        );
      }

      const data =
        await response.json();

      const articles =
        Array.isArray(
          data?.articles
        )
          ? data.articles
          : [];

      // =================================================
      // FILTER NEWS
      // =================================================

      const filteredArticles =
        articles
          .filter((article) =>
            isWeatherNews(article)
          )
          .filter((article) => {
            const trusted =
              isTrustedSource(
                article
              );

            const philippine =
              containsPhilippineLocation(
                article
              );

            const foreign =
              containsForeignLocation(
                article
              );

            return (
              !foreign &&
              (trusted || philippine)
            );
          })
          .slice(0, 6);

      setNews(filteredArticles);
    } catch (error) {
      console.error(
        "News loading error:",
        error
      );

      setNews([]);
    } finally {
      setNewsLoading(false);
    }
  };

  // ===================================================
  // NEWS REFRESH
  // ===================================================

  useEffect(() => {
    loadNews();

    // REFRESH EVERY 30 MINUTES
    const interval = setInterval(
      loadNews,
      30 * 60 * 1000
    );

    return () =>
      clearInterval(interval);
  }, []);

  // ===================================================
  // FLOOD DESCRIPTION
  // ===================================================

  const getFloodDescription = () => {
    if (
      floodSummary.totalNodes === 0
    ) {
      return "No flood monitoring data available.";
    }

    if (
      floodSummary.criticalNodes > 0
    ) {
      return `${floodSummary.criticalNodes} monitoring ${
        floodSummary.criticalNodes === 1
          ? "node is"
          : "nodes are"
      } at critical flood level.`;
    }

    if (
      floodSummary.warningNodes > 0
    ) {
      return `${floodSummary.warningNodes} monitoring ${
        floodSummary.warningNodes === 1
          ? "node is"
          : "nodes are"
      } reporting warning-level water.`;
    }

    if (
      floodSummary.cautionNodes > 0
    ) {
      return `${floodSummary.cautionNodes} monitoring ${
        floodSummary.cautionNodes === 1
          ? "node is"
          : "nodes are"
      } currently at caution level.`;
    }

    return `${floodSummary.onlineNodes} monitoring ${
      floodSummary.onlineNodes === 1
        ? "node is"
        : "nodes are"
    } operating normally.`;
  };

  // ===================================================
  // TRAFFIC DESCRIPTION
  // ===================================================

  const getTrafficDescription = () => {
    if (trafficLoading) {
      return "Loading live traffic conditions...";
    }

    if (
      trafficSummary.totalRoads === 0
    ) {
      return "Traffic information is currently unavailable.";
    }

    return `Highest congestion is ${trafficSummary.highestCongestion}% on ${trafficSummary.highestRoad}.`;
  };

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <section
      className="monitoring-section"
      id="monitoring"
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="monitoring-header">
        <span className="section-label">
          LIVE MONITORING
        </span>

        <h1>
          Stay Informed. Stay Safe.
        </h1>

        <p>
          Get real-time flood and traffic
          information across Metro Manila
          to make smarter and safer travel
          decisions.
        </p>
      </div>

      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <div className="monitoring-summary-grid">

        {/* =================================================
            FLOOD SUMMARY
        ================================================= */}

        <SummaryCard
          type="flood-summary"
          icon="🌊"
          title="Flood Monitoring"
          value={
            floodSummary.totalNodes > 0
              ? `${floodSummary.highestWaterLevelFeet.toFixed(
                  2
                )} ft`
              : "--"
          }
          status={
            floodSummary.overallStatus
          }
          description={
            floodSummary.totalNodes > 0
              ? `${getFloodDescription()} Highest level recorded at ${floodSummary.highestLocation}.`
              : "Waiting for live flood sensor data."
          }
        />

        {/* =================================================
            TRAFFIC SUMMARY
        ================================================= */}

        <SummaryCard
          type="traffic-summary"
          icon="🚗"
          title="Traffic Monitoring"
          value={
            trafficLoading
              ? "--"
              : `${trafficSummary.highestCongestion}%`
          }
          status={
            trafficLoading
              ? "Loading"
              : trafficSummary.overallStatus
          }
          description={
            getTrafficDescription()
          }
        />

      </div>

      {/* =================================================
          FLOOD QUICK STATUS
      ================================================= */}

      <div className="monitoring-status-panel">

        <div className="status-panel-header">

          <div>
            <span className="section-label">
              FLOOD STATUS
            </span>

            <h2>
              Flood Monitoring Overview
            </h2>
          </div>

          <span
            className={`overall-status ${floodSummary.overallStatus
              .toLowerCase()
              .replace(/\s+/g, "-")}`}
          >
            {floodSummary.overallStatus}
          </span>

        </div>

        <div className="status-stat-grid">

          <div className="status-stat">
            <span>Total Nodes</span>
            <strong>
              {floodSummary.totalNodes}
            </strong>
          </div>

          <div className="status-stat">
            <span>Online</span>
            <strong>
              {floodSummary.onlineNodes}
            </strong>
          </div>

          <div className="status-stat">
            <span>Offline</span>
            <strong>
              {floodSummary.offlineNodes}
            </strong>
          </div>

          <div className="status-stat">
            <span>Normal</span>
            <strong>
              {floodSummary.normalNodes}
            </strong>
          </div>

          <div className="status-stat">
            <span>Caution</span>
            <strong>
              {floodSummary.cautionNodes}
            </strong>
          </div>

          <div className="status-stat">
            <span>Warning</span>
            <strong>
              {floodSummary.warningNodes}
            </strong>
          </div>

          <div className="status-stat">
            <span>Critical</span>
            <strong>
              {floodSummary.criticalNodes}
            </strong>
          </div>

        </div>
      </div>

      {/* =================================================
          TRAFFIC QUICK STATUS
      ================================================= */}

      <div className="monitoring-status-panel">

        <div className="status-panel-header">

          <div>
            <span className="section-label">
              TRAFFIC STATUS
            </span>

            <h2>
              Traffic Monitoring Overview
            </h2>
          </div>

          <span
            className={`overall-status ${trafficSummary.overallStatus
              .toLowerCase()
              .replace(/\s+/g, "-")}`}
          >
            {trafficLoading
              ? "Loading"
              : trafficSummary.overallStatus}
          </span>

        </div>

        <div className="traffic-highlight">

          <div className="traffic-highlight-item">
            <span>
              Monitored Roads
            </span>

            <strong>
              {trafficSummary.totalRoads}
            </strong>
          </div>

          <div className="traffic-highlight-item">
            <span>
              Highest Congestion
            </span>

            <strong>
              {trafficLoading
                ? "--"
                : `${trafficSummary.highestCongestion}%`}
            </strong>
          </div>

          <div className="traffic-highlight-item">
            <span>
              Most Congested Road
            </span>

            <strong>
              {trafficLoading
                ? "Loading..."
                : trafficSummary.highestRoad}
            </strong>
          </div>

        </div>
      </div>

      {/* =================================================
          EMERGENCY HOTLINES
      ================================================= */}

      <div className="emergency-section">

        <div className="emergency-header">

          <span className="section-label">
            EMERGENCY ASSISTANCE
          </span>

          <h2>
            Need Help?
          </h2>

          <p>
            Contact the appropriate emergency
            service when immediate assistance
            is needed.
          </p>

        </div>

        <div className="emergency-grid">

          <a
            href="tel:911"
            className="emergency-card"
          >
            <div className="emergency-icon">
              🚨
            </div>

            <div>
              <span>
                Emergency Hotline
              </span>

              <strong>
                911
              </strong>

              <p>
                National Emergency Hotline
              </p>
            </div>
          </a>

          <a
            href="tel:160"
            className="emergency-card"
          >
            <div className="emergency-icon">
              🔥
            </div>

            <div>
              <span>
                Fire Department
              </span>

              <strong>
                160
              </strong>

              <p>
                Bureau of Fire Protection
              </p>
            </div>
          </a>

          <a
            href="tel:117"
            className="emergency-card"
          >
            <div className="emergency-icon">
              👮
            </div>

            <div>
              <span>
                Police
              </span>

              <strong>
                117
              </strong>

              <p>
                Philippine National Police
              </p>
            </div>
          </a>

          <a
            href="tel:143"
            className="emergency-card"
          >
            <div className="emergency-icon">
              🏥
            </div>

            <div>
              <span>
                Medical Assistance
              </span>

              <strong>
                143
              </strong>

              <p>
                Philippine Red Cross
              </p>
            </div>
          </a>

        </div>
      </div>

      {/* =================================================
          ABOUT FRENDS
      ================================================= */}

      <div className="about-frends-section">

        <div className="about-frends-content">

          <span className="section-label">
            ABOUT FRENDS
          </span>

          <h2>
            Smarter Navigation.
            <br />
            Safer Journeys.
          </h2>

          <p>
            FRENDS provides real-time flood
            and traffic information to help
            commuters and motorists make
            informed travel decisions
            throughout Metro Manila.
          </p>

          <p>
            By combining sensor-based flood
            monitoring, live traffic
            information, and timely weather
            updates, FRENDS helps users
            identify potentially dangerous
            areas and plan safer routes.
          </p>

        </div>
      </div>

      {/* =================================================
          LIVE NEWS
      ================================================= */}

      <div className="news-section">

        <div className="news-header">

          <div>
            <span className="section-label">
              LIVE NEWS
            </span>

            <h2>
              Philippine Weather & Typhoon
              Updates
            </h2>

            <p>
              Stay updated with the latest
              weather and typhoon-related
              news from Philippine sources.
            </p>
          </div>

        </div>

        {/* =================================================
            NEWS LOADING
        ================================================= */}

        {newsLoading ? (

          <div className="news-empty">

            <div className="news-loading-icon">
              📰
            </div>

            <p>
              Loading latest news...
            </p>

          </div>

        ) : news.length === 0 ? (

          /* =================================================
              NO NEWS
          ================================================= */

          <div className="news-empty">

            <div className="news-loading-icon">
              📰
            </div>

            <p>
              No recent Philippine weather
              or typhoon news is available
              right now.
            </p>

          </div>

        ) : (

          /* =================================================
              NEWS CARDS
          ================================================= */

          <div className="news-grid">

            {news.map(
              (article, index) => (

                <article
                  className="news-card"
                  key={
                    article.url ||
                    article.title ||
                    index
                  }
                >

                  {/* NEWS IMAGE */}

                  {article.image && (
                    <div className="news-image-wrapper">

                      <img
                        src={article.image}
                        alt={
                          article.title
                        }
                        className="news-image"
                      />

                    </div>
                  )}

                  {/* NEWS CONTENT */}

                  <div className="news-content">

                    <div className="news-source">
                      {article?.source?.name ||
                        "Philippine News"}
                    </div>

                    <h3>
                      {article.title}
                    </h3>

                    {article.description && (
                      <p>
                        {article.description}
                      </p>
                    )}

                    {/* NEWS FOOTER */}

                    <div className="news-footer">

                      <span>
                        {article.publishedAt
                          ? new Date(
                              article.publishedAt
                            ).toLocaleDateString(
                              "en-PH",
                              {
                                month:
                                  "short",
                                day: "numeric",
                                year:
                                  "numeric",
                              }
                            )
                          : ""}
                      </span>

                      {article.url && (
                        <a
                          href={
                            article.url
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Read More →
                        </a>
                      )}

                    </div>

                  </div>

                </article>
              )
            )}

          </div>
        )}

      </div>

    </section>
  );
}