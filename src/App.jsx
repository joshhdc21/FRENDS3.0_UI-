import { useState, useEffect } from "react";

import { ref, onValue } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

import {
  database,
  auth,
} from "./firebase/firebaseConfig";

import Header from "./components/Header";
import Footer from "./components/Footer";
import Login from "./components/Login";

import MonitoringSection from "./components/MonitoringSection";
import TrafficHeroSection from "./components/trafficherosection";
import FloodLevelSection from "./components/FloodLevelSection";
import NodesSection from "./components/NodesSection";
import DeviceSection from "./components/DeviceSection";
import NewsSection from "./components/NewsSection";
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
  const [authLoading, setAuthLoading] = useState(true);

  // =========================================
  // FIREBASE REALTIME DATABASE
  // =========================================

  const [nodes, setNodes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // =========================================
  // FIREBASE CONNECTION STATUS
  // =========================================

  const [firebaseConnected, setFirebaseConnected] =
    useState(false);

  // =========================================
  // AUTHENTICATION LISTENER
  // =========================================

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (currentUser) => {
        console.log(
          "Firebase Auth User:",
          currentUser
        );

        setUser(currentUser);
        setAuthLoading(false);
      }
    );

    return () => unsubscribeAuth();
  }, []);

  // =========================================
  // FIREBASE REALTIME DATABASE
  // ONLY CONNECT AFTER LOGIN
  // =========================================

  useEffect(() => {
    // User is not logged in
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

    const nodesRef = ref(database, "nodes");

    const unsubscribeDatabase = onValue(
      nodesRef,
      (snapshot) => {
        console.log(
          "Firebase Nodes Data:",
          snapshot.val()
        );

        if (snapshot.exists()) {
          setNodes(snapshot.val());
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

        setError(err.message);
        setFirebaseConnected(false);
        setLoading(false);
      }
    );

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
  // USER NOT LOGGED IN
  // SHOW ACTUAL LOGIN PAGE
  // =========================================

  if (!user) {
    return <Login />;
  }

  // =========================================
  // USER IS LOGGED IN
  // SHOW FRENDS APPLICATION
  // =========================================

  return (
    <div className="app">

      {/* =========================================
          HEADER
      ========================================= */}

      <Header
        page={page}
        setPage={setPage}
        firebaseConnected={firebaseConnected}
        user={user}
      />

      {/* =========================================
          MAIN CONTENT
      ========================================= */}

      <main className="main-content">

        {page === "dashboard" && (
          <MonitoringSection />
        )}

        {page === "traffic" && (
          <TrafficHeroSection />
        )}

        {page === "flood" && (
          <FloodLevelSection />
        )}

        {page === "nodes" && (
          <NodesSection
            nodes={Object.values(nodes)}
            loading={loading}
            error={error}
          />
        )}

        {page === "devices" && (
          <DeviceSection />
        )}

        {page === "news" && (
          <NewsSection />
        )}

        {page === "map" && (
          <MapSection />
        )}

      </main>

      {/* =========================================
          BOTTOM NAVIGATION
      ========================================= */}

      <BottomNavigation
        page={page}
        setPage={setPage}
      />

      {/* =========================================
          FOOTER
      ========================================= */}

      <Footer />

    </div>
  );
}

export default App;