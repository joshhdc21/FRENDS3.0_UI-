import { useState, useEffect } from "react";

import { ref, onValue } from "firebase/database";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

// =========================================================
// MAIN FRENDS FIREBASE
// Existing frends-v3
// Used for Realtime Database
// =========================================================

import {
  database,
} from "./firebase/firebaseConfig";

// =========================================================
// AUTHENTICATION FIREBASE
// New frends-authentication
// Used for Firebase Authentication
// =========================================================

import {
  auth,
} from "./firebase/authConfig";

// =========================================================
// COMPONENTS
// =========================================================

import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";
import Header from "./components/Header";
import Footer from "./components/Footer";
import MonitoringSection from "./components/MonitoringSection";
import TrafficHeroSection from "./components/trafficherosection";
import NodesSection from "./components/NodesSection";
import MapSection from "./components/MapSection";
import AboutUs from "./components/AboutUs";

import "./App.css";

// =========================================================
// ADMIN ACCOUNT
// =========================================================
// IMPORTANT:
// Create this exact account in:
// Firebase Console
// → frends-authentication
// → Authentication
// → Users
//
// Example:
// Email: frendsadmin@gmail.com
//
// The password should ONLY be stored in Firebase Authentication.
// DO NOT put the password inside this code.
// =========================================================

const ADMIN_EMAIL = "frendsadmin@gmail.com";

