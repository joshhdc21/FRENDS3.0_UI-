import { useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { onValue, ref } from "firebase/database";

import { auth, database } from "../firebase/firebaseConfig";
import "./AdminDashboard.css";

// =========================================================
// FLOOD LEVEL CLASSIFICATION
// =========================================================

function getFloodStatus(waterLevel) {
  const level = Number(waterLevel);

  if (level >= 30) {
    return {
      label: "CRITICAL",
      className: "flood-critical",
    };
  }

  if (level >= 20) {
    return {
      label: "HIGH",
      className: "flood-high",
    };
  }

  if (level >= 10) {
    return {
      label: "MODERATE",
      className: "flood-moderate",
    };
  }

  return {
    label: "NORMAL",
    className: "flood-normal",
  };
}

// =========================================================
// BATTERY VOLTAGE TO PERCENTAGE
//
// 7.4 V = 100%
// 6.0 V = 0%
// =========================================================

function batteryPercentage(voltage) {
  const FULL_VOLTAGE = 7.4;
  const EMPTY_VOLTAGE = 6.0;

  const numericVoltage = Number(voltage);

  if (!Number.isFinite(numericVoltage)) {
    return 0;
  }

  const percentage =
    ((numericVoltage - EMPTY_VOLTAGE) /
      (FULL_VOLTAGE - EMPTY_VOLTAGE)) *
    100;

  return Math.min(
    Math.max(percentage, 0),
    100
  );
}

// =========================================================
// NORMALIZE NODE STATUS
// =========================================================

function normalizeNodeStatus(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "offline";
  }

  if (typeof value === "boolean") {
    return value
      ? "online"
      : "offline";
  }

  if (typeof value === "number") {
    return value === 1
      ? "online"
      : "offline";
  }

  const status = String(value)
    .trim()
    .toLowerCase();

  if (
    status === "online" ||
    status === "active" ||
    status === "connected" ||
    status === "true" ||
    status === "1" ||
    status === "open"
  ) {
    return "online";
  }

  if (
    status === "offline" ||
    status === "inactive" ||
    status === "disconnected" ||
    status === "false" ||
    status === "0" ||
    status === "closed"
  ) {
    return "offline";
  }

  return "offline";
}

// =========================================================
// GET LATEST READING
// =========================================================

function getLatestReading(nodeHistory) {
  if (
    !nodeHistory ||
    typeof nodeHistory !== "object"
  ) {
    return null;
  }

  const entries = Object.values(
    nodeHistory
  ).filter(
    (entry) =>
      entry &&
      typeof entry === "object"
  );

  if (entries.length === 0) {
    return null;
  }

  const sortedEntries = [...entries].sort(
    (a, b) =>
      Number(b.timestamp || 0) -
      Number(a.timestamp || 0)
  );

  return sortedEntries[0];
}

// =========================================================
// FORMAT LAST UPDATE
// =========================================================

function formatLastUpdate(timestamp) {
  if (
    timestamp === null ||
    timestamp === undefined ||
    timestamp === ""
  ) {
    return "No recent data";
  }

  const numericTimestamp =
    Number(timestamp);

  let date;

  if (
    Number.isFinite(
      numericTimestamp
    )
  ) {
    date = new Date(
      numericTimestamp * 1000
    );
  } else {
    date = new Date(timestamp);
  }

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(timestamp);
  }

  return date.toLocaleString();
}

// =========================================================
// ADMIN DASHBOARD
// =========================================================

