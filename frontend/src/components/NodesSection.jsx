import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../firebase/firebaseConfig";

// ==========================================
// NODE NAMES / LOCATIONS
// ==========================================
// Assign a permanent name/location to each node.
// Change the names here according to your
// actual monitoring node locations.
// ==========================================
const NODE_NAMES = {
  "node-01": "Leon Guinto St., Manila",
  "node-02": "Remeidios St., Manila",
  "node-03": "Pilar Hidalgo St., Manila",
  "node-04": "San Andres St., Manila",
  "node-05": "Maginhawa St., Manila",
  "node-06": "Fidel Reyes St., Manila",
  "node-07": "Taft Avenue",
  "node-08": "Pablo Ocampo St., Manila",
  "node-09": "A. Estrada St., Manila",
  "node-10": "Castro St., Manila",
};

// ==========================================
// FLOOD LEVEL CLASSIFICATION
// ==========================================
// Firebase stores flood level in centimeters.
//
// 0 - 10 cm       = Normal
// >10 - 25 cm     = Caution
// >25 - 50 cm     = Warning
// >50 cm          = Critical
//
// Displayed to the user in feet.
//
// 10 cm = 0.33 ft
// 25 cm = 0.82 ft
// 50 cm = 1.64 ft
// ==========================================
function getFloodInformation(floodLevel, status) {
  if (status === "offline") {
    return {
      label: "Offline",
      className: "offline",
      description: "Sensor data unavailable",
    };
  }

  if (floodLevel <= 10) {
    return {
      label: "Normal",
      className: "normal",
      description: "Road condition is currently safe",
    };
  }

  if (floodLevel <= 25) {
    return {
      label: "Caution",
      className: "caution",
      description: "Water is beginning to accumulate",
    };
  }

  if (floodLevel <= 50) {
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

// ==========================================
// CONVERT CM TO FEET
// ==========================================
// 1 centimeter = 0.0328084 feet
// ==========================================
function cmToFeet(cm) {
  return cm * 0.0328084;
}

// ==========================================
// BATTERY VOLTAGE TO PERCENTAGE
// ==========================================
//
// Battery configuration:
// 7.4 V = 100%
// 6.0 V = 0%
//
// Values are limited between 0 and 100%.
// ==========================================
function batteryPercentage(voltage) {
  const FULL_VOLTAGE = 7.4;
  const EMPTY_VOLTAGE = 6.0;

  const percentage =
    ((voltage - EMPTY_VOLTAGE) /
      (FULL_VOLTAGE - EMPTY_VOLTAGE)) *
    100;

  return Math.min(Math.max(percentage, 0), 100);
}

// ==========================================
// FORMAT LAST UPDATE
// ==========================================
function formatLastUpdate(timestamp) {
  if (!timestamp) {
    return "No recent data";
  }

  return new Date(timestamp).toLocaleString();
}

// ==========================================
// NODE CARD
// ==========================================
function NodeCard({ node }) {
  // ----------------------------------------
  // GET DATA FROM FIREBASE
  // ----------------------------------------

  const floodLevel = Number(node.waterLevel ?? 0);

  const pressure = Number(node.pressure ?? 0);

  const battery = Number(node.battery ?? 0);

  const status = node.status ?? "offline";

  // ----------------------------------------
  // GET FLOOD STATUS
  // ----------------------------------------
  const flood = getFloodInformation(
    floodLevel,
    status
  );

  // ----------------------------------------
  // CONVERT FLOOD LEVEL
  // CM → FT
  // ----------------------------------------
  const floodLevelFeet = cmToFeet(floodLevel);

  // ----------------------------------------
  // FLOOD LEVEL PROGRESS BAR
  //
  // 60 cm = 1.97 ft
  // 60 cm is considered 100%.
  // ----------------------------------------
  const floodPercentage =
    status === "offline"
      ? 0
      : Math.min(
          (floodLevel / 60) * 100,
          100
        );

  // ----------------------------------------
  // BATTERY PERCENTAGE
  // ----------------------------------------
  const batteryPercent =
    status === "online"
      ? batteryPercentage(battery)
      : 0;

  // ----------------------------------------
  // GET NODE DISPLAY NAME
  // ----------------------------------------
  const nodeName =
    NODE_NAMES[node.id] ||
    node.location ||
    `Location ${node.id}`;

  return (
    <article
      className={`node-card node-${flood.className}`}
    >
      {/* ==================================
          NODE HEADER
      ================================== */}
      <div className="node-card-top">

        {/* ==================================
            NODE TITLE / LOCATION
        ================================== */}
        <div className="node-title-container">

          <span className="node-id">
            {node.id}
          </span>

          <h4 className="node-location-name">
            {nodeName}
          </h4>

        </div>

        {/* =================================
            CONNECTION STATUS
        ================================= */}
        <div
          className={`node-connectivity ${status}`}
        >
          <span className="node-connectivity-dot"></span>

          {status === "online"
            ? "Online"
            : "Offline"}
        </div>

      </div>

      {/* ==================================
          FLOOD LEVEL
      ================================== */}
      <div className="node-water-level">

        <div>
          <span>
            Current flood level
          </span>

          <strong>
            {status === "online"
              ? floodLevelFeet.toFixed(2)
              : "--"}

            <small>
              {" "}ft
            </small>
          </strong>
        </div>

        {/* =================================
            FLOOD STATUS BADGE
        ================================= */}
        <span
          className={`node-flood-badge ${flood.className}`}
        >
          {flood.label}
        </span>

      </div>

      {/* ==================================
          FLOOD LEVEL PROGRESS BAR
      ================================== */}
      <div className="node-progress-track">

        <div
          className={`node-progress-fill ${flood.className}`}
          style={{
            width: `${floodPercentage}%`,
          }}
        />

      </div>

      {/* ==================================
          FLOOD DESCRIPTION
      ================================== */}
      <p className="node-description">
        {flood.description}
      </p>

      {/* ==================================
          NODE INFORMATION
      ================================== */}
      <div className="node-information-grid">

        {/* =================================
            PRESSURE
        ================================= */}
        <div>
          <span>
            Pressure
          </span>

          <strong>
            {status === "online"
              ? `${pressure} hPa`
              : "--"}
          </strong>
        </div>

        {/* =================================
            BATTERY
        ================================= */}
        <div>
          <span>
            Battery
          </span>

          <strong>
            {status === "online"
              ? `${batteryPercent.toFixed(0)}%`
              : "--"}
          </strong>
        </div>

      </div>

      {/* ==================================
          LAST UPDATE
      ================================== */}
      <div className="node-card-footer">

        <span>
          Last update
        </span>

        <strong>
          {formatLastUpdate(
            node.timestamp
          )}
        </strong>

      </div>

    </article>
  );
}

// ==========================================
// FLOOD LEVEL GUIDE DATA
// ==========================================
//
// 0 - 10 cm       = 0 - 0.33 ft
// >10 - 25 cm     = >0.33 - 0.82 ft
// >25 - 50 cm     = >0.82 - 1.64 ft
// >50 cm          = Above 1.64 ft
// ==========================================
const floodLevels = [
  {
    level: "Normal",
    range: "0–0.33 ft",
    description:
      "Road condition is safe. No flood warning.",
    className: "normal",
  },

  {
    level: "Caution",
    range: ">0.33–0.82 ft",
    description:
      "Water is beginning to accumulate.",
    className: "caution",
  },

  {
    level: "Warning",
    range: ">0.82–1.64 ft",
    description:
      "Flooding may affect small vehicles.",
    className: "warning",
  },

  {
    level: "Critical",
    range: "Above 1.64 ft",
    description:
      "Dangerous flood level. Avoid the affected road.",
    className: "critical",
  },
];

// ==========================================
// NODES SECTION
// ==========================================
function NodesSection() {
  const [nodes, setNodes] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  // ========================================
  // FIREBASE REAL-TIME LISTENER
  // ========================================
  useEffect(() => {
    const nodesRef = ref(
      database,
      "nodes"
    );

    const unsubscribe = onValue(
      nodesRef,

      (snapshot) => {
        if (snapshot.exists()) {
          const rawData = snapshot.val();

          const latestNodesArray = [];

          // ==================================
          // LOOP THROUGH EACH NODE
          // ==================================
          for (
            const [nodeKey, nodeHistory] of Object.entries(
              rawData
            )
          ) {
            if (
              !nodeHistory ||
              typeof nodeHistory !== "object"
            ) {
              continue;
            }

            // --------------------------------
            // GET ALL HISTORICAL READINGS
            // --------------------------------
            const entries =
              Object.values(nodeHistory);

            if (entries.length > 0) {

              // =================================
              // FIND THE MOST RECENT READING
              // =================================
              const latestEntry =
                entries.sort(
                  (a, b) =>
                    Number(
                      b.timestamp || 0
                    ) -
                    Number(
                      a.timestamp || 0
                    )
                )[0];

              // =================================
              // GET NODE ID
              // =================================
              const nodeId =
                latestEntry.id ||
                nodeKey;

              // =================================
              // NORMALIZE FIREBASE DATA
              // =================================
              latestNodesArray.push({
                ...latestEntry,

                // Firebase node key
                firebaseKey:
                  nodeKey,

                // Node ID
                id:
                  nodeId,

                // Convert status:
                // ONLINE → online
                // OFFLINE → offline
                status:
                  latestEntry.status
                    ? String(
                        latestEntry.status
                      ).toLowerCase()
                    : "offline",

                // Firebase timestamp is in
                // seconds.
                //
                // JavaScript Date requires
                // milliseconds.
                timestamp:
                  latestEntry.timestamp
                    ? Number(
                        latestEntry.timestamp
                      ) * 1000
                    : null,

                // =================================
                // NODE LOCATION
                // =================================
                location:
                  NODE_NAMES[nodeId] ||
                  latestEntry.location ||
                  `Location ${nodeId}`,
              });
            }
          }

          // ----------------------------------
          // UPDATE REACT STATE
          // ----------------------------------
          setNodes(
            latestNodesArray
          );

        } else {
          // No Firebase data
          setNodes([]);
        }

        setLoading(false);
        setError(null);
      },

      // ======================================
      // FIREBASE ERROR
      // ======================================
      (firebaseError) => {
        console.error(
          "Firebase error:",
          firebaseError
        );

        setError(
          "Failed to load node data."
        );

        setLoading(false);
      }
    );

    // ========================================
    // CLEANUP FIREBASE LISTENER
    // ========================================
    return () => unsubscribe();

  }, []);

  // ========================================
  // SAFETY CHECK
  // ========================================
  const safeNodes =
    Array.isArray(nodes)
      ? nodes
      : [];

  // ========================================
  // COUNT ONLINE NODES
  // ========================================
  const onlineNodes =
    safeNodes.filter(
      (node) =>
        node.status === "online"
    ).length;

  // ========================================
  // COUNT CRITICAL NODES
  // ========================================
  const criticalNodes =
    safeNodes.filter((node) => {
      const flood =
        getFloodInformation(
          Number(
            node.waterLevel ?? 0
          ),
          node.status
        );

      return (
        flood.className ===
        "critical"
      );
    }).length;

  // ========================================
  // COUNT WARNING + CRITICAL NODES
  // ========================================
  const warningNodes =
    safeNodes.filter((node) => {
      const flood =
        getFloodInformation(
          Number(
            node.waterLevel ?? 0
          ),
          node.status
        );

      return (
        flood.className === "warning" ||
        flood.className === "critical"
      );
    }).length;

  // ========================================
  // MAIN UI
  // ========================================
  return (
    <section
      id="nodes"
      className="page-section"
    >

      {/* ====================================
          SECTION HEADER
      ===================================== */}
      <div className="section-heading nodes-heading">

        <div>

          <p className="eyebrow">
            MONITORING NETWORK
          </p>

          <h3>
            Flood Monitoring Nodes
          </h3>

          <p className="section-description">
            Real-time flood information from
            the installed monitoring devices.
          </p>

        </div>

        {/* ==================================
            NODE SUMMARY
        ================================== */}
        <div className="node-summary">

          {/* TOTAL NODES */}
          <div>
            <span>
              Total Nodes
            </span>

            <strong>
              {safeNodes.length}
            </strong>
          </div>

          {/* ONLINE NODES */}
          <div>
            <span>
              Online
            </span>

            <strong>
              {onlineNodes}
            </strong>
          </div>

          {/* WARNING NODES */}
          <div>
            <span>
              Warning
            </span>

            <strong>
              {warningNodes}
            </strong>
          </div>

          {/* CRITICAL NODES */}
          <div>
            <span>
              Critical
            </span>

            <strong>
              {criticalNodes}
            </strong>
          </div>

        </div>

      </div>

      {/* ====================================
          LOADING MESSAGE
      ===================================== */}
      {loading && (
        <div className="firebase-message">
          Loading node information...
        </div>
      )}

      {/* ====================================
          ERROR MESSAGE
      ===================================== */}
      {error && (
        <div
          className="firebase-message firebase-error"
        >
          {error}
        </div>
      )}

      {/* ====================================
          NO NODES MESSAGE
      ===================================== */}
      {!loading &&
        !error &&
        safeNodes.length === 0 && (
          <div className="firebase-message">
            No monitoring nodes found.
          </div>
        )}

      {/* ====================================
          NODE GRID
      ===================================== */}
      <div className="nodes-grid">

        {safeNodes.map(
          (node, index) => (
            <NodeCard
              key={
                node.firebaseKey ||
                node.id ||
                `fallback-key-${index}`
              }
              node={node}
            />
          )
        )}

      </div>

      {/* =================================================
          FLOOD LEVEL GUIDE
      ================================================= */}
      <section
        id="flood-level"
        className="page-section"
      >

        <div className="section-heading">

          <div>

            <p className="eyebrow">
              FLOOD LEVEL GUIDE
            </p>

            <h3>
              Flood Warning Classification
            </h3>

          </div>

        </div>

        <div className="flood-layout">

          {/* =============================================
              CURRENT FLOOD LEVEL
          ============================================= */}
          <article className="current-level-panel">

            <div className="level-visual">

              <div className="water-indicator">

                <div className="water-fill"></div>

                <span>
                  0 ft
                </span>

              </div>

            </div>

            <div className="current-level-content">

              <p className="eyebrow">
                CURRENT FLOOD LEVEL
              </p>

              <h4>
                No reading available
              </h4>

              <p>
                The current water level will appear
                here once Firebase receives sensor
                data from the ESP32-C3 device.
              </p>

              <span className="level-status-badge">
                Waiting for device
              </span>

            </div>

          </article>

          {/* =============================================
              FLOOD LEVEL CLASSIFICATION LIST
          ============================================= */}
          <div className="flood-level-list">

            {floodLevels.map(
              (item) => (
                <article
                  className={`flood-level-item ${item.className}`}
                  key={item.level}
                >

                  <span className="level-marker"></span>

                  <div>

                    <div className="level-title-row">

                      <h4>
                        {item.level}
                      </h4>

                      <strong>
                        {item.range}
                      </strong>

                    </div>

                    <p>
                      {item.description}
                    </p>

                  </div>

                </article>
              )
            )}

          </div>

        </div>

      </section>

      {/* =================================================
          DEVICE INFORMATION
      ================================================= */}
      <section
        id="device"
        className="page-section"
      >

        <div className="section-heading">

          <div>

            <p className="eyebrow">
              DEVICE INFORMATION
            </p>

            <h3>
              ESP32-C3 monitoring unit
            </h3>

          </div>

          <span className="offline-badge">
            Offline
          </span>

        </div>

        <div className="device-grid">

          {/* =============================================
              DEVICE INFORMATION CARD
          ============================================= */}
          <article className="device-information-card">

            <div className="information-row">

              <span>
                Device ID
              </span>

              <strong>
                esp32-c3-01
              </strong>

            </div>

            <div className="information-row">

              <span>
                Sensor
              </span>

              <strong>
                MS5540C pressure sensor
              </strong>

            </div>

            <div className="information-row">

              <span>
                Communication
              </span>

              <strong>
                Wi-Fi / Air780E cellular
              </strong>

            </div>

            <div className="information-row">

              <span>
                Last update
              </span>

              <strong>
                No data received
              </strong>

            </div>

            <div className="information-row">

              <span>
                Firebase status
              </span>

              <strong>
                Not connected
              </strong>

            </div>

          </article>

          {/* =============================================
              DEVICE CONDITION CARD
          ============================================= */}
          <article className="device-condition-card">

            <span className="device-icon">
              ESP
            </span>

            <div>

              <p className="eyebrow">
                DEVICE CONDITION
              </p>

              <h4>
                Monitoring unit is offline
              </h4>

              <p>
                Connect the website to Firebase and
                upload sensor readings from the ESP32
                to begin real-time monitoring.
              </p>

            </div>

          </article>

        </div>

      </section>

    </section>
  );
}

export default NodesSection;