function App() {
  // =========================================================
  // PAGE
  // =========================================================

  const [page, setPage] = useState("map");

  // =========================================================
  // SLIDE NAVIGATION MENU
  // =========================================================

  const [menuOpen, setMenuOpen] = useState(false);

  // =========================================================
  // FIREBASE AUTHENTICATION
  // =========================================================

  const [user, setUser] = useState(null);

  const [userRole, setUserRole] = useState(null);

  const [authLoading, setAuthLoading] = useState(true);

  // =========================================================
  // FIREBASE NODES
  // =========================================================

  const [nodes, setNodes] = useState({});

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [firebaseConnected, setFirebaseConnected] =
    useState(false);

  // =========================================================
  // MENU TOGGLE
  // =========================================================

  const handleMenuToggle = () => {
    setMenuOpen((previous) => !previous);
  };

  // =========================================================
  // CLOSE MENU
  // =========================================================

  const closeMenu = () => {
    setMenuOpen(false);
  };

  // =========================================================
  // PAGE NAVIGATION
  // =========================================================

  const handlePageChange = (nextPage) => {
    setPage(nextPage);

    // Close menu after selecting a page
    setMenuOpen(false);

    // Scroll to top
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = async () => {
    try {
      await signOut(auth);

      setUser(null);
      setUserRole(null);
      setPage("map");
      setMenuOpen(false);

      console.log("User logged out successfully.");
    } catch (logoutError) {
      console.error(
        "Logout error:",
        logoutError
      );

      alert(
        "Failed to logout. Please try again."
      );
    }
  };

  // =========================================================
  // FIREBASE AUTHENTICATION
  // =========================================================
  //
  // FLOW:
  //
  // 1. Firebase checks if somebody is logged in.
  //
  // 2. If nobody is logged in:
  //      → Show Login
  //
  // 3. If the logged-in email is ADMIN_EMAIL:
  //      → Automatically set role = admin
  //      → Show AdminDashboard
  //
  // 4. Otherwise:
  //      → Check users/{uid}/role in frends-v3
  //      → Normal users go to the normal interface
  //
  // =========================================================

  useEffect(() => {
    console.log(
      "Starting Firebase Authentication listener..."
    );

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (currentUser) => {
        console.log(
          "Firebase Auth User:",
          currentUser
        );

        // =====================================================
        // NO USER LOGGED IN
        // =====================================================

        if (!currentUser) {
          setUser(null);
          setUserRole(null);
          setAuthLoading(false);

          setPage("map");
          setMenuOpen(false);

          console.log(
            "No authenticated user."
          );

          return;
        }

        // =====================================================
        // USER LOGGED IN
        // =====================================================

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

        // =====================================================
        // CHECK ADMIN ACCOUNT FIRST
        // =====================================================

        const loggedInEmail =
          currentUser.email?.trim().toLowerCase();

        const adminEmail =
          ADMIN_EMAIL.trim().toLowerCase();

        if (loggedInEmail === adminEmail) {
          console.log(
            "================================="
          );

          console.log(
            "ADMIN ACCOUNT DETECTED"
          );

          console.log(
            "Redirecting to AdminDashboard..."
          );

          console.log(
            "================================="
          );

          // Automatically make this account admin
          setUserRole("admin");

          // Stop authentication loading
          setAuthLoading(false);

          return;
        }

        // =====================================================
        // NORMAL USER
        // =====================================================
        //
        // Only regular accounts reach this section.
        //
        // Their role is checked in:
        //
        // users/{uid}/role
        //
        // =====================================================

        console.log(
          "Regular account detected."
        );

        const userRef = ref(
          database,
          `users/${currentUser.uid}`
        );

        // Listen for this user's database information
        const unsubscribeUser = onValue(
          userRef,
          (snapshot) => {
            const userData =
              snapshot.exists()
                ? snapshot.val()
                : null;

            console.log(
              "User database data:",
              userData
            );

            // =================================================
            // DATABASE ADMIN ROLE
            // =================================================

            if (userData?.role === "admin") {
              console.log(
                "Admin role detected from Realtime Database."
              );

              setUserRole("admin");
            } else {
              // =================================================
              // NORMAL USER
              // =================================================

              setUserRole("user");
            }

            setAuthLoading(false);
          },
          (firebaseError) => {
            console.error(
              "Error reading user data:",
              firebaseError
            );

            // If the user's database role cannot be read,
            // treat the account as a normal user.

            setUserRole("user");

            setAuthLoading(false);
          }
        );

        // Store the cleanup function
        // on the current effect scope.
        //
        // NOTE:
        // This listener is also cleaned up when the
        // authentication effect is recreated/unmounted.

        window.__frendsUserListenerCleanup =
          unsubscribeUser;
      }
    );

    // =======================================================
    // CLEANUP
    // =======================================================

    return () => {
      unsubscribeAuth();

      if (
        window.__frendsUserListenerCleanup
      ) {
        window.__frendsUserListenerCleanup();

        window.__frendsUserListenerCleanup =
          null;
      }
    };
  }, []);

  // =========================================================
  // FIREBASE REALTIME DATABASE - NODES
  // =========================================================

  useEffect(() => {
    // No user = do not listen to nodes
    if (!user) {
      setNodes({});
      setFirebaseConnected(false);
      setLoading(false);
      setError(null);

      return;
    }

    setLoading(true);

    console.log(
      "Starting Firebase Realtime Database listener..."
    );

    const nodesRef =
      ref(database, "nodes");

    const unsubscribeDatabase =
      onValue(
        nodesRef,
        (snapshot) => {
          const nodeData =
            snapshot.exists()
              ? snapshot.val()
              : {};

          console.log(
            "Firebase nodes:",
            nodeData
          );

          setNodes(nodeData);

          setFirebaseConnected(true);
          setLoading(false);
          setError(null);
        },
        (firebaseError) => {
          console.error(
            "Firebase Database Error:",
            firebaseError
          );

          setError(
            firebaseError.message
          );

          setFirebaseConnected(false);
          setLoading(false);
        }
      );

    return () => {
      unsubscribeDatabase();
    };
  }, [user]);

  // =========================================================
  // AUTHENTICATION LOADING
  // =========================================================

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

  // =========================================================
  // NOT LOGGED IN
  // =========================================================

  if (!user) {
    return <Login />;
  }

  // =========================================================
  // ADMIN ACCOUNT
  // =========================================================
  //
  // If:
  //
  // currentUser.email === "frendsadmin@gmail.com"
  //
  // the user automatically reaches this section.
  //
  // =========================================================

  if (userRole === "admin") {
    return (
      <AdminDashboard />
    );
  }

  // =========================================================
  // NORMAL USER INTERFACE
  // =========================================================

  if (userRole === "user") {
    return (
      <div className="app frends-app">

        {/* =================================================
            HEADER
        ================================================= */}

        <Header
          firebaseConnected={
            firebaseConnected
          }

          onMenuToggle={
            handleMenuToggle
          }

          menuOpen={
            menuOpen
          }
        />

        {/* =================================================
            DARK OVERLAY
        ================================================= */}

        {page !== "map" && (
          <div
            className={`frends-map-menu-overlay ${
              menuOpen
                ? "open"
                : ""
            }`}
            onClick={closeMenu}
          ></div>
        )}

        {/* =================================================
            SLIDE-OUT NAVIGATION
        ================================================= */}

        {page !== "map" && (
          <aside
            className={`frends-map-menu ${
              menuOpen
                ? "open"
                : ""
            }`}
          >

            {/* =============================================
                MENU HEADER
            ============================================= */}

            <div className="frends-map-menu-header">

              <div>
                <span className="frends-map-menu-eyebrow">
                  FRENDS
                </span>

                <h3>
                  Navigation
                </h3>
              </div>

              <button
                type="button"
                className="frends-map-menu-close"
                onClick={closeMenu}
                aria-label="Close navigation"
              >
                ✕
              </button>

            </div>

            {/* =============================================
                MENU CONTENT
            ============================================= */}

            <nav className="frends-map-menu-content">

              {/* =========================================
                  MAIN
              ========================================= */}

              <div className="frends-map-menu-section">

                <p className="frends-map-menu-section-title">
                  MAIN
                </p>

                <button
                  type="button"
                  className={`frends-map-menu-item ${
                    page === "map"
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    handlePageChange("map")
                  }
                >
                  <span className="frends-map-menu-icon">
                    ◉
                  </span>

                  <span>
                    Map
                  </span>
                </button>

              </div>

              {/* =========================================
                  MONITORING
              ========================================= */}

              <div className="frends-map-menu-section">

                <p className="frends-map-menu-section-title">
                  MONITORING
                </p>

                {/* FLOOD */}

                <button
                  type="button"
                  className={`frends-map-menu-item ${
                    page === "flood"
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    handlePageChange("flood")
                  }
                >
                  <span className="frends-map-menu-icon">
                    ≋
                  </span>

                  <span>
                    Flood
                  </span>
                </button>

                {/* TRAFFIC */}

                <button
                  type="button"
                  className={`frends-map-menu-item ${
                    page === "traffic"
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    handlePageChange("traffic")
                  }
                >
                  <span className="frends-map-menu-icon">
                    🚦
                  </span>

                  <span>
                    Traffic
                  </span>
                </button>

                {/* NEWS */}

                <button
                  type="button"
                  className={`frends-map-menu-item ${
                    page === "dashboard"
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    handlePageChange(
                      "dashboard"
                    )
                  }
                >
                  <span className="frends-map-menu-icon">
                    ◫
                  </span>

                  <span>
                    News
                  </span>
                </button>

              </div>

              {/* =========================================
                  INFORMATION
              ========================================= */}

              <div className="frends-map-menu-section">

                <p className="frends-map-menu-section-title">
                  INFORMATION
                </p>

                {/* ABOUT FRENDS */}

                <button
                  type="button"
                  className={`frends-map-menu-item ${
                    page === "about"
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    handlePageChange(
                      "about"
                    )
                  }
                >
                  <span className="frends-map-menu-icon">
                    ℹ
                  </span>

                  <span>
                    About FRENDS
                  </span>
                </button>

                {/* LOGOUT */}

                <button
                  type="button"
                  className="frends-map-menu-item"
                  onClick={
                    handleLogout
                  }
                >
                  <span className="frends-map-menu-icon">
                    ↪
                  </span>

                  <span>
                    Logout
                  </span>
                </button>

              </div>

            </nav>

            {/* =============================================
                MENU FOOTER
            ============================================= */}

            <div className="frends-map-menu-footer">

              <span className="frends-map-menu-status-dot"></span>

              <span>
                FRENDS map is active
              </span>

            </div>

          </aside>
        )}

        {/* =================================================
            MAP PAGE
        ================================================= */}

        {page === "map" && (
          <div className="frends-map-app">

            <MapSection
              onNavigate={
                handlePageChange
              }

              onLogout={
                handleLogout
              }
            />

          </div>
        )}

        {/* =================================================
            ABOUT PAGE
        ================================================= */}

        {page === "about" && (
          <div className="app-page">

            <AboutUs
              onBack={() =>
                handlePageChange(
                  "map"
                )
              }
            />

          </div>
        )}

        {/* =================================================
            OTHER FRENDS INTERFACES
        ================================================= */}

        {page !== "map" &&
          page !== "about" && (
            <>
              <main className="main-content">

                {/* =========================================
                    NEWS / DASHBOARD
                ========================================= */}

                {page === "dashboard" && (
                  <MonitoringSection />
                )}

                {/* =========================================
                    TRAFFIC
                ========================================= */}

                {page === "traffic" && (
                  <TrafficHeroSection />
                )}

                {/* =========================================
                    FLOOD
                ========================================= */}

                {page === "flood" && (
                  <div className="page-section">

                    <h3>
                      Flood Monitoring
                    </h3>

                    <p>
                      Select a monitoring
                      node to view current
                      flood information.
                    </p>

                    <NodesSection
                      nodes={
                        Object.values(nodes)
                      }

                      loading={
                        loading
                      }

                      error={
                        error
                      }
                    />

                  </div>
                )}

                {/* =========================================
                    NODES
                ========================================= */}

                {page === "nodes" && (
                  <NodesSection
                    nodes={
                      Object.values(nodes)
                    }

                    loading={
                      loading
                    }

                    error={
                      error
                    }
                  />
                )}

              </main>

              {/* =============================================
                  FOOTER
              ============================================= */}

              <Footer
                onAboutClick={() =>
                  handlePageChange(
                    "about"
                  )
                }
              />
            </>
          )}

      </div>
    );
  }

  // =========================================================
  // FALLBACK
  // =========================================================

  return (
    <div className="app-loading">

      <div className="loading-spinner"></div>

      <p>
        Loading FRENDS...
      </p>

    </div>
  );
}

export default App;