import { useEffect, useMemo, useState } from "react";
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
  "node-01": "Leon Guinto St. Corner, Quirino Avenue Westbound Lane",
  "node-02": "Leon Guinto St. Corner, Quirino Avenue Eastbound Lane",
  "node-03": "Taft Avenue (Northbound), Malate, Manila",
  "node-04": "Taft Avenue (Southbound), Malate, Manila",
  "node-05": "1004 Taft Avenue (Southbound), Malate, Manila",
  "node-06": "1000 Ermita, Manila",
};

// Always show the configured node cards, even when a device has not sent data.
const CONFIGURED_NODE_IDS = Object.keys(NODE_NAMES);

function normalizeNodeId(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  const match = raw.match(/node[-_ ]?0*(\d+)/);
  return match
    ? `node-${String(Number(match[1])).padStart(2, "0")}`
    : raw;
}

function toMilliseconds(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
  return numericValue < 1_000_000_000_000
    ? numericValue * 1000
    : numericValue;
}

// ==========================================
// ONLINE / OFFLINE DETECTION
// ==========================================
// A node is ONLINE only when it has sent data recently.
// We no longer trust the stored "status" string alone, because:
//  - a dead device never rewrites "online" (stale "online" stays forever)
//  - firmware may send true / 1 / "connected" / "active" instead of "online"
//  - firmware may send no status field at all
//
// Set this to a little more than your ESP32's upload interval.
// (e.g. node uploads every 1 min -> 3-5 min is a safe value)
const ONLINE_TIMEOUT_MS = 5 * 60 * 1000;

// false = trust the "status" value stored in Firebase (matches Firebase console).
// true  = ALSO require a recent timestamp, so a dead device whose last record
//         still says "online" (like node-03 / node-04, last data in July)
//         is shown as Offline.
const USE_FRESHNESS_CHECK = false;

const ONLINE_WORDS = ["online", "connected", "active", "up", "ok", "true", "1"];
const OFFLINE_WORDS = ["offline", "disconnected", "inactive", "down", "false", "0"];

function parseReportedStatus(value) {
  if (value === true || value === 1) return "online";
  if (value === false || value === 0) return "offline";
  const text = String(value ?? "").trim().toLowerCase();
  if (ONLINE_WORDS.includes(text)) return "online";
  if (OFFLINE_WORDS.includes(text)) return "offline";
  return "unknown"; // field missing or unrecognised
}

function resolveNodeStatus(node, now) {
  if (USE_FRESHNESS_CHECK) {
    const age = node.timestamp ? now - node.timestamp : Infinity;
    if (age > ONLINE_TIMEOUT_MS) return "offline";
  }
  return node.reportedStatus === "online" ? "online" : "offline";
}

function looksLikeSensorReading(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    [
      "waterLevel", "water_level", "floodLevel",
      "pressure", "pressureHpa", "battery",
      "batteryVoltage", "voltage", "status", "timestamp",
    ].some((field) => value[field] !== undefined)
  );
}

// Firebase keys written by firmware sometimes contain typos such as
// "status:" or "status: " (extra colon / space). Clean them so they are
// read as "status".
function cleanKeys(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return record;
  const cleaned = {};
  for (const [key, value] of Object.entries(record)) {
    const cleanKey = key.trim().replace(/[:\s]+$/, "");
    // Never let a typo'd key overwrite a correctly spelled one.
    if (!(cleanKey in cleaned) || cleanKey === key) cleaned[cleanKey] = value;
  }
  return cleaned;
}

