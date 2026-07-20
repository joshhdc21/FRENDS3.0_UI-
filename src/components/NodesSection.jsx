function getFloodInformation(waterLevel, status) {
  if (status === "offline") {
    return {
      label: "Offline",
      className: "offline",
      description: "Sensor data unavailable",
    };
  }

  if (waterLevel <= 10) {
    return {
      label: "Normal",
      className: "normal",
      description: "Road condition is currently safe",
    };
  }

  if (waterLevel <= 25) {
    return {
      label: "Caution",
      className: "caution",
      description: "Water is beginning to accumulate",
    };
  }

  if (waterLevel <= 50) {
    return {
      label: "Warning",
      className: "warning",
      description: "Flooding may affect small vehicles",
    };
  }

  return {
    label: "Critical",
    className: "critical",
    description: "Dangerous flood level detected",
  };
}

function formatLastUpdate(timestamp) {
  if (!timestamp) {
    return "No recent data";
  }

  return new Date(timestamp).toLocaleString();
}

function NodeCard({ node }) {
  const waterLevel = Number(node.waterLevel ?? 0);
  const pressure = Number(node.pressure ?? 0);
  const battery = Number(node.battery ?? 0);
  const status = node.status ?? "offline";

  const flood = getFloodInformation(waterLevel, status);

  const waterPercentage =
    status === "offline"
      ? 0
      : Math.min((waterLevel / 60) * 100, 100);

  return (
    <article className={`node-card node-${flood.className}`}>
      <div className="node-card-top">
        <div>
          <span className="node-id">{node.id}</span>
          <h4>{node.location}</h4>
        </div>

        <div className={`node-connectivity ${status}`}>
          <span className="node-connectivity-dot"></span>
          {status === "online" ? "Online" : "Offline"}
        </div>
      </div>

      <div className="node-water-level">
        <div>
          <span>Current water level</span>

          <strong>
            {status === "online" ? waterLevel : "--"}
            <small> cm</small>
          </strong>
        </div>

        <span className={`node-flood-badge ${flood.className}`}>
          {flood.label}
        </span>
      </div>

      <div className="node-progress-track">
        <div
          className={`node-progress-fill ${flood.className}`}
          style={{ width: `${waterPercentage}%` }}
        ></div>
      </div>

      <p className="node-description">{flood.description}</p>

      <div className="node-information-grid">
        <div>
          <span>Pressure</span>

          <strong>
            {status === "online" ? `${pressure} hPa` : "--"}
          </strong>
        </div>

        <div>
          <span>Battery</span>

          <strong>
            {status === "online" ? `${battery} V` : "--"}
          </strong>
        </div>
      </div>

      <div className="node-card-footer">
        <span>Last update</span>
        <strong>{formatLastUpdate(node.timestamp)}</strong>
      </div>
    </article>
  );
}

function NodesSection({ nodes, loading, error }) {
  const onlineNodes = nodes.filter(
    (node) => node.status === "online",
  ).length;

  const criticalNodes = nodes.filter((node) => {
    const flood = getFloodInformation(
      Number(node.waterLevel ?? 0),
      node.status,
    );

    return flood.className === "critical";
  }).length;

  const warningNodes = nodes.filter((node) => {
    const flood = getFloodInformation(
      Number(node.waterLevel ?? 0),
      node.status,
    );

    return (
      flood.className === "warning" ||
      flood.className === "critical"
    );
  }).length;

  return (
    <section id="nodes" className="page-section">
      <div className="section-heading nodes-heading">
        <div>
          <p className="eyebrow">MONITORING NETWORK</p>
          <h3>Flood monitoring nodes</h3>

          <p className="section-description">
            Real-time flood information from the ten installed
            monitoring devices.
          </p>
        </div>

        <div className="node-summary">
          <div>
            <span>Total nodes</span>
            <strong>{nodes.length}</strong>
          </div>

          <div>
            <span>Online</span>
            <strong>{onlineNodes}</strong>
          </div>

          <div>
            <span>Warning</span>
            <strong>{warningNodes}</strong>
          </div>

          <div>
            <span>Critical</span>
            <strong>{criticalNodes}</strong>
          </div>
        </div>
      </div>

      {loading && (
        <div className="firebase-message">
          Loading node information from Firebase...
        </div>
      )}

      {error && (
        <div className="firebase-message firebase-error">
          Firebase error: {error}
        </div>
      )}

      {!loading && !error && nodes.length === 0 && (
        <div className="firebase-message">
          No monitoring nodes are stored in Firebase.
        </div>
      )}

      <div className="nodes-grid">
        {nodes.map((node) => (
          <NodeCard
            node={node}
            key={node.firebaseKey || node.id}
          />
        ))}
      </div>
    </section>
  );
}

export default NodesSection;