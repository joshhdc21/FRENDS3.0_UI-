function TrafficHeroSection() {
  return (
    <section id="traffic" className="page-section">
      <div className="hero-panel">
        <div className="hero-content">
          <p className="eyebrow">
            REAL-TIME TRAFFIC MONITORING SYSTEM
          </p>

          <h2>
            Monitor Traffic Flow,
            <br />
            Detect Congestion,
            <br />
            and Find Safer Routes.
          </h2>

          <p className="hero-description">
            FRENDS provides real-time traffic condition monitoring using smart
            road data, helping commuters avoid congested areas and make better
            navigation decisions during heavy traffic and severe weather
            conditions.
          </p>

          {/* Traffic Summary Cards */}
          <div className="traffic-summary">
            <div className="traffic-summary-card">
              <span>Current Traffic</span>
              <strong>MODERATE</strong>
            </div>

            <div className="traffic-summary-card">
              <span>Active Roads</span>
              <strong>24</strong>
            </div>

            <div className="traffic-summary-card">
              <span>Average Speed</span>
              <strong>42 km/h</strong>
            </div>
          </div>
        </div>

        {/* Traffic Status */}
        <div className="system-status-card">
          <span>Traffic System</span>
          <strong>ONLINE</strong>
          <small>
            Monitoring road conditions, congestion levels, vehicle flow, and
            navigation updates.
          </small>
        </div>
      </div>

      {/* Live Traffic Information */}
      <div className="section-heading">
        <h3>Live Traffic Conditions</h3>
        <span className="last-update">
          Updated: Just Now
        </span>
      </div>

      <div className="traffic-live-grid">
        <div className="traffic-live-card">
          <h4>Road 1</h4>
          <p><strong>Status:</strong> Heavy Traffic</p>
          <p><strong>Average Speed:</strong> 18 km/h</p>
          <p><strong>Flood Status:</strong> Passable</p>
        </div>

        <div className="traffic-live-card">
          <h4>Roadc2</h4>
          <p><strong>Status:</strong> Moderate</p>
          <p><strong>Average Speed:</strong> 35 km/h</p>
          <p><strong>Flood Status:</strong> Clear</p>
        </div>

        <div className="traffic-live-card">
          <h4>Road 3</h4>
          <p><strong>Status:</strong> Light Traffic</p>
          <p><strong>Average Speed:</strong> 52 km/h</p>
          <p><strong>Flood Status:</strong> Clear</p>
        </div>

        <div className="traffic-live-card">
          <h4>Road 4</h4>
          <p><strong>Status:</strong> Severe Congestion</p>
          <p><strong>Average Speed:</strong> 12 km/h</p>
          <p><strong>Flood Status:</strong> Caution</p>
        </div>
      </div>
    </section>
  );
}

export default TrafficHeroSection;