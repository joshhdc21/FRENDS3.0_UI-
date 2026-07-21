import "./TrafficSection.css";

const roads = [
  {
    road: "España Boulevard",
    traffic: "Heavy",
    speed: "12 km/h",
    color: "critical",
  },
  {
    road: "Taft Avenue",
    traffic: "Moderate",
    speed: "30 km/h",
    color: "warning",
  },
  {
    road: "Quezon Avenue",
    traffic: "Light",
    speed: "50 km/h",
    color: "normal",
  },
  {
    road: "EDSA Northbound",
    traffic: "Very Heavy",
    speed: "8 km/h",
    color: "critical",
  },
];

export default function TrafficSection() {
  return (
    <section className="page-section">

      <div className="section-heading">
        <div>
          <h3>Traffic Monitoring</h3>
          <p className="section-description">
            Live traffic conditions from monitored roads.
          </p>
        </div>

        <span className="last-update">
          Updated 30 seconds ago
        </span>
      </div>

      <div className="traffic-grid">
        {roads.map((road) => (
          <div className={`traffic-card ${road.color}`} key={road.road}>

            <div className="traffic-top">

              <div>
                <span>ROAD</span>
                <h4>{road.road}</h4>
              </div>

              <div className={`traffic-status ${road.color}`}>
                {road.traffic}
              </div>

            </div>

            <strong>{road.speed}</strong>

            <p>
              Average travel speed detected on this road segment.
            </p>

          </div>
        ))}
      </div>

    </section>
  );
}