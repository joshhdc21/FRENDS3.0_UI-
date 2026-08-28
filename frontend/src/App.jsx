import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

import {
  database,
  auth,
} from "./firebase/firebaseConfig";

// =========================================
// COMPONENTS
// =========================================

import Header from "./components/Header";
import Footer from "./components/Footer";
import Login from "./components/Login";
import RoleInterface from "./components/RoleInterface";
import AdminDashboard from "./components/AdminDashboard";

import MonitoringSection from "./components/MonitoringSection";
import TrafficHeroSection from "./components/trafficherosection";
import FloodLevelSection from "./components/FloodLevelSection";
import NodesSection from "./components/NodesSection";
import DeviceSection from "./components/DeviceSection";
import BottomNavigation from "./components/BottomNavigation";
import MapSection from "./components/MapSection";

import "./App.css";

function App() {
  // =========================================
  // PAGE NAVIGATION
  // =========================================

  const [page, setPage] = useState("dashboard");

  // =========================================
  // FIREBASE AUTHENTICATION
  // =========================================

  const [user, setUser] = useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  // =========================================
  // SELECTED ROLE
  //
  // null  = user has not selected a role yet
  // user  = user interface
  // admin = admin interface
  // =========================================

  const [selectedRole, setSelectedRole] =
    useState(null);

  // =========================================
  // FIREBASE REALTIME DATABASE
  // =========================================

  const [nodes, setNodes] = useState({});

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  // =========================================
  // FIREBASE CONNECTION STATUS
  // =========================================

  const [firebaseConnected, setFirebaseConnected] =
    useState(false);

  // =========================================
  // FIREBASE AUTHENTICATION LISTENER
  // =========================================

  useEffect(() => {
    console.log(
      "Starting Firebase Authentication listener..."
    );

    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        (currentUser) => {

          console.log(
            "Firebase Auth User:",
            currentUser
          );

          // =====================================
          // USER LOGGED OUT
          // =====================================

          if (!currentUser) {

            console.log(
              "No authenticated user."
            );

            setUser(null);

            // Reset role
            setSelectedRole(null);

            // Reset page
            setPage("dashboard");

            setAuthLoading(false);

            return;
          }

          // =====================================
          // USER LOGGED IN
          // =====================================

          console.log(
            "================================="
          );

          console.log(
            "LOGIN SUCCESSFUL"
          );

          console.log(
            "Email:",
            currentUser.email
          );

          console.log(
            "UID:",
            currentUser.uid
          );

          console.log(
            "================================="
          );

          setUser(currentUser);

          /*
           * IMPORTANT:
           *
           * DO NOT automatically determine
           * the role here.
           *
           * The next screen is:
           *
           *       RoleInterface
           *
           * The user will choose:
           *
           *       USER
           *       ADMIN
           *
           * If ADMIN is selected,
           * RoleInterface will request
           * the admin passkey.
           */

          setSelectedRole(null);

          setAuthLoading(false);
        }
      );

    // =========================================
    // CLEANUP
    // =========================================

    return () => {
      unsubscribeAuth();
    };

  }, []);

  // =========================================
  // FIREBASE REALTIME DATABASE
  //
  // Only connect when authenticated.
  // =========================================

  useEffect(() => {

    // =======================================
    // USER NOT LOGGED IN
    // =======================================

    if (!user) {

      setNodes({});

      setFirebaseConnected(false);

      setLoading(false);

      setError(null);

      return;
    }

    console.log(
      "Connecting to Firebase Realtime Database..."
    );

    setLoading(true);

    // =======================================
    // NODES REFERENCE
    // =======================================

    const nodesRef =
      ref(database, "nodes");

    // =======================================
    // LISTEN FOR NODE CHANGES
    // =======================================

    const unsubscribeDatabase =
      onValue(
        nodesRef,

        (snapshot) => {

          console.log(
            "Firebase Nodes Data:",
            snapshot.val()
          );

          if (snapshot.exists()) {

            setNodes(
              snapshot.val()
            );

          } else {

            setNodes({});
          }

          setFirebaseConnected(true);

          setLoading(false);

          setError(null);
        },

        (err) => {

          console.error(
            "Firebase Database Error:",
            err
          );

          setError(
            err.message
          );

          setFirebaseConnected(false);

          setLoading(false);
        }
      );

    // =======================================
    // CLEANUP
    // =======================================

    return () => {
      unsubscribeDatabase();
    };

  }, [user]);

  // =========================================
  // AUTHENTICATION LOADING
  // =========================================

  if (authLoading) {

    return (
      <div className="app-loading">

        <div className="loading-spinner"></div>

        <p>
          Loading FRENDS...
        </p>

      </div>
    );
  }

  // =========================================
  // NOT LOGGED IN
  //
  // SHOW LOGIN
  // =========================================

  if (!user) {

    return <Login />;
  }

  // =========================================
  // LOGGED IN BUT NO ROLE SELECTED
  //
  // SHOW ROLE INTERFACE
  // =========================================

  if (!selectedRole) {

    return (
      <RoleInterface
        user={user}
        onRoleSelected={setSelectedRole}
      />
    );
  }

  // =========================================
  // ADMIN ROLE
  //
  // RoleInterface should only call this
  // after the ADMIN passkey is correct.
  // =========================================

  if (selectedRole === "admin") {

    console.log(
      "Opening ADMIN interface..."
    );

    return (
      <AdminDashboard />
    );
  }

  // =========================================
  // USER ROLE
  //
  // Open the normal FRENDS monitoring
  // interface.
  // =========================================

  if (selectedRole === "user") {

    console.log(
      "Opening USER monitoring interface..."
    );

    return (
      <div className="app">

        {/* ===================================
            HEADER
        =================================== */}

        <Header
          page={page}
          setPage={setPage}
          firebaseConnected={
            firebaseConnected
          }
          user={user}
        />

        {/* ===================================
            MAIN CONTENT
        =================================== */}

        <main className="main-content">

          {/* DASHBOARD */}

          {page === "dashboard" && (
            <MonitoringSection />
          )}

          {/* TRAFFIC */}

          {page === "traffic" && (
            <TrafficHeroSection />
          )}

          {/* FLOOD */}

          {page === "flood" && (
            <FloodLevelSection />
          )}

          {/* NODES */}

          {page === "nodes" && (

            <NodesSection
              nodes={Object.values(nodes)}
              loading={loading}
              error={error}
            />

          )}

          {/* DEVICES */}

          {page === "devices" && (
            <DeviceSection />
          )}

          {/* MAP */}

          {page === "map" && (
            <MapSection />
          )}

        </main>

        {/* ===================================
            BOTTOM NAVIGATION
        =================================== */}

        <BottomNavigation
          page={page}
          setPage={setPage}
        />

        {/* ===================================
            FOOTER
        =================================== */}

        <Footer />

      </div>
    );
  }

  // =========================================
  // INVALID ROLE
  // =========================================

  return (
    <div className="app-loading">

      <h2>
        Invalid Role
      </h2>

      <p>
        Please select a valid FRENDS account role.
      </p>

      <button
        type="button"
        onClick={() => {
          setSelectedRole(null);
        }}
      >
        Back to Role Selection
      </button>

    </div>
  );
}

export default App;