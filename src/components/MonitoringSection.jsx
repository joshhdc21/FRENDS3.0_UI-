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

            {/* =========================================
          FRENDS HOMEPAGE INFORMATION
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


        <div className="frends-info-grid">

          <article className="frends-info-card">

            <div className="frends-info-icon">
              🌊
            </div>

            <div>
              <h3>Monitor Flood Conditions</h3>

              <p>
                Get real-time water-level readings and flood
                status from connected monitoring devices.
              </p>
            </div>

          </article>


          <article className="frends-info-card">

            <div className="frends-info-icon">
              🚦
            </div>

            <div>
              <h3>Check Traffic Conditions</h3>

              <p>
                View current traffic information on monitored
                roads and understand how congestion may affect
                your journey.
              </p>
            </div>

          </article>


          <article className="frends-info-card">

            <div className="frends-info-icon">
              ☁️
            </div>

            <div>
              <h3>Stay Updated With Weather</h3>

              <p>
                Access current weather information to help
                you prepare for changing road conditions.
              </p>
            </div>

          </article>


          <article className="frends-info-card">

            <div className="frends-info-icon">
              🗺️
            </div>

            <div>
              <h3>Make Smarter Travel Decisions</h3>

              <p>
                Use flood, traffic, and weather information
                to better understand current conditions before
                starting your journey.
              </p>
            </div>

          </article>

        </div>


        {/* HOW FRENDS WORKS */}

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
              <span className="process-number">01</span>

              <h4>Collect</h4>

              <p>
                Sensors collect real-time water-level and
                environmental data.
              </p>
            </div>


            <div className="frends-process-card">
              <span className="process-number">02</span>

              <h4>Process</h4>

              <p>
                FRENDS processes incoming information and
                determines the current conditions.
              </p>
            </div>


            <div className="frends-process-card">
              <span className="process-number">03</span>

              <h4>Inform</h4>

              <p>
                Users receive updated flood, traffic, and
                weather information.
              </p>
            </div>


            <div className="frends-process-card">
              <span className="process-number">04</span>

              <h4>Decide</h4>

              <p>
                Users can make safer and more informed
                travel decisions.
              </p>
            </div>

          </div>

        </div>

      </div>

    
    </section>
  );
}

export default MonitoringSection;