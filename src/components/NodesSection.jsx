import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../firebase/firebaseConfig";
import "./FloodHistory.css";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// ==========================================
// NODE NAMES / LOCATIONS
// ==========================================
// Assign a permanent name/location to each node.
// Change the names here according to your
// actual monitoring node locations.
// ==========================================
const NODE_NAMES = {
  "node-01": "Leon Guinto St., Manila",
  "node-02": "Remedios St., Manila",
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
// 0 - 10 cm      = Normal
// >10 - 25 cm    = Caution
// >25 - 50 cm    = Warning
// >50 cm         = Critical
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

          <h4 className="node-location-name" style={{ textTransform: "none" }}>
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
        ================================_ */}
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
// 0 - 10 cm      = 0 - 0.33 ft
// >10 - 25 cm    = >0.33 - 0.82 ft
// >25 - 50 cm    = >0.82 - 1.64 ft
// >50 cm         = Above 1.64 ft
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

// Convert a timestamp to YYYY-MM-DD using the browser's local timezone.
function toLocalDateInput(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ==========================================
// NODES SECTION
// ==========================================
function NodesSection() {
  const [nodes, setNodes] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  // Historical flood-depth graph state
  const [selectedNodeKey, setSelectedNodeKey] = useState("");
  const [historyReadings, setHistoryReadings] = useState([]);
  const [historyInterval, setHistoryInterval] = useState("30m");
  const [selectedHistoryDate, setSelectedHistoryDate] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

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

          // Select the first available node for the history graph.
          setSelectedNodeKey((currentKey) =>
            currentKey || latestNodesArray[0]?.firebaseKey || ""
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
  // HISTORICAL FLOOD-DEPTH LISTENER
  // Reads all recorded measurements for the
  // selected node from nodes/{nodeKey}.
  // ========================================
  useEffect(() => {
    if (!selectedNodeKey) {
      setHistoryReadings([]);
      return;
    }

    setHistoryLoading(true);
    setHistoryError(null);

    const historyRef = ref(
      database,
      `nodes/${selectedNodeKey}`
    );

    const unsubscribe = onValue(
      historyRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setHistoryReadings([]);
          setHistoryLoading(false);
          return;
        }

        const rawHistory = snapshot.val();

        const readings = Object.entries(rawHistory)
          .map(([recordKey, reading]) => {
            if (!reading || typeof reading !== "object") {
              return null;
            }

            const rawTimestamp = Number(reading.timestamp);
            const waterLevel = Number(reading.waterLevel);

            if (
              !Number.isFinite(rawTimestamp) ||
              !Number.isFinite(waterLevel)
            ) {
              return null;
            }

            // Support timestamps stored in either seconds or milliseconds.
            const timestamp =
              rawTimestamp < 1_000_000_000_000
                ? rawTimestamp * 1000
                : rawTimestamp;

            return {
              recordKey,
              timestamp,
              waterLevel,
              timeLabel: new Date(timestamp).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.timestamp - b.timestamp);

        setHistoryReadings(readings);

        // Default to the most recent day that has recorded data.
        // Keep a date already selected by the user.
        if (readings.length > 0) {
          const latestDate = toLocalDateInput(
            readings[readings.length - 1].timestamp
          );
          setSelectedHistoryDate((currentDate) => currentDate || latestDate);
        }

        setHistoryLoading(false);
      },
      (firebaseError) => {
        console.error("Flood history Firebase error:", firebaseError);
        setHistoryError("Unable to load historical flood readings.");
        setHistoryReadings([]);
        setHistoryLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedNodeKey]);

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
  // BUILD THE SELECTED DAY'S TIME SLOTS
  // Every slot is displayed on the X-axis.
  // A slot without Firebase readings has a
  // null value, never a fabricated zero.
  // Firebase waterLevel is in cm; chart is ft.
  // ========================================
  const intervalMinutes = {
    "30m": 30,
    "1h": 60,
    "3h": 180,
  }[historyInterval];

  const timeSlots = [];
  for (let minuteOfDay = 0; minuteOfDay < 24 * 60; minuteOfDay += intervalMinutes) {
    const hour24 = Math.floor(minuteOfDay / 60);
    const minute = minuteOfDay % 60;
    const suffix = hour24 < 12 ? "AM" : "PM";
    const hour12 = hour24 % 12 || 12;
    const label = `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;

    timeSlots.push({
      minuteOfDay,
      label,
      waterLevel: null,
      totalDepthCm: 0,
      count: 0,
    });
  }

  // Only readings from the selected local calendar day are included.
  const selectedDayReadings = selectedHistoryDate
    ? historyReadings.filter((reading) =>
        toLocalDateInput(reading.timestamp) === selectedHistoryDate
      )
    : [];

  // Assign each real reading to its selected interval bucket.
  selectedDayReadings.forEach((reading) => {
    const date = new Date(reading.timestamp);
    const minuteOfDay = date.getHours() * 60 + date.getMinutes();
    const slotIndex = Math.floor(minuteOfDay / intervalMinutes);
    const slot = timeSlots[slotIndex];

    if (slot) {
      slot.totalDepthCm += reading.waterLevel;
      slot.count += 1;
    }
  });

  // Average readings inside each interval, then convert cm to ft.
  const chartReadings = timeSlots.map((slot) => ({
    timeLabel: slot.label,
    waterLevel: slot.count > 0
      ? (slot.totalDepthCm / slot.count) * 0.0328084
      : null,
    readingCount: slot.count,
  }));

  const latestSelectedDayReading = selectedDayReadings.length > 0
    ? selectedDayReadings[selectedDayReadings.length - 1]
    : null;

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
          HISTORICAL FLOOD-DEPTH GRAPH
          X-axis: time of day
          Y-axis: flood depth (ft)
      ================================================= */}
      <section
        id="flood-history"
        className="page-section flood-history-section"
        style={{
          marginTop: "32px",
          padding: "24px",
          borderRadius: "16px",
          background: "#071a2e",
          color: "#eaf4ff",
          border: "1px solid #173653",
          boxShadow: "0 8px 25px rgba(0,0,0,0.18)",
        }}
      >
        <div
          className="section-heading flood-history-heading"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p className="eyebrow" style={{ color: "#16b8e5" }}>HISTORICAL DATA</p>
            <h3 style={{ color: "#f1f7ff" }}>Flood-Depth History</h3>
            <p className="section-description flood-history-description" style={{ color: "#9bb3cc" }}>
              View the selected node's recorded flood depth throughout the day.
            </p>
          </div>

          <div className="flood-history-filters" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <label
              htmlFor="flood-history-node"
              style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "210px", fontSize: "13px", color: "#a9bfd5" }}
            >
              Select monitoring node
              <select
                id="flood-history-node"
                value={selectedNodeKey}
                onChange={(event) => {
                  setSelectedHistoryDate("");
                  setSelectedNodeKey(event.target.value);
                }}
                disabled={safeNodes.length === 0}
                style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #29445f", background: "#10243a", color: "#eaf4ff", font: "inherit" }}
              >
                {safeNodes.map((node) => (
                  <option key={node.firebaseKey || node.id} value={node.firebaseKey || node.id}>
                    {NODE_NAMES[node.id] || node.location || node.id}
                  </option>
                ))}
              </select>
            </label>

            <label
              htmlFor="flood-history-date"
              style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "155px", fontSize: "13px", color: "#a9bfd5" }}
            >
              Select date
              <input
                id="flood-history-date"
                className="flood-history-control"
                type="date"
                value={selectedHistoryDate}
                onChange={(event) => setSelectedHistoryDate(event.target.value)}
                style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #29445f", background: "#10243a", color: "#eaf4ff", colorScheme: "dark", font: "inherit" }}
              />
            </label>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", margin: "18px 0 10px" }}>
          <label htmlFor="flood-history-interval" style={{ fontSize: "13px", fontWeight: 600, color: "#a9bfd5" }}>
            Display interval
          </label>
          <select
            id="flood-history-interval"
            className="flood-history-control"
            value={historyInterval}
            onChange={(event) => setHistoryInterval(event.target.value)}
            style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid #29445f", background: "#10243a", color: "#eaf4ff", font: "inherit" }}
          >
            <option value="30m">Per 30 Minutes</option>
            <option value="1h">Per Hour</option>
            <option value="3h">Per 3 Hours</option>
          </select>
         
        </div>

        {historyLoading && (
          <div className="firebase-message" style={{ background: "#10243a", color: "#d8e8f7", border: "1px solid #29445f" }}>
            Loading historical flood readings...
          </div>
        )}

        {historyError && (
          <div className="firebase-message firebase-error">{historyError}</div>
        )}

        {!historyLoading && !historyError && historyReadings.length === 0 && (
          <div className="firebase-message" style={{ background: "#10243a", color: "#d8e8f7", border: "1px solid #29445f" }}>
            No historical flood-depth readings are available for this node yet.
          </div>
        )}

        {!historyLoading && !historyError && historyReadings.length > 0 && selectedDayReadings.length === 0 && (
          <div className="firebase-message" style={{ background: "#10243a", color: "#d8e8f7", border: "1px solid #29445f" }}>
            No readings were recorded for {selectedHistoryDate || "the selected date"}. Choose another date to view its history.
          </div>
        )}

        {!historyLoading && !historyError && selectedDayReadings.length > 0 && (
          <>
            

            <div className="flood-history-chart-scroll" role="region" aria-label="Flood depth chart; scroll horizontally to view all time slots">
              <div className="flood-history-chart-inner" style={{ width: `max(100%, ${Math.max(760, chartReadings.length * 42)}px)` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartReadings} margin={{ top: 14, right: 24, bottom: 48, left: 12 }}>
                    <CartesianGrid stroke="#29445f" strokeDasharray="4 5" />
                    <XAxis
                      type="category"
                      dataKey="timeLabel"
                      interval={0}
                      tick={{ fontSize: 10, fill: "#9bb3cc" }}
                      tickLine={{ stroke: "#45617d" }}
                      axisLine={{ stroke: "#45617d" }}
                      angle={-45}
                      textAnchor="end"
                      height={68}
                      label={{ value: "Time", position: "insideBottom", offset: -42, fill: "#9bb3cc", fontSize: 12 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="waterLevel"
                      domain={["auto", "auto"]}
                      width={68}
                      tick={{ fontSize: 11, fill: "#9bb3cc" }}
                      tickLine={{ stroke: "#45617d" }}
                      axisLine={{ stroke: "#45617d" }}
                      label={{ value: "Flood Depth (ft)", angle: -90, position: "insideLeft", fill: "#9bb3cc", fontSize: 12 }}
                    />
                    <Tooltip
                      labelStyle={{ color: "#eaf4ff" }}
                      contentStyle={{ background: "#10243a", border: "1px solid #29445f", borderRadius: "10px", color: "#eaf4ff" }}
                      itemStyle={{ color: "#7dddf5" }}
                      formatter={(value, name, item) => value == null ? ["No recorded reading", "Flood depth"] : [`${Number(value).toFixed(3)} ft (${item.payload.readingCount} reading${item.payload.readingCount === 1 ? "" : "s"})`, "Average flood depth"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="waterLevel"
                      name="Average flood depth"
                      stroke="#16b8e5"
                      strokeWidth={2.8}
                      dot={{ r: 3, fill: "#16b8e5", stroke: "#0b1e32", strokeWidth: 1 }}
                      activeDot={{ r: 6, fill: "#7dddf5", stroke: "#eaf4ff", strokeWidth: 2 }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <p className="flood-history-footnote" style={{ marginTop: "10px", color: "#829bb5", fontSize: "12px" }}>
              Empty intervals are left blank. Values are averaged from actual Firebase readings and converted from cm to ft. Scroll horizontally to view all time labels.
            </p>
          </>
        )}
      </section>

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