function getLatestReading(nodeData) {
  if (!nodeData || typeof nodeData !== "object") return null;

  // A node may contain one direct sensor object or multiple historical records.
  const direct = cleanKeys(nodeData);
  if (looksLikeSensorReading(direct)) return direct;

  const records = Object.values(nodeData).map(cleanKeys).filter(looksLikeSensorReading);
  if (!records.length) return null;

  return records.reduce((latest, current) => {
    const currentTime = toMilliseconds(current.timestamp) || 0;
    const latestTime = toMilliseconds(latest.timestamp) || 0;
    return currentTime >= latestTime ? current : latest;
  });
}

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
function getFloodInformation(floodLevel, status, hasReading = true) {
  if (status !== "online") {
    return {
      label: "Offline",
      className: "offline",
      description: "Sensor data unavailable",
    };
  }

  if (!hasReading || !Number.isFinite(Number(floodLevel))) {
    return {
      label: "No reading",
      className: "offline",
      description: "Waiting for a valid flood-depth reading from Firebase",
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
  if (!timestamp || !Number.isFinite(Number(timestamp))) {
    return "No recent data";
  }

  const date = new Date(Number(timestamp));
  return Number.isNaN(date.getTime())
    ? "No recent data"
    : date.toLocaleString();
}

// ==========================================
// NODE CARD
// ==========================================
function NodeCard({ node }) {
  // ----------------------------------------
  // GET DATA FROM FIREBASE
  // ----------------------------------------

  const floodLevel = node.waterLevel === null || node.waterLevel === undefined
    ? null
    : Number(node.waterLevel);
  const pressure = node.pressure === null || node.pressure === undefined
    ? null
    : Number(node.pressure);
  const battery = node.battery === null || node.battery === undefined
    ? null
    : Number(node.battery);

  const hasFloodReading = floodLevel !== null && Number.isFinite(floodLevel);
  const hasPressureReading = pressure !== null && Number.isFinite(pressure);
  const hasBatteryReading = battery !== null && Number.isFinite(battery);
  const status = node.status === "online" ? "online" : "offline";

  // Flood classification is only possible when Firebase supplied a valid reading.
  const flood = getFloodInformation(floodLevel, status, hasFloodReading);
  const floodLevelFeet = hasFloodReading ? cmToFeet(floodLevel) : null;

  // ----------------------------------------
  // FLOOD LEVEL PROGRESS BAR
  //
  // 60 cm = 1.97 ft
  // 60 cm is considered 100%.
  // ----------------------------------------
  const floodPercentage =
    status === "online" && hasFloodReading
      ? Math.min((floodLevel / 60) * 100, 100)
      : 0;

  // ----------------------------------------
  // BATTERY PERCENTAGE
  // ----------------------------------------
  const batteryPercent =
    status === "online" && hasBatteryReading
      ? batteryPercentage(battery)
      : null;

  // ----------------------------------------
  // GET NODE DISPLAY NAME
  // ----------------------------------------
  const nodeName =
    node.location ||
    NODE_NAMES[node.id] ||
    `Location ${node.id}`;

  return (
    <article
      className={`node-card node-${flood.className}`}
    >
      {/* ==================================
          NODE HEADER
      ================================== */}
      <div
        className="node-card-top"
        style={{ minWidth: 0, width: "100%", overflow: "visible" }}
      >

        {/* ==================================
            NODE TITLE / LOCATION
        ================================== */}
        <div
          className="node-title-container"
          style={{ minWidth: 0, width: "100%", flex: "1 1 auto" }}
        >

          <span className="node-id">
            {node.id}
          </span>

          <h4
            className="node-location-name"
            style={{
              textTransform: "none",
              whiteSpace: "normal",
              overflowWrap: "anywhere",
              wordBreak: "normal",
              maxWidth: "100%",
              lineHeight: 1.25,
            }}
          >
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
            {status === "online" && hasFloodReading
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
            {status === "online" && hasPressureReading
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
            {status === "online" && hasBatteryReading
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
  const [rawNodes, setRawNodes] = useState([]);

  // Re-evaluate online/offline every 15 s so a node that stops sending
  // flips to Offline even when Firebase itself has no new data.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const nodes = useMemo(
    () =>
      rawNodes.map((node) => {
        const status = resolveNodeStatus(node, now);
        return { ...node, status };
      }),
    [rawNodes, now]
  );

  // Debug helper: open the browser console to see why a node is Offline.
  useEffect(() => {
    if (!rawNodes.length) return;
    console.table(
      nodes.map((n) => ({
        node: n.id,
        firebaseKey: n.firebaseKey,
        reportedStatus: n.reportedStatus,
        lastUpdate: n.timestamp ? new Date(n.timestamp).toLocaleString() : "none",
        ageMinutes: n.timestamp ? ((now - n.timestamp) / 60000).toFixed(1) : "n/a",
        resolved: n.status,
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawNodes]);

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

          // Read each Firebase node. This supports both:
          // 1. nodes/node-01/{recordId}: timestamped history records
          // 2. nodes/{recordId}: records containing an id such as "node-01"
          const recordsByNodeId = new Map();

          for (const [firebaseKey, nodeData] of Object.entries(rawData || {})) {
            const latestEntry = getLatestReading(nodeData);
            if (!latestEntry) continue;

            const nodeId = normalizeNodeId(latestEntry.id || firebaseKey);
            if (!CONFIGURED_NODE_IDS.includes(nodeId)) continue;

            const existing = recordsByNodeId.get(nodeId);
            const newTimestamp = toMilliseconds(latestEntry.timestamp) || 0;
            const oldTimestamp = toMilliseconds(existing?.reading?.timestamp) || 0;

            if (!existing || newTimestamp >= oldTimestamp) {
              recordsByNodeId.set(nodeId, { firebaseKey, reading: latestEntry });
            }
          }

          // Build only the six configured place cards. A node without
          // an actual Firebase record remains visible and is marked Offline.
          for (const nodeId of CONFIGURED_NODE_IDS) {
            const matched = recordsByNodeId.get(nodeId);
            const reading = matched?.reading || {};
            const reportedStatus = parseReportedStatus(
              reading.status ?? reading.connection ?? reading.state ?? reading.online
            );

            latestNodesArray.push({
              ...reading,
              id: nodeId,
              firebaseKey: matched?.firebaseKey || nodeId,
              waterLevel:
                reading.waterLevel ?? reading.water_level ?? reading.floodLevel ?? null,
              pressure:
                reading.pressure ?? reading.pressureHpa ?? null,
              battery:
                reading.battery ?? reading.batteryVoltage ?? reading.voltage ?? null,
              reportedStatus,
              status: "offline", // real value is computed by resolveNodeStatus()
              timestamp: toMilliseconds(reading.timestamp),
              location: reading.location ?? NODE_NAMES[nodeId],
            });
          }

          // ----------------------------------
          // UPDATE REACT STATE
          // ----------------------------------
          setRawNodes(
            latestNodesArray
          );

          // Select the first available node for the history graph.
          setSelectedNodeKey((currentKey) => {
            const currentStillExists = latestNodesArray.some(
              (node) => node.firebaseKey === currentKey
            );
            return currentStillExists
              ? currentKey
              : latestNodesArray[0]?.firebaseKey || "";
          });

        } else {
          // No records yet: still render all configured nodes as Offline.
          setRawNodes(
            CONFIGURED_NODE_IDS.map((nodeId) => ({
              id: nodeId,
              firebaseKey: nodeId,
              location: NODE_NAMES[nodeId],
              status: "offline",
              waterLevel: null,
              pressure: null,
              battery: null,
              timestamp: null,
            }))
          );
          setSelectedNodeKey(CONFIGURED_NODE_IDS[0] || "");
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
        setRawNodes(
          CONFIGURED_NODE_IDS.map((nodeId) => ({
            id: nodeId, firebaseKey: nodeId, location: NODE_NAMES[nodeId],
            status: "offline", waterLevel: null, pressure: null, battery: null, timestamp: null,
          }))
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

        const historyEntries = looksLikeSensorReading(rawHistory)
          ? [["latest", rawHistory]]
          : Object.entries(rawHistory);

        const readings = historyEntries
          .map(([recordKey, reading]) => {
            if (!reading || typeof reading !== "object") {
              return null;
            }

            const rawTimestamp = Number(reading.timestamp);
            const waterLevel = Number(
              reading.waterLevel ?? reading.water_level ?? reading.floodLevel
            );

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
  // Display ONLY the six configured place cards (node-01 through node-06).
  // This also prevents old node-07 to node-10 Firebase records from appearing.
  const safeNodes =
    Array.isArray(nodes)
      ? nodes
          .filter((node) =>
            CONFIGURED_NODE_IDS.includes(normalizeNodeId(node?.id))
          )
          .slice(0, 6)
      : [];

  // Use the newest actual Firebase sensor reading for the overview.
  // Do not substitute demo values when no reading is available.
  const currentNode = safeNodes
    .filter((node) =>
      node.status === "online" &&
      node.waterLevel !== null &&
      node.waterLevel !== undefined &&
      Number.isFinite(Number(node.waterLevel))
    )
    .sort((a, b) =>
      (toMilliseconds(b.timestamp) || 0) - (toMilliseconds(a.timestamp) || 0)
    )[0] || null;

  const currentFloodLevelCm = currentNode ? Number(currentNode.waterLevel) : null;
  const currentFloodLevelFt = currentFloodLevelCm === null
    ? null
    : cmToFeet(currentFloodLevelCm);
  const currentFlood = currentNode
    ? getFloodInformation(currentFloodLevelCm, currentNode.status)
    : null;
  const firebaseConnectionLabel = error
    ? "Connection error"
    : loading
      ? "Connecting..."
      : "Connected";

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
          node.waterLevel === null || node.waterLevel === undefined ? null : Number(node.waterLevel),
          node.status,
          node.waterLevel !== null && node.waterLevel !== undefined && Number.isFinite(Number(node.waterLevel))
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
          node.waterLevel === null || node.waterLevel === undefined ? null : Number(node.waterLevel),
          node.status,
          node.waterLevel !== null && node.waterLevel !== undefined && Number.isFinite(Number(node.waterLevel))
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
                    {node.location || NODE_NAMES[node.id] || node.id}
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
            

<div className="flood-history-chart-scroll">
  <div className="flood-history-chart-inner">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
  data={chartReadings}
  margin={{ top: 14, right: 15, bottom: 25, left: 5 }}
>
                    <CartesianGrid stroke="#29445f" strokeDasharray="4 5" />
  <XAxis
  type="category"
  dataKey="timeLabel"
  interval={
    historyInterval === "30m" ? 5 :
    historyInterval === "1h" ? 2 :
    0
  }
  tickFormatter={(value) => value.replace(":00", "")}
  tick={{ fontSize: 10, fill: "#9bb3cc" }}
  tickLine={{ stroke: "#45617d" }}
  axisLine={{ stroke: "#45617d" }}
  angle={-35}
  textAnchor="end"
  height={55}
  padding={{ left: 10, right: 10 }}
  minTickGap={8}
/>
  <YAxis
  domain={[0, 3]}
  ticks={[0, 0.5, 1, 1.5, 2, 2.5, 3]}
  interval={0}
  allowDecimals={true}
  label={{
    value: "Flood Depth (ft)",
    angle: -90,
    position: "insideLeft",
  }}
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
                <div
                  className="water-fill"
                  style={{
                    height: currentFloodLevelCm === null
                      ? "0%"
                      : `${Math.min((currentFloodLevelCm / 60) * 100, 100)}%`,
                  }}
                />
                <span>
                  {currentFloodLevelFt === null
                    ? "-- ft"
                    : `${currentFloodLevelFt.toFixed(2)} ft`}
                </span>
              </div>
            </div>

            <div className="current-level-content">
              <p className="eyebrow">CURRENT FLOOD LEVEL</p>
              <h4>
                {currentNode
                  ? `${currentFloodLevelFt.toFixed(2)} ft`
                  : "No Firebase reading available"}
              </h4>
              <p>
                {currentNode
                  ? `${NODE_NAMES[currentNode.id] || currentNode.location || currentNode.id} · Latest reading from ${currentNode.id}.`
                  : "No online node with a valid flood-depth reading is currently available."}
              </p>
              <span className="level-status-badge">
                {currentFlood ? currentFlood.label : "Waiting for Firebase data"}
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
          Values below are read from the latest Firebase
          node record. Missing fields are shown as "--".
      ================================================= */}
      <section
        id="device"
        className="page-section"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">DEVICE INFORMATION</p>
            <h3>
              {currentNode ? `${currentNode.id} monitoring unit` : "Monitoring unit"}
            </h3>
          </div>

          <span className={currentNode ? "online-badge" : "offline-badge"}>
            {currentNode ? "Online" : "No active reading"}
          </span>
        </div>

        <div className="device-grid">
          <article className="device-information-card">
            <div className="information-row">
              <span>Device ID</span>
              <strong>{currentNode?.deviceId ?? currentNode?.id ?? "--"}</strong>
            </div>

            <div className="information-row">
              <span>Sensor</span>
              <strong>{currentNode?.sensor ?? "--"}</strong>
            </div>

            <div className="information-row">
              <span>Communication</span>
              <strong>{currentNode?.communication ?? "--"}</strong>
            </div>

            <div className="information-row">
              <span>Last update</span>
              <strong>
                {currentNode?.timestamp
                  ? formatLastUpdate(currentNode.timestamp)
                  : "--"}
              </strong>
            </div>

            <div className="information-row">
              <span>Firebase status</span>
              <strong>{firebaseConnectionLabel}</strong>
            </div>
          </article>

          <article className="device-condition-card">
            <span className="device-icon">ESP</span>
            <div>
              <p className="eyebrow">DEVICE CONDITION</p>
              <h4>
                {currentNode
                  ? "Firebase node is reporting online"
                  : "No active node reading"}
              </h4>
              <p>
                {currentNode
                  ? "The displayed monitoring values are taken from the latest available Firebase sensor record."
                  : "The interface is waiting for an online node and a valid sensor reading from Firebase."}
              </p>
            </div>
          </article>
        </div>
      </section>

    </section>
  );
}

export default NodesSection;