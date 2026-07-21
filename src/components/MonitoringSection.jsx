function SensorCard({ title, value, unit, icon, type }) {
  return (
    <article className={`sensor-card sensor-card-${type}`}>
      <div className="sensor-card-header">
        <span>{title}</span>
        <span className="sensor-icon">{icon}</span>
      </div>

      <strong className="sensor-value">{value}</strong>
      <p className="sensor-unit">{unit}</p>
    </article>
  );
}

function MonitoringSection() {
  return (
    <section id="monitoring" className="page-section">
      <div className="hero-panel">
        <div className="hero-content">
          <p className="eyebrow">REAL-TIME MONITORING</p>

          <h2>Smart Flood and Water-Level Monitoring</h2>

          <p className="hero-description">
            View live pressure readings, estimated water level, battery
            condition, and flood warnings transmitted by the ESP32-C3
            monitoring device.
          </p>
        </div>

        <div className="system-status-card">
          <span>System Status</span>
          <strong>Initializing</strong>
          <small>Waiting for sensor information</small>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <p className="eyebrow">LIVE SENSOR DATA</p>
          <h3>Current Monitoring Values</h3>
        </div>

        <span className="last-update">No data received yet</span>
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

      {/* Live Map */}
      <div className="section-heading" style={{ marginTop: "40px" }}>
        <div>
          <p className="eyebrow">LIVE MAP</p>
          <h3>Live Map Viewing</h3>
        </div>
      </div>

      <div className="map-container">
        <iframe
          title="LIVE MAP VIEWING"
          src="https://www.google.com/maps?q=14.5995,120.9842&z=15&output=embed"
          width="100%"
          height="450"
          style={{
            border: 0,
            borderRadius: "18px",
          }}
          loading="lazy"
          allowFullScreen
        ></iframe>
      </div>
    </section>
  );
}

export default MonitoringSection;