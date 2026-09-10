import { useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { onValue, ref, remove } from "firebase/database";

import { database } from "../firebase/firebaseConfig";
import { auth } from "../firebase/authConfig";

import "./AdminDashboard.css";

// =====================================================
// FLOOD STATUS
// =====================================================

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

// =====================================================
// BATTERY PERCENTAGE
// =====================================================

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

  return Math.min(Math.max(percentage, 0), 100);
}

// =====================================================
// NODE STATUS
// =====================================================

function normalizeNodeStatus(value) {
  if (value === null || value === undefined) {
    return "offline";
  }

  if (typeof value === "boolean") {
    return value ? "online" : "offline";
  }

  if (typeof value === "number") {
    return value === 1 ? "online" : "offline";
  }

  const status = String(value).trim().toLowerCase();

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

// =====================================================
// GET LATEST NODE READING
// =====================================================

function getLatestReading(nodeHistory) {
  if (!nodeHistory || typeof nodeHistory !== "object") {
    return null;
  }

  const entries = Object.values(nodeHistory).filter(
    (entry) => entry && typeof entry === "object"
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

// =====================================================
// FORMAT LAST UPDATE
// =====================================================

function formatLastUpdate(timestamp) {
  if (
    timestamp === null ||
    timestamp === undefined ||
    timestamp === ""
  ) {
    return "No recent data";
  }

  const numericTimestamp = Number(timestamp);

  let date;

  if (Number.isFinite(numericTimestamp)) {
    date = new Date(numericTimestamp * 1000);
  } else {
    date = new Date(timestamp);
  }

  if (Number.isNaN(date.getTime())) {
    return String(timestamp);
  }

  return date.toLocaleString();
}

// =====================================================
// ADMIN DASHBOARD
// =====================================================

function AdminDashboard() {
  // ===================================================
  // PAGE + SIDEBAR STATE
  // ===================================================

  const [activePage, setActivePage] =
    useState("dashboard");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  // ===================================================
  // DATA STATE
  // ===================================================

  const [users, setUsers] = useState([]);
  const [nodes, setNodes] = useState([]);

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

  // ===================================================
  // FIREBASE USERS
  // ===================================================

  useEffect(() => {
    if (!database) {
      console.error(
        "Firebase database is not initialized."
      );

      setUsersLoading(false);
      setDatabaseConnected(false);

      return;
    }

    const usersRef = ref(database, "users");

    const unsubscribe = onValue(
      usersRef,
      (snapshot) => {
        const data = snapshot.val();

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

    return () => unsubscribe();
  }, []);

  // ===================================================
  // FIREBASE FLOOD NODES
  // ===================================================

  useEffect(() => {
    if (!database) {
      console.error(
        "Firebase database is not initialized."
      );

      setNodesLoading(false);
      setDatabaseConnected(false);

      return;
    }

    const nodesRef = ref(
      database,
      "nodes"
    );

    const unsubscribe = onValue(
      nodesRef,
      (snapshot) => {
        const rawData = snapshot.val();

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

        for (
          const [
            nodeKey,
            nodeHistory,
          ] of Object.entries(rawData)
        ) {
          if (
            !nodeHistory ||
            typeof nodeHistory !== "object"
          ) {
            continue;
          }

          const latestEntry =
            getLatestReading(
              nodeHistory
            );

          if (!latestEntry) {
            continue;
          }

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

          // =================================================
          // WATER LEVEL
          // =================================================

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

          // =================================================
          // PRESSURE
          // =================================================

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

          // =================================================
          // BATTERY
          // =================================================

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

          const batteryPercent =
            isActive
              ? batteryPercentage(
                  battery
                )
              : 0;

          // =================================================
          // TIMESTAMP
          // =================================================

          const timestamp =
            latestEntry.timestamp
              ? Number(
                  latestEntry.timestamp
                )
              : null;

          // =================================================
          // NORMALIZED NODE
          // =================================================

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

    return () => unsubscribe();
  }, []);

  // ===================================================
  // LOGOUT
  // ===================================================

  async function handleLogout() {
    try {
      console.log(
        "================================="
      );

      console.log(
        "SIGN OUT BUTTON CLICKED"
      );

      console.log(
        "Current Firebase user:",
        auth?.currentUser
      );

      console.log(
        "================================="
      );

      if (!auth) {
        console.error(
          "Firebase Authentication is not initialized."
        );

        alert(
          "Authentication service is not available."
        );

        return;
      }

      await signOut(auth);

      console.log(
        "Firebase logout successful."
      );

      // =================================================
      // CLEAR LOCAL STORAGE
      // =================================================

      try {
        localStorage.removeItem(
          "user"
        );

        localStorage.removeItem(
          "currentUser"
        );

        localStorage.removeItem(
          "isAdmin"
        );

        localStorage.removeItem(
          "userRole"
        );
      } catch (storageError) {
        console.warn(
          "Could not clear localStorage:",
          storageError
        );
      }

      // =================================================
      // REDIRECT TO LOGIN
      // =================================================

      window.location.replace("/");

    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      alert(
        "Failed to sign out.\n\n" +
          (
            error?.message ||
            "Please try again."
          )
      );
    }
  }

  // ===================================================
  // DELETE ACCOUNT
  // ===================================================

  async function handleDeleteAccount(
    uid,
    name
  ) {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete the account "${name}"?\n\nThis will remove the account record from the system.`
      );

    if (!confirmed) {
      return;
    }

    if (!database) {
      alert(
        "Firebase database is not available."
      );

      return;
    }

    try {
      const userRef =
        ref(
          database,
          `users/${uid}`
        );

      await remove(
        userRef
      );

      console.log(
        "Account deleted successfully:",
        uid
      );

      alert(
        "Account deleted successfully."
      );

    } catch (error) {
      console.error(
        "Error deleting account:",
        error
      );

      alert(
        "Failed to delete the account. Please try again."
      );
    }
  }

  // ===================================================
  // DASHBOARD STATISTICS
  // ===================================================

  const totalAccounts =
    users.length;

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

  const lowBatteryNodes =
    nodes.filter(
      (node) =>
        node.isActive === true &&
        Number(
          node.batteryPercent
        ) <= 20
    ).length;

  const criticalNodes =
    nodes.filter(
      (node) =>
        node.isActive === true &&
        Number(
          node.waterLevel
        ) >= 30
    ).length;

  // ===================================================
  // FILTER USERS
  // ===================================================

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

  // ===================================================
  // FILTER NODES
  // ===================================================

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

  // ===================================================
  // BATTERY CLASS
  // ===================================================

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

  // ===================================================
  // DASHBOARD PAGE
  // ===================================================

  function renderDashboard() {
    return (
      <>
        {/* WELCOME */}

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

        {/* OVERVIEW CARDS */}

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
                Monitor traffic
                conditions
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
                Registered system
                accounts
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
                Flood and traffic
                news
              </small>

            </div>

          </div>

        </section>

        {/* FLOOD NODE STATUS */}

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
                Battery Management
              </span>

              <strong className="warning">
                {lowBatteryNodes}
              </strong>

            </div>

          </div>

        </section>

        {/* FLOOD STATUS SUMMARY */}

        <section className="admin-section">

          <div className="admin-section-header">

            <div>

              <p className="admin-label">
                FLOOD MONITORING
              </p>

              <h3>
                Flood Level Summary
              </h3>

            </div>

          </div>

          <div className="system-monitor-grid">

            {/* NORMAL */}

            <div className="monitor-item">

              <span className="monitor-title">
                Normal
              </span>

              <strong className="online">

                {
                  nodes.filter(
                    (node) =>
                      node.isActive ===
                        true &&
                      Number(
                        node.waterLevel
                      ) < 10
                  ).length
                }

              </strong>

            </div>

            {/* MODERATE */}

            <div className="monitor-item">

              <span className="monitor-title">
                Moderate
              </span>

              <strong className="warning">

                {
                  nodes.filter(
                    (node) =>
                      node.isActive ===
                        true &&
                      Number(
                        node.waterLevel
                      ) >= 10 &&
                      Number(
                        node.waterLevel
                      ) < 20
                  ).length
                }

              </strong>

            </div>

            {/* HIGH */}

            <div className="monitor-item">

              <span className="monitor-title">
                High
              </span>

              <strong className="warning">

                {
                  nodes.filter(
                    (node) =>
                      node.isActive ===
                        true &&
                      Number(
                        node.waterLevel
                      ) >= 20 &&
                      Number(
                        node.waterLevel
                      ) < 30
                  ).length
                }

              </strong>

            </div>

            {/* CRITICAL */}

            <div className="monitor-item">

              <span className="monitor-title">
                Critical
              </span>

              <strong className="offline">
                {criticalNodes}
              </strong>

            </div>

          </div>

        </section>
      </>
    );
  }

  // ===================================================
  // ACCOUNT MANAGEMENT
  // ===================================================

  function renderUsers() {
    return (
      <section className="admin-section admin-management-page">

        <div className="admin-section-header">

          <div>

            <p className="admin-label">
              ACCOUNT MANAGEMENT
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

        {/* ACCOUNT SUMMARY */}

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

        {/* SEARCH */}

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

        {/* ACCOUNT DATA */}

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
                  <th>NAME</th>
                  <th>EMAIL</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
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
                          {
                            account.name
                          }
                        </strong>

                      </td>

                      <td>
                        {
                          account.email
                        }
                      </td>

                      <td>

                        <span
                          className={
                            String(
                              account.status
                            ).toLowerCase() ===
                            "active"
                              ? "status-active"
                              : "status-inactive"
                          }
                        >

                          ●{" "}

                          {
                            account.status
                          }

                        </span>

                      </td>

                      <td>

                        <button
                          type="button"
                          className="delete-account-button"
                          onClick={() =>
                            handleDeleteAccount(
                              account.uid,
                              account.name
                            )
                          }
                        >
                          🗑 Delete
                        </button>

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

  // ===================================================
  // FLOOD NODE MANAGEMENT
  // ===================================================

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

        {/* NODE SUMMARY */}

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
              BATTERY MANAGEMENT
            </span>

            <strong className="warning">
              {lowBatteryNodes}
            </strong>

          </div>

        </div>

        {/* SEARCH */}

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

        {/* NODES */}

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
                  node.isActive ===
                  true;

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
                          {
                            node.nodeId
                          }
                        </h4>

                      </div>

                      <span
                        className={
                          isActive
                            ? "status-badge status-online"
                            : "status-badge status-offline"
                        }
                      >

                        {isActive
                          ? "● ONLINE"
                          : "○ OFFLINE"}

                      </span>

                    </div>

                    {/* LOCATION */}

                    <div className="node-location">

                      📍{" "}

                      {
                        node.location
                      }

                    </div>

                    {/* METRICS */}

                    <div className="node-metrics-grid">

                      {/* WATER LEVEL */}

                      <div className="metric-box">

                        <span className="metric-label">
                          WATER LEVEL
                        </span>

                        <strong className="metric-value">

                          {isActive
                            ? `${node.waterLevel} cm`
                            : "--"}

                        </strong>

                        <span
                          className={`flood-badge ${flood.className}`}
                        >

                          {isActive
                            ? flood.label
                            : "OFFLINE"}

                        </span>

                      </div>

                      {/* PRESSURE */}

                      <div className="metric-box">

                        <span className="metric-label">
                          PRESSURE
                        </span>

                        <strong className="metric-value">

                          {isActive
                            ? `${node.pressure} kPa`
                            : "--"}

                        </strong>

                      </div>

                      {/* BATTERY */}

                      <div className="metric-box">

                        <span className="metric-label">
                          BATTERY
                        </span>

                        <strong
                          className={`metric-value ${getBatteryClass(
                            batteryValue
                          )}`}
                        >

                          {isActive
                            ? `${batteryValue}%`
                            : "--"}

                        </strong>

                        <small className="battery-voltage">

                          {isActive
                            ? `${node.battery}V`
                            : "--"}

                        </small>

                      </div>

                    </div>

                    {/* FOOTER */}

                    <div className="node-card-footer">

                      <small>

                        Last Update:{" "}

                        {formatLastUpdate(
                          node.lastUpdate
                        )}

                      </small>

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

  // ===================================================
  // MAIN RETURN
  // ===================================================

  return (
    <div className="admin-dashboard-container">

      {/* =================================================
          HAMBURGER / SLIDE BUTTON
          ================================================= */}

      <button
        type="button"
        className="admin-menu-button"
        onClick={() =>
          setSidebarOpen(true)
        }
        aria-label="Open navigation menu"
      >
        ☰
      </button>

      {/* =================================================
          SIDEBAR OVERLAY
          ================================================= */}

      <div
        className={`admin-sidebar-overlay ${
          sidebarOpen
            ? "active"
            : ""
        }`}
        onClick={() =>
          setSidebarOpen(false)
        }
      />

      {/* =================================================
          SLIDE-OUT SIDEBAR
          ================================================= */}

      <aside
        className={`admin-sidebar ${
          sidebarOpen
            ? "open"
            : ""
        }`}
      >

        {/* CLOSE BUTTON */}

        <button
          type="button"
          className="admin-sidebar-close"
          onClick={() =>
            setSidebarOpen(false)
          }
          aria-label="Close navigation menu"
        >
          ×
        </button>

        {/* NAVIGATION */}

        <nav className="admin-nav">

          {/* DASHBOARD */}

          <button
            type="button"
            className={
              activePage ===
              "dashboard"
                ? "active"
                : ""
            }
            onClick={() => {

              setActivePage(
                "dashboard"
              );

              setSidebarOpen(false);

            }}
          >
            📊 Dashboard
          </button>

          {/* FLOOD NODES */}

          <button
            type="button"
            className={
              activePage ===
              "nodes"
                ? "active"
                : ""
            }
            onClick={() => {

              setActivePage(
                "nodes"
              );

              setSidebarOpen(false);

            }}
          >
            💧 Flood Nodes
          </button>

          {/* ACCOUNTS */}

          <button
            type="button"
            className={
              activePage ===
              "users"
                ? "active"
                : ""
            }
            onClick={() => {

              setActivePage(
                "users"
              );

              setSidebarOpen(false);

            }}
          >
            👥 Accounts
          </button>

        </nav>

        {/* =================================================
            SIGN OUT
            ================================================= */}

        <div className="admin-sidebar-footer">

          <button
            type="button"
            className="admin-logout-button"
            onClick={handleLogout}
          >
            🚪 Sign Out
          </button>

        </div>

      </aside>

      {/* =================================================
          MAIN CONTENT
          ================================================= */}

      <main className="admin-main-content">

        {activePage ===
          "dashboard" &&
          renderDashboard()}

        {activePage ===
          "nodes" &&
          renderNodes()}

        {activePage ===
          "users" &&
          renderUsers()}

      </main>

    </div>
  );
}

export default AdminDashboard;