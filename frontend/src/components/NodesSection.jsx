import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../firebase/firebaseConfig";


// ==========================================
// FLOOD LEVEL CLASSIFICATION
// ==========================================
// Firebase stores flood level in centimeters.
// The classification remains based on cm.
//
// 0 - 10 cm     = Normal
// >10 - 25 cm   = Caution
// >25 - 50 cm   = Warning
// >50 cm        = Critical
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

  return Math.min(
    Math.max(percentage, 0),
    100
  );
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

  // Firebase field is still called waterLevel.
  // It is stored in centimeters.
  const floodLevel = Number(
    node.waterLevel ?? 0
  );

  const pressure = Number(
    node.pressure ?? 0
  );

  const battery = Number(
    node.battery ?? 0
  );

  const status =
    node.status ?? "offline";


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
  const floodLevelFeet =
    cmToFeet(floodLevel);


  // ----------------------------------------
  // FLOOD LEVEL PROGRESS BAR
  //
  // 60 cm is considered 100% of the
  // progress bar.
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


  return (
    <article
      className={`node-card node-${flood.className}`}
    >

      {/* ==================================
          NODE HEADER
      ================================== */}
      <div className="node-card-top">

        <div>

          <span className="node-id">
            {node.id}
          </span>

          <h4>
            {node.location}
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
// NODES SECTION
// ==========================================
function NodesSection() {

  const [nodes, setNodes] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);


  // ========================================
  // FIREBASE REAL-TIME LISTENER
  // ========================================
  useEffect(() => {

    const nodesRef =
      ref(database, "nodes");


    const unsubscribe = onValue(
      nodesRef,

      (snapshot) => {

        if (snapshot.exists()) {

          const rawData =
            snapshot.val();

          const latestNodesArray = [];


          // ==================================
          // LOOP THROUGH EACH NODE
          // ==================================
          for (
            const [nodeKey, nodeHistory]
            of Object.entries(rawData)
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
              // NORMALIZE FIREBASE DATA
              // =================================
              latestNodesArray.push({

                ...latestEntry,

                // Firebase node key
                firebaseKey:
                  nodeKey,

                // Node ID
                id:
                  latestEntry.id ||
                  nodeKey,

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

                // Use Firebase location if
                // available.
                //
                // Otherwise create a fallback.
                location:
                  latestEntry.location ||
                  `Location ${nodeKey}`,
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

    </section>

  );
}


export default NodesSection;