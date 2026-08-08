import { useEffect, useState } from "react";
import { fetchTrafficData } from "../services/trafficService";
import TrafficChart from "./TrafficChart";

function TrafficHeroSection() {
  const [traffic, setTraffic] = useState(null);
  const [lastUpdated, setLastUpdated] = useState("");

  // =====================================================
  // LIVE CONGESTION HISTORY
  // Current hour only
  // =====================================================

  const [trafficHistory, setTrafficHistory] = useState([]);

  const [graphHour, setGraphHour] = useState(
    new Date().getHours()
  );

  // =====================================================
  // LOAD TRAFFIC DATA
  // =====================================================

  useEffect(() => {
    async function loadTraffic() {
      try {
        const data = await fetchTrafficData();

        console.log("Traffic Data:", data);

        setTraffic(data);

        const now = new Date();
        const currentHour = now.getHours();

        const currentTime = now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        setLastUpdated(currentTime);

        // =================================================
        // LIVE CONGESTION HISTORY
        // =================================================

        setTrafficHistory((previousHistory) => {
          // If the hour changed, reset the graph
          if (graphHour !== currentHour) {
            setGraphHour(currentHour);

            return [
              {
                time: currentTime,
                congestion: Number(data.congestion) || 0,
                usualCongestion:
                  Number(data.usualCongestion) ||
                  Number(data.congestion) ||
                  0,
              },
            ];
          }

          // Remove duplicate timestamp
          const filteredHistory = previousHistory.filter(
            (item) => item.time !== currentTime
          );

          return [
            ...filteredHistory,
            {
              time: currentTime,
              congestion: Number(data.congestion) || 0,
              usualCongestion:
                Number(data.usualCongestion) ||
                Number(data.congestion) ||
                0,
            },
          ];
        });
      } catch (error) {
        console.error(
          "Failed to fetch traffic data:",
          error
        );
      }
    }

    // Initial fetch
    loadTraffic();

    // Refresh every minute
    const interval = setInterval(
      loadTraffic,
      60000
    );

    return () => clearInterval(interval);
  }, [graphHour]);

  // =====================================================
  // ROAD DATA
  // =====================================================

  const roads = traffic?.roads || [];

  // =====================================================
  // VALID ROADS
  // =====================================================

  const validRoads = roads.filter(
    (road) =>
      !Number.isNaN(Number(road.congestion))
  );

  // =====================================================
  // AVERAGE ROAD CONGESTION
  // =====================================================

  const averageCongestion =
    validRoads.length > 0
      ? validRoads.reduce(
          (sum, road) =>
            sum + Number(road.congestion || 0),
          0
        ) / validRoads.length
      : 0;

  // =====================================================
  // HIGHEST CONGESTION
  // =====================================================

  const highestCongestion =
    validRoads.length > 0
      ? Math.max(
          ...validRoads.map((road) =>
            Number(road.congestion || 0)
          )
        )
      : 0;

  // =====================================================
  // LOWEST CONGESTION
  // =====================================================

  const lowestCongestion =
    validRoads.length > 0
      ? Math.min(
          ...validRoads.map((road) =>
            Number(road.congestion || 0)
          )
        )
      : 0;

  // =====================================================
  // MOST CONGESTED ROAD
  // =====================================================

  const mostCongestedRoad =
    validRoads.length > 0
      ? [...validRoads].sort(
          (a, b) =>
            Number(b.congestion) -
            Number(a.congestion)
        )[0]
      : null;

  // =====================================================
  // LEAST CONGESTED ROAD
  // =====================================================

  const leastCongestedRoad =
    validRoads.length > 0
      ? [...validRoads].sort(
          (a, b) =>
            Number(a.congestion) -
            Number(b.congestion)
        )[0]
      : null;

  // =====================================================
  // ROAD STATUS COUNTS
  // =====================================================

  const lightRoads = roads.filter(
    (road) =>
      String(road.status || "").toLowerCase() ===
      "light"
  ).length;

  const moderateRoads = roads.filter(
    (road) =>
      String(road.status || "").toLowerCase() ===
      "moderate"
  ).length;

  const heavyRoads = roads.filter(
    (road) =>
      String(road.status || "").toLowerCase() ===
      "heavy"
  ).length;

  const severeRoads = roads.filter(
    (road) =>
      String(road.status || "").toLowerCase() ===
      "severe"
  ).length;

  // =====================================================
  // ROAD RANKING
  // =====================================================

  const rankedRoads = [...validRoads].sort(
    (a, b) =>
      Number(b.congestion) -
      Number(a.congestion)
  );

  // =====================================================
  // STATUS CLASS
  // =====================================================

  const getStatusClass = (status) => {
    return String(status || "unavailable")
      .toLowerCase()
      .replace(/\s+/g, "-");
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <section className="traffic-section">

      {/* =================================================
          HERO
      ================================================= */}

      <div className="hero-panel">

        <div className="hero-content">

          <p className="eyebrow">
            METRO MANILA TRAFFIC MONITORING SYSTEM
          </p>

          <h2>
            How Busy Is Metro Manila During
            <br />
            Rush Hour?
          </h2>

          <p className="hero-description">
            FRENDS analyzes Metro Manila traffic
            congestion to help commuters understand
            traffic conditions and make safer travel
            decisions during normal and severe
            weather conditions.
          </p>

          <br />

          <div className="traffic-summary-card">

            <span>
              Last Updated
            </span>

            <strong>
              {lastUpdated || "--:--"}
            </strong>

          </div>

        </div>

        <div className="system-status-card">

          <span>
            Traffic System
          </span>

          <strong>
            {traffic ? "ONLINE" : "CONNECTING"}
          </strong>

          <small>
            Monitoring Metro Manila congestion,
            rush hour patterns, and road conditions.
          </small>

        </div>

      </div>

      {/* =================================================
          TRAFFIC DATA
      ================================================= */}

      {traffic ? (
        <>

          {/* =================================================
              METRO MANILA OVERALL
          ================================================= */}

          <div className="metro-overview">

            <div className="metro-overview-header">

              <div>

                <span className="metro-label">
                  LIVE METRO MANILA TRAFFIC
                </span>

                <h2>
                  {traffic.congestion}%
                </h2>

                <p>
                  Overall Metro Manila congestion
                </p>

              </div>

              <div
                className={`metro-status-badge ${getStatusClass(
                  traffic.status
                )}`}
              >
                {traffic.status}
              </div>

            </div>

            <div className="metro-stats">

              <div className="metro-stat">

                <span>
                  Overall Status
                </span>

                <h3>
                  {traffic.status}
                </h3>

              </div>

              <div className="metro-stat">

                <span>
                  Average Road Congestion
                </span>

                <h3>
                  {averageCongestion.toFixed(1)}%
                </h3>

              </div>

              <div className="metro-stat">

                <span>
                  Peak Hours
                </span>

                <h3>
                  {traffic.peak || "--"}
                </h3>

              </div>

            </div>

          </div>


          {/* =================================================
              TRAFFIC OVERVIEW STATISTICS
          ================================================= */}

          <div className="section-heading">

            <h3>
              Traffic Overview
            </h3>

            <span className="last-update">
              Live Data
            </span>

          </div>

          <div className="traffic-statistics">

            <div className="traffic-stat-card">

              <span>
                Average Road Congestion
              </span>

              <strong>
                {averageCongestion.toFixed(1)}%
              </strong>

              <small>
                Across all monitored roads
              </small>

            </div>

            <div className="traffic-stat-card">

              <span>
                Highest Congestion
              </span>

              <strong>
                {highestCongestion}%
              </strong>

              <small>
                Current highest road level
              </small>

            </div>

            <div className="traffic-stat-card">

              <span>
                Lowest Congestion
              </span>

              <strong>
                {lowestCongestion}%
              </strong>

              <small>
                Current lowest road level
              </small>

            </div>

            <div className="traffic-stat-card">

              <span>
                Monitored Roads
              </span>

              <strong>
                {roads.length}
              </strong>

              <small>
                Currently being monitored
              </small>

            </div>

          </div>


          {/* =================================================
              CONGESTION DISTRIBUTION
          ================================================= */}

          <div className="traffic-distribution">

            <div className="section-heading">

              <h3>
                Road Condition Distribution
              </h3>

              <span className="last-update">
                {roads.length} monitored roads
              </span>

            </div>

            <div className="distribution-grid">

              {/* LIGHT */}

              <div className="distribution-card light">

                <div className="distribution-icon">
                  🟢
                </div>

                <div>

                  <span>
                    Light
                  </span>

                  <strong>
                    {lightRoads}
                  </strong>

                  <small>
                    roads
                  </small>

                </div>

              </div>


              {/* MODERATE */}

              <div className="distribution-card moderate">

                <div className="distribution-icon">
                  🟡
                </div>

                <div>

                  <span>
                    Moderate
                  </span>

                  <strong>
                    {moderateRoads}
                  </strong>

                  <small>
                    roads
                  </small>

                </div>

              </div>


              {/* HEAVY */}

              <div className="distribution-card heavy">

                <div className="distribution-icon">
                  🟠
                </div>

                <div>

                  <span>
                    Heavy
                  </span>

                  <strong>
                    {heavyRoads}
                  </strong>

                  <small>
                    roads
                  </small>

                </div>

              </div>


              {/* SEVERE */}

              <div className="distribution-card severe">

                <div className="distribution-icon">
                  🔴
                </div>

                <div>

                  <span>
                    Severe
                  </span>

                  <strong>
                    {severeRoads}
                  </strong>

                  <small>
                    roads
                  </small>

                </div>

              </div>

            </div>

          </div>


          {/* =================================================
              MOST CONGESTED ROAD
          ================================================= */}

          {mostCongestedRoad && (
            <div className="traffic-highlight">

              <div>

                <span>
                  MOST CONGESTED ROAD
                </span>

                <h3>
                  {mostCongestedRoad.name}
                </h3>

                <p>
                  Currently experiencing the highest
                  congestion among monitored roads.
                </p>

              </div>

              <strong>
                {mostCongestedRoad.congestion}%
              </strong>

            </div>
          )}


          {/* =================================================
              LEAST CONGESTED ROAD
          ================================================= */}

          {leastCongestedRoad && (
            <div className="traffic-highlight least">

              <div>

                <span>
                  LEAST CONGESTED ROAD
                </span>

                <h3>
                  {leastCongestedRoad.name}
                </h3>

                <p>
                  Currently has the lowest congestion
                  among monitored roads.
                </p>

              </div>

              <strong>
                {leastCongestedRoad.congestion}%
              </strong>

            </div>
          )}


          {/* =================================================
              ROAD RANKING
          ================================================= */}

          <div className="traffic-ranking">

            <div className="section-heading">

              <h3>
                Most Congested Roads
              </h3>

              <span className="last-update">
                Highest to lowest
              </span>

            </div>

            <div className="ranking-list">

              {rankedRoads.map(
                (road, index) => {

                  const statusClass =
                    getStatusClass(
                      road.status
                    );

                  return (
                    <div
                      key={road.name}
                      className="ranking-item"
                    >

                      <div className="ranking-number">
                        {index + 1}
                      </div>

                      <div className="ranking-road">

                        <strong>
                          {road.name}
                        </strong>

                        <div className="ranking-bar">

                          <div
                            className={`ranking-fill ${statusClass}`}
                            style={{
                              width: `${Math.min(
                                Number(
                                  road.congestion
                                ) || 0,
                                100
                              )}%`,
                            }}
                          />

                        </div>

                      </div>

                      <div className="ranking-value">

                        <strong>
                          {road.congestion}%
                        </strong>

                        <span
                          className={`status-badge ${statusClass}`}
                        >
                          {road.status}
                        </span>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          </div>

        </>
      ) : (

        /* =================================================
           LOADING
        ================================================= */

        <div className="traffic-loading">

          <p>
            Loading live traffic data...
          </p>

        </div>

      )}

    </section>
  );
}

export default TrafficHeroSection;