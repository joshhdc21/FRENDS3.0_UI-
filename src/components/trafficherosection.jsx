export default function TrafficHeroSection() {
  return (
    <section
      id="traffic"
      className="page-section"
    >

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
            FRENDS provides real-time traffic condition
            monitoring using smart road data, helping
            commuters avoid congested areas and make
            better navigation decisions during heavy
            traffic and severe weather conditions.
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


        {/* Traffic Status Panel */}
        <div className="system-status-card">

          <span>Traffic System</span>

          <strong>
            ONLINE
          </strong>

          <small>
            Monitoring road conditions,
            congestion levels, vehicle flow,
            and navigation updates.
          </small>

        </div>


      </div>


    </section>
  );
}