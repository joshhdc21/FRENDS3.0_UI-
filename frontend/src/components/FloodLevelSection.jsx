const floodLevels = [
  {
    level: "Normal",
    range: "0–10 cm",
    description: "Road condition is safe. No flood warning.",
    className: "normal",
  },
  {
    level: "Caution",
    range: "11–25 cm",
    description: "Water is beginning to accumulate.",
    className: "caution",
  },
  {
    level: "Warning",
    range: "26–50 cm",
    description: "Flooding may affect small vehicles.",
    className: "warning",
  },
  {
    level: "Critical",
    range: "Above 50 cm",
    description: "Dangerous flood level. Avoid the affected road.",
    className: "critical",
  },
];

function FloodLevelSection() {
  return (
    <section id="flood-level" className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">FLOOD LEVEL GUIDE</p>
          <h3>Flood Warning Classification</h3>
        </div>
      </div>

      <div className="flood-layout">
        <article className="current-level-panel">
          <div className="level-visual">
            <div className="water-indicator">
              <div className="water-fill"></div>
              <span>0 cm</span>
            </div>
          </div>

          <div className="current-level-content">
            <p className="eyebrow">CURRENT FLOOD LEVEL</p>
            <h4>No reading available</h4>

            <p>
              The current water level will appear here once Firebase receives
              sensor data from the ESP32-C3 device.
            </p>

            <span className="level-status-badge">Waiting for device</span>
          </div>
        </article>

        <div className="flood-level-list">
          {floodLevels.map((item) => (
            <article
              className={`flood-level-item ${item.className}`}
              key={item.level}
            >
              <span className="level-marker"></span>

              <div>
                <div className="level-title-row">
                  <h4>{item.level}</h4>
                  <strong>{item.range}</strong>
                </div>

                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FloodLevelSection;