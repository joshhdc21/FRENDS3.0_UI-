import { useEffect, useState } from "react";
import { fetchTrafficData } from "../services/trafficService";
import TrafficChart from "./TrafficChart";

function TrafficHeroSection() {
  const [traffic, setTraffic] = useState(null);
  const [lastUpdated, setLastUpdated] = useState("");
  

  const [trafficHistory, setTrafficHistory] = useState(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      hour:
        i === 0
          ? "12 AM"
          : i < 12
          ? `${i} AM`
          : i === 12
          ? "12 PM"
          : `${i - 12} PM`,
      congestion: 0,
      usualCongestion: 0,
    }));
  });

  useEffect(() => {
    async function loadTraffic() {
      try {
        const data = await fetchTrafficData();
        console.log("Traffic Data:", data);

        setTraffic(data);

        // Update only the current hour
        setTrafficHistory((prev) => {
          const currentHour = new Date().getHours();

          return prev.map((item, index) =>
            index === currentHour
              ? {
                  ...item,
                  congestion: data.congestion,
                  usualCongestion:
                    data.usualCongestion ?? data.congestion,
                }
              : item
          );
        });

        setLastUpdated(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      } catch (error) {
        console.error("Failed to fetch traffic data:", error);
      }
    }

    loadTraffic();

    const interval = setInterval(loadTraffic, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="traffic" className="page-section">
      {/* ================= HERO ================= */}
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
            FRENDS analyzes Metro Manila traffic congestion to help commuters
            understand traffic conditions and make safer travel decisions during
            normal and severe weather conditions.
          </p>

          <br />

          <div className="traffic-summary-card">
            <span>Last Updated</span>
            <strong>{lastUpdated || "--:--"}</strong>
          </div>
        </div>

        <div className="system-status-card">
          <span>Traffic System</span>
          <strong>ONLINE</strong>
          <small>
            Monitoring Metro Manila congestion, rush hour patterns, and travel
            conditions.
          </small>
        </div>
      </div>

      {/* ================= ROAD CARDS ================= */}
      <div className="section-heading">
        <h3>Road Traffic Conditions</h3>
        <span className="last-update">
          Updated: {lastUpdated || "Loading..."}
        </span>
      </div>

      {traffic ? (
        <>
          <div className="traffic-live-grid">
            {traffic.roads?.map((road) => (
              <div
                key={road.name}
                className={`traffic-live-card ${road.status.toLowerCase()}`}
              >
                <div className="traffic-card-header">
                  <h4>{road.name}</h4>
                </div>

                <div className="traffic-card-body">
                  <span
                    className={`status-badge ${road.status.toLowerCase()}`}
                  >
                    {road.status}
                  </span>

                  <p className="traffic-time">
                    Congestion: <strong>{road.congestion}%</strong>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ================= METRO MANILA ================= */}
          <div className="metro-overview">
            <h2>METRO MANILA OVERALL TRAFFIC</h2>
            <p>Current congestion across Metro Manila</p>

            <div className="metro-stats">
              <div className="metro-stat">
                <span>Overall Status</span>
                <h3>{traffic.status}</h3>
              </div>

              <div className="metro-stat">
                <span>Average Congestion</span>
                <h3>{traffic.congestion}%</h3>
              </div>

              <div className="metro-stat">
                <span>Peak Hours</span>
                <h3>{traffic.peak}</h3>
              </div>
            </div>
          </div>

          {/* ================= CHART ================= */}
          <div className="traffic-history">
            <div className="section-heading">
              <h3>Real Time Monitoring Congestion Level</h3>
              <span>Live Updates</span>
            </div>

            <div className="traffic-chart-card">
              <TrafficChart data={trafficHistory} />
            </div>
          </div>
        </>
      ) : (
        <p>Loading traffic data...</p>
      )}
    </section>
  );
}

export default TrafficHeroSection;