function AdminDashboard() {

  // =======================================================
  // STATE
  // =======================================================

  const [activePage, setActivePage] =
    useState("dashboard");

  const [users, setUsers] =
    useState([]);

  const [nodes, setNodes] =
    useState([]);

  const [usersLoading, setUsersLoading] =
    useState(true);

  const [nodesLoading, setNodesLoading] =
    useState(true);

  const [userSearch, setUserSearch] =
    useState("");

  const [nodeSearch, setNodeSearch] =
    useState("");

  const [databaseConnected, setDatabaseConnected] =
    useState(false);

  // =======================================================
  // LOAD ACCOUNTS
  //
  // Firebase path remains:
  // users
  //
  // The interface simply treats them as ACCOUNTS.
  // =======================================================

  useEffect(() => {

    if (!database) {

      console.error(
        "Firebase database is not initialized."
      );

      setUsersLoading(false);
      setDatabaseConnected(false);

      return;
    }

    const usersRef =
      ref(database, "users");

    const unsubscribe =
      onValue(
        usersRef,
        (snapshot) => {

          const data =
            snapshot.val();

          console.log(
            "================================="
          );

          console.log(
            "FIREBASE ACCOUNTS DATA"
          );

          console.log(data);

          console.log(
            "================================="
          );

          if (!data) {

            setUsers([]);
            setUsersLoading(false);
            setDatabaseConnected(true);

            return;
          }

          const accountList =
            Object.entries(data).map(
              ([uid, account]) => ({

                uid,

                name:
                  account?.name ||
                  account?.displayName ||
                  account?.fullName ||
                  "Unnamed Account",

                email:
                  account?.email ||
                  "No email",

                status:
                  account?.status ||
                  "active",

                createdAt:
                  account?.createdAt ||
                  null,

              })
            );

          setUsers(accountList);

          setUsersLoading(false);

          setDatabaseConnected(true);

        },
        (error) => {

          console.error(
            "Accounts Firebase error:",
            error
          );

          setUsersLoading(false);
          setDatabaseConnected(false);

        }
      );

    return () =>
      unsubscribe();

  }, []);

  // =======================================================
  // LOAD FLOOD NODES
  // =======================================================

  useEffect(() => {

    if (!database) {

      console.error(
        "Firebase database is not initialized."
      );

      setNodesLoading(false);
      setDatabaseConnected(false);

      return;
    }

    const nodesRef =
      ref(database, "nodes");

    const unsubscribe =
      onValue(
        nodesRef,
        (snapshot) => {

          const rawData =
            snapshot.val();

          console.log(
            "================================="
          );

          console.log(
            "FIREBASE RAW NODES DATA"
          );

          console.log(rawData);

          console.log(
            "================================="
          );

          if (
            !snapshot.exists() ||
            !rawData
          ) {

            setNodes([]);

            setNodesLoading(false);

            setDatabaseConnected(true);

            return;
          }

          const latestNodesArray = [];

          // -----------------------------------------------
          // LOOP THROUGH EACH NODE
          // -----------------------------------------------

          for (
            const [
              nodeKey,
              nodeHistory,
            ] of Object.entries(rawData)
          ) {

            if (
              !nodeHistory ||
              typeof nodeHistory !==
                "object"
            ) {
              continue;
            }

            // ---------------------------------------------
            // GET LATEST READING
            // ---------------------------------------------

            const latestEntry =
              getLatestReading(
                nodeHistory
              );

            if (!latestEntry) {
              continue;
            }

            // ---------------------------------------------
            // STATUS
            // ---------------------------------------------

            const rawStatus =
              latestEntry.status ??
              latestEntry.connectionStatus ??
              latestEntry.online ??
              latestEntry.active ??
              null;

            const status =
              normalizeNodeStatus(
                rawStatus
              );

            const isActive =
              status === "online";

            // ---------------------------------------------
            // WATER LEVEL
            // ---------------------------------------------

            let waterLevel =
              latestEntry.waterLevel ??
              latestEntry.water_level ??
              latestEntry.depth ??
              0;

            waterLevel =
              Number(waterLevel);

            if (
              !Number.isFinite(
                waterLevel
              )
            ) {
              waterLevel = 0;
            }

            // ---------------------------------------------
            // PRESSURE
            // ---------------------------------------------

            let pressure =
              latestEntry.pressure ??
              0;

            pressure =
              Number(pressure);

            if (
              !Number.isFinite(
                pressure
              )
            ) {
              pressure = 0;
            }

            // ---------------------------------------------
            // BATTERY
            // ---------------------------------------------

            let battery =
              latestEntry.battery ??
              latestEntry.batteryVoltage ??
              0;

            battery =
              Number(battery);

            if (
              !Number.isFinite(
                battery
              )
            ) {
              battery = 0;
            }

            // ---------------------------------------------
            // BATTERY PERCENTAGE
            // ---------------------------------------------

            const batteryPercent =
              isActive
                ? batteryPercentage(
                    battery
                  )
                : 0;

            // ---------------------------------------------
            // TIMESTAMP
            // ---------------------------------------------

            const timestamp =
              latestEntry.timestamp
                ? Number(
                    latestEntry.timestamp
                  )
                : null;

            // ---------------------------------------------
            // NORMALIZED NODE
            // ---------------------------------------------

            const normalizedNode = {

              firebaseKey:
                nodeKey,

              nodeId:
                latestEntry.id ||
                nodeKey,

              id:
                latestEntry.id ||
                nodeKey,

              location:
                latestEntry.location ||
                `Location ${nodeKey}`,

              waterLevel,

              pressure,

              battery,

              batteryPercent,

              status,

              isActive,

              timestamp,

              lastUpdate:
                timestamp,

              latitude:
                latestEntry.latitude ??
                null,

              longitude:
                latestEntry.longitude ??
                null,

            };

            latestNodesArray.push(
              normalizedNode
            );
          }

          console.log(
            "================================="
          );

          console.log(
            "NORMALIZED ADMIN FLOOD NODES"
          );

          console.log(
            latestNodesArray
          );

          console.log(
            "TOTAL:",
            latestNodesArray.length
          );

          console.log(
            "ACTIVE:",
            latestNodesArray.filter(
              (node) =>
                node.isActive === true
            ).length
          );

          console.log(
            "INACTIVE:",
            latestNodesArray.filter(
              (node) =>
                node.isActive !== true
            ).length
          );

          console.log(
            "================================="
          );

          setNodes(
            latestNodesArray
          );

          setNodesLoading(false);

          setDatabaseConnected(true);

        },
        (error) => {

          console.error(
            "Flood nodes Firebase error:",
            error
          );

          setNodesLoading(false);

          setDatabaseConnected(false);

        }
      );

    return () =>
      unsubscribe();

  }, []);

  // =======================================================
  // LOGOUT
  // =======================================================

  async function handleLogout() {

    try {

      await signOut(auth);

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    }

  }

  // =======================================================
  // ACCOUNT STATISTICS
  // =======================================================

  const totalAccounts =
    users.length;

  // =======================================================
  // NODE STATISTICS
  // =======================================================

  const totalNodes =
    nodes.length;

  const activeNodes =
    nodes.filter(
      (node) =>
        node.isActive === true
    ).length;

  const inactiveNodes =
    nodes.filter(
      (node) =>
        node.isActive !== true
    ).length;

  // =======================================================
  // LOW BATTERY
  // =======================================================

  const lowBatteryNodes =
    nodes.filter(
      (node) =>
        node.isActive === true &&
        Number(node.batteryPercent) <=
          20
    ).length;

  // =======================================================
  // ACTIVE NODES WITH BATTERY
  // =======================================================

  const activeNodesWithBattery =
    nodes.filter(
      (node) =>
        node.isActive === true &&
        Number.isFinite(
          Number(
            node.batteryPercent
          )
        )
    );

  // =======================================================
  // AVERAGE BATTERY
  // =======================================================

  const averageBattery =
    activeNodesWithBattery.length >
    0
      ? Math.round(
          activeNodesWithBattery.reduce(
            (
              total,
              node
            ) =>
              total +
              Number(
                node.batteryPercent
              ),
            0
          ) /
            activeNodesWithBattery.length
        )
      : 0;

  // =======================================================
  // CRITICAL FLOOD
  // =======================================================

  const criticalNodes =
    nodes.filter(
      (node) =>
        node.isActive === true &&
        Number(
          node.waterLevel
        ) >= 30
    ).length;

  // =======================================================
  // WARNING FLOOD
  // =======================================================

  const warningNodes =
    nodes.filter(
      (node) => {

        if (
          node.isActive !== true
        ) {
          return false;
        }

        const level =
          Number(
            node.waterLevel
          );

        return (
          level > 25
        );

      }
    ).length;

  // =======================================================
  // SEARCH ACCOUNTS
  // =======================================================

  const filteredUsers =
    useMemo(() => {

      const search =
        userSearch
          .trim()
          .toLowerCase();

      if (!search) {
        return users;
      }

      return users.filter(
        (user) =>
          String(user.name)
            .toLowerCase()
            .includes(search) ||
          String(user.email)
            .toLowerCase()
            .includes(search) ||
          String(user.status)
            .toLowerCase()
            .includes(search)
      );

    }, [
      users,
      userSearch,
    ]);

  // =======================================================
  // SEARCH NODES
  // =======================================================

  const filteredNodes =
    useMemo(() => {

      const search =
        nodeSearch
          .trim()
          .toLowerCase();

      if (!search) {
        return nodes;
      }

      return nodes.filter(
        (node) =>
          String(node.nodeId)
            .toLowerCase()
            .includes(search) ||
          String(node.location)
            .toLowerCase()
            .includes(search)
      );

    }, [
      nodes,
      nodeSearch,
    ]);

  // =======================================================
  // BATTERY CLASS
  // =======================================================

  function getBatteryClass(
    battery
  ) {

    const value =
      Number(battery);

    if (value <= 20) {
      return "battery-critical";
    }

    if (value <= 40) {
      return "battery-low";
    }

    return "battery-good";

  }

  // =======================================================
  // DASHBOARD
  // =======================================================

  function renderDashboard() {

    return (
      <>

        {/* =================================================
            WELCOME
        ================================================= */}

        <section className="admin-welcome">

          <div>

            <p className="admin-label">
              ADMIN DASHBOARD
            </p>

            <h2>
              Welcome, Administrator
            </h2>

            <p>
              Manage and monitor the
              FRENDS flood and traffic
              monitoring system.
            </p>

          </div>

          <div className="admin-status">

            <span
              className={
                databaseConnected
                  ? "status-dot"
                  : "status-dot offline"
              }
            />

            {databaseConnected
              ? "System Online"
              : "Connecting..."}

          </div>

        </section>

        {/* =================================================
            OVERVIEW
        ================================================= */}

        <section className="admin-overview">

          {/* FLOOD NODES */}

          <button
            type="button"
            className="admin-card admin-card-button"
            onClick={() =>
              setActivePage("nodes")
            }
          >

            <div className="admin-card-icon">
              💧
            </div>

            <div className="admin-card-info">

              <span>
                FLOOD NODES
              </span>

              <strong>
                {totalNodes}
              </strong>

              <small>
                {activeNodes} active ·{" "}
                {inactiveNodes} inactive
              </small>

            </div>

          </button>

          {/* TRAFFIC */}

          <div className="admin-card">

            <div className="admin-card-icon">
              🚦
            </div>

            <div className="admin-card-info">

              <span>
                TRAFFIC MONITORING
              </span>

              <strong>
                Live
              </strong>

              <small>
                Monitor traffic conditions
              </small>

            </div>

          </div>

          {/* ACCOUNTS */}

          <button
            type="button"
            className="admin-card admin-card-button"
            onClick={() =>
              setActivePage("users")
            }
          >

            <div className="admin-card-icon">
              👥
            </div>

            <div className="admin-card-info">

              <span>
                ACCOUNTS
              </span>

              <strong>
                {totalAccounts}
              </strong>

              <small>
                Registered system accounts
              </small>

            </div>

          </button>

          {/* NEWS */}

          <div className="admin-card">

            <div className="admin-card-icon">
              📰
            </div>

            <div className="admin-card-info">

              <span>
                NEWS
              </span>

              <strong>
                Live
              </strong>

              <small>
                Flood and traffic news
              </small>

            </div>

          </div>

        </section>

        {/* =================================================
            FLOOD NODE STATUS
        ================================================= */}

        <section className="admin-section">

          <div className="admin-section-header">

            <div>

              <p className="admin-label">
                FLOOD MONITORING
              </p>

              <h3>
                Flood Node Status
              </h3>

            </div>

            <button
              type="button"
              className="live-badge live-button"
              onClick={() =>
                setActivePage("nodes")
              }
            >
              ● LIVE
            </button>

          </div>

          <div className="system-monitor-grid">

            <div className="monitor-item">

              <span className="monitor-title">
                Total Nodes
              </span>

              <strong>
                {totalNodes}
              </strong>

            </div>

            <div className="monitor-item">

              <span className="monitor-title">
                Active Nodes
              </span>

              <strong className="online">
                {activeNodes}
              </strong>

            </div>

            <div className="monitor-item">

              <span className="monitor-title">
                Inactive Nodes
              </span>

              <strong className="offline">
                {inactiveNodes}
              </strong>

            </div>

            <div className="monitor-item">

              <span className="monitor-title">
                Low Battery
              </span>

              <strong className="warning">
                {lowBatteryNodes}
              </strong>

            </div>

          </div>

        </section>

        {/* =================================================
            BATTERY STATUS
        ================================================= */}

        <section className="admin-section">

          <div className="admin-section-header">

            <div>

              <p className="admin-label">
                FLOOD NODES
              </p>

              <h3>
                Battery Status
              </h3>

            </div>

          </div>

          <div className="system-monitor-grid">

            <div className="monitor-item">

              <span className="monitor-title">
                Active Nodes
              </span>

              <strong className="online">
                {activeNodes}
              </strong>

            </div>

            <div className="monitor-item">

              <span className="monitor-title">
                Average Battery
              </span>

              <strong>
                {averageBattery}%
              </strong>

            </div>

            <div className="monitor-item">

              <span className="monitor-title">
                Low Battery
              </span>

              <strong className="warning">
                {lowBatteryNodes}
              </strong>

            </div>

            <div className="monitor-item">

              <span className="monitor-title">
                Inactive Nodes
              </span>

              <strong className="offline">
                {inactiveNodes}
              </strong>

            </div>

          </div>

        </section>

        {/* =================================================
            SYSTEM MONITORING
        ================================================= */}

        <section className="admin-section">

          <div className="admin-section-header">

            <div>

              <p className="admin-label">
                SYSTEM MONITORING
              </p>

              <h3>
                FRENDS System Status
              </h3>

            </div>

            <span className="live-badge">
              ● LIVE
            </span>

          </div>

          <div className="system-monitor-grid">

            <div className="monitor-item">

              <span className="monitor-title">
                Firebase Database
              </span>

              <strong
                className={
                  databaseConnected
                    ? "online"
                    : "warning"
                }
              >
                {databaseConnected
                  ? "Connected"
                  : "Connecting"}
              </strong>

            </div>

            <div className="monitor-item">

              <span className="monitor-title">
                Flood Sensors
              </span>

              <strong
                className={
                  activeNodes > 0
                    ? "online"
                    : "offline"
                }
              >
                {activeNodes > 0
                  ? `${activeNodes} Active`
                  : "Offline"}
              </strong>

            </div>

            <div className="monitor-item">

              <span className="monitor-title">
                Traffic API
              </span>

              <strong className="online">
                Active
              </strong>

            </div>

            <div className="monitor-item">

              <span className="monitor-title">
                News API
              </span>

              <strong className="online">
                Active
              </strong>

            </div>

          </div>

        </section>

        {/* =================================================
            SYSTEM MANAGEMENT
        ================================================= */}

        <section className="admin-section">

          <div className="admin-section-header">

            <div>

              <p className="admin-label">
                ADMINISTRATION
              </p>

              <h3>
                System Management
              </h3>

            </div>

          </div>

          <div className="admin-actions">

            {/* ACCOUNT MANAGEMENT */}

            <button
              type="button"
              className="admin-action"
              onClick={() =>
                setActivePage("users")
              }
            >

              <span>
                👥
              </span>

              <div>

                <strong>
                  Account Management
                </strong>

                <small>
                  View registered system
                  accounts
                </small>

              </div>

              <b>
                →
              </b>

            </button>

            {/* FLOOD MONITORING */}

            <button
              type="button"
              className="admin-action"
              onClick={() =>
                setActivePage("nodes")
              }
            >

              <span>
                💧
              </span>

              <div>

                <strong>
                  Flood Monitoring
                </strong>

                <small>
                  View real-time flood
                  node data
                </small>

              </div>

              <b>
                →
              </b>

            </button>

          </div>

        </section>

      </>
    );
  }

  // =======================================================
  // ACCOUNT MANAGEMENT
  // =======================================================

  function renderUsers() {

    return (
      <section className="admin-section admin-management-page">

        <div className="admin-section-header">

          <div>

            <p className="admin-label">
              ADMINISTRATION
            </p>

            <h3>
              Account Management
            </h3>

          </div>

          <button
            type="button"
            className="admin-back-button"
            onClick={() =>
              setActivePage("dashboard")
            }
          >
            ← Dashboard
          </button>

        </div>

        {/* =================================================
            ACCOUNT SUMMARY
        ================================================= */}

        <div className="management-summary">

          <div>

            <span>
              TOTAL ACCOUNTS
            </span>

            <strong>
              {totalAccounts}
            </strong>

          </div>

        </div>

        {/* =================================================
            SEARCH
        ================================================= */}

        <div className="management-toolbar">

          <input
            type="text"
            placeholder="Search accounts..."
            value={userSearch}
            onChange={(event) =>
              setUserSearch(
                event.target.value
              )
            }
          />

        </div>

        {/* =================================================
            ACCOUNT DATA
        ================================================= */}

        {usersLoading ? (

          <div className="empty-management">
            Loading accounts...
          </div>

        ) : filteredUsers.length === 0 ? (

          <div className="empty-management">
            No accounts found.
          </div>

        ) : (

          <div className="data-table-wrapper">

            <table className="admin-data-table">

              <thead>

                <tr>

                  <th>
                    NAME
                  </th>

                  <th>
                    EMAIL
                  </th>

                  <th>
                    STATUS
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredUsers.map(
                  (account) => (

                    <tr
                      key={
                        account.uid
                      }
                    >

                      <td>

                        <strong>
                          {account.name}
                        </strong>

                      </td>

                      <td>
                        {account.email}
                      </td>

                      <td>

                        <span
                          className={
                            String(
                              account.status
                            )
                              .toLowerCase() ===
                            "active"
                              ? "status-active"
                              : "status-inactive"
                          }
                        >
                          ●{" "}
                          {account.status}
                        </span>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>
    );
  }

  // =======================================================
  // FLOOD NODE MANAGEMENT
  // =======================================================

  function renderNodes() {

    return (
      <section className="admin-section admin-management-page">

        <div className="admin-section-header">

          <div>

            <p className="admin-label">
              FLOOD MONITORING
            </p>

            <h3>
              Flood Node Management
            </h3>

          </div>

          <button
            type="button"
            className="admin-back-button"
            onClick={() =>
              setActivePage("dashboard")
            }
          >
            ← Dashboard
          </button>

        </div>

        {/* =================================================
            NODE SUMMARY
        ================================================= */}

        <div className="management-summary">

          <div>

            <span>
              TOTAL NODES
            </span>

            <strong>
              {totalNodes}
            </strong>

          </div>

          <div>

            <span>
              ACTIVE
            </span>

            <strong className="online">
              {activeNodes}
            </strong>

          </div>

          <div>

            <span>
              INACTIVE
            </span>

            <strong className="offline">
              {inactiveNodes}
            </strong>

          </div>

          <div>

            <span>
              LOW BATTERY
            </span>

            <strong className="warning">
              {lowBatteryNodes}
            </strong>

          </div>

        </div>

        {/* =================================================
            SEARCH
        ================================================= */}

        <div className="management-toolbar">

          <input
            type="text"
            placeholder="Search node or location..."
            value={nodeSearch}
            onChange={(event) =>
              setNodeSearch(
                event.target.value
              )
            }
          />

        </div>

        {/* =================================================
            NODES
        ================================================= */}

        {nodesLoading ? (

          <div className="empty-management">
            Loading flood nodes...
          </div>

        ) : filteredNodes.length === 0 ? (

          <div className="empty-management">
            No flood nodes found.
          </div>

        ) : (

          <div className="node-grid">

            {filteredNodes.map(
              (node) => {

                const isActive =
                  node.isActive === true;

                const flood =
                  getFloodStatus(
                    node.waterLevel
                  );

                const batteryValue =
                  Math.round(
                    Math.min(
                      100,
                      Math.max(
                        0,
                        Number(
                          node.batteryPercent
                        )
                      )
                    )
                  );

                return (

                  <div
                    className={`flood-node-card ${
                      !isActive
                        ? "node-card-offline"
                        : ""
                    }`}
                    key={
                      node.firebaseKey
                    }
                  >

                    {/* HEADER */}

                    <div className="node-card-header">

                      <div>

                        <span className="node-label">
                          FLOOD NODE
                        </span>

                        <h4>
                          {node.nodeId}
                        </h4>

                      </div>

                      <span
                        className={
                          isActive
                            ? "node-online"
                            : "node-offline"
                        }
                      >
                        ●{" "}
                        {isActive
                          ? "ACTIVE"
                          : "INACTIVE"}
                      </span>

                    </div>

                    {/* LOCATION */}

                    <div className="node-location">

                      📍{" "}
                      {node.location}

                    </div>

                    {/* ACTIVE NODE */}

                    {isActive ? (

                      <>

                        {/* WATER */}

                        <div className="node-data-row">

                          <div className="node-data">

                            <span>
                              WATER LEVEL
                            </span>

                            <strong>
                              {
                                node.waterLevel
                              }
                            </strong>

                          </div>

                          <span
                            className={
                              flood.className
                            }
                          >
                            {
                              flood.label
                            }
                          </span>

                        </div>

                        {/* BATTERY */}

                        <div className="battery-section">

                          <div className="battery-header">

                            <span>
                              BATTERY
                            </span>

                            <strong>
                              {
                                batteryValue
                              }%
                            </strong>

                          </div>

                          <div className="battery-bar">

                            <div
                              className={getBatteryClass(
                                batteryValue
                              )}
                              style={{
                                width: `${batteryValue}%`,
                              }}
                            />

                          </div>

                        </div>

                      </>

                    ) : (

                      <div className="node-offline-data">

                        <div className="offline-data-item">

                          <span>
                            WATER LEVEL
                          </span>

                          <strong>
                            INACTIVE
                          </strong>

                        </div>

                        <div className="offline-data-item">

                          <span>
                            BATTERY
                          </span>

                          <strong>
                            INACTIVE
                          </strong>

                        </div>

                        <small>
                          Sensor data is
                          unavailable while
                          this node is inactive.
                        </small>

                      </div>

                    )}

                    {/* LAST UPDATE */}

                    <div className="node-last-update">

                      <span>
                        LAST UPDATE
                      </span>

                      <strong>
                        {formatLastUpdate(
                          node.lastUpdate
                        )}
                      </strong>

                    </div>

                  </div>

                );
              }
            )}

          </div>

        )}

      </section>
    );
  }

  // =======================================================
  // MAIN RENDER
  // =======================================================

  return (

    <div className="admin-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="admin-header">

        <div className="admin-brand">

          <div className="admin-logo">
            F
          </div>

          <div>

            <h1>
              FRENDS
            </h1>

            <span>
              ADMINISTRATOR
            </span>

          </div>

        </div>

        <button
          type="button"
          className="admin-logout"
          onClick={
            handleLogout
          }
        >

          <span>
            ↪
          </span>

          Logout

        </button>

      </header>

      {/* =================================================
          CONTENT
      ================================================= */}

      <main className="admin-content">

        {activePage ===
          "dashboard" &&
          renderDashboard()}

        {activePage ===
          "users" &&
          renderUsers()}

        {activePage ===
          "nodes" &&
          renderNodes()}

      </main>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="admin-footer">

        <span>
          FRENDS — Flood Road Eye and
          Navigation Detection System
        </span>

        <span>
          Administrator Panel
        </span>

      </footer>

    </div>

  );
}

export default AdminDashboard;