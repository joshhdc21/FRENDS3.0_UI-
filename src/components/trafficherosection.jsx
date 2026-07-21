export default function HeroSection() {
  return (
    <section
      id="home"
      className="page-section"
    >

      <div className="hero-panel">

        <div className="hero-content">

          <p className="eyebrow">
            REAL-TIME TRAFFIC & FLOOD MONITORING
          </p>

          <h2>
            Monitor Flood Levels,
            <br />
            Traffic Conditions,
            <br />
            and Navigate Safely.
          </h2>

          <p className="hero-description">
            FRENDS provides real-time traffic
            conditions, flood monitoring,
            weather updates, and road
            information to help drivers
            choose the safest route during
            severe weather and heavy traffic.
          </p>

        </div>

        <div className="system-status-card">

          <span>System Status</span>

          <strong>ONLINE</strong>

          <small>
            Monitoring traffic, weather,
            flood sensors, and Firebase
            nodes in real time.
          </small>

        </div>

      </div>

    </section>
  );
}