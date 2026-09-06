import { useState, useEffect } from "react";

import {
  ref,
  onValue,
} from "firebase/database";

import {
  onAuthStateChanged,
} from "firebase/auth";

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
import AdminDashboard from "./components/AdminDashboard";

import MonitoringSection from "./components/MonitoringSection";
import TrafficHeroSection from "./components/trafficherosection";
import NodesSection from "./components/NodesSection";
import BottomNavigation from "./components/BottomNavigation";
import MapSection from "./components/MapSection";

// =========================================
// NEW - ABOUT US
// =========================================

import AboutUs from "./components/AboutUs";

import "./App.css";

// =========================================
// ADMIN ACCOUNT
// =========================================

const ADMIN_EMAIL = "frendsadmin@gmail.com";

function App() {

  // =========================================
  // PAGE NAVIGATION
  // =========================================

  const [page, setPage] = useState("dashboard");

  // =========================================
  // FIREBASE AUTHENTICATION
  // =========================================

  const [user, setUser] = useState(null);

  const [userRole, setUserRole] = useState(null);

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

  // =========================================================
  // FIREBASE AUTHENTICATION
  // =========================================================

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

          // =========================================
          // NOT LOGGED IN
          // =========================================

          if (!currentUser) {

            console.log(
              "No authenticated user."
            );

            setUser(null);

            setUserRole(null);

            setAuthLoading(false);

            setPage("dashboard");

            return;
          }

          // =========================================
          // USER LOGGED IN
          // =========================================

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
          // CHECK IF THIS IS THE SPECIFIC ADMIN ACCOUNT
          // =====================================================

          if (
            currentUser.email?.toLowerCase() ===
            ADMIN_EMAIL.toLowerCase()
          ) {

            console.log(
              "================================="
            );

            console.log(
              "ADMIN ACCOUNT DETECTED"
            );

            console.log(
              "Opening Admin Dashboard..."
            );

            console.log(
              "================================="
            );

            setUserRole("admin");

            setAuthLoading(false);

            return;
          }

          // =====================================================
          // NORMAL USER
          // =====================================================

          console.log(
            "Checking normal user account..."
          );

          const userRef =
            ref(
              database,
              `users/${currentUser.uid}`
            );

          const unsubscribeUser =
            onValue(

              userRef,

              (snapshot) => {

                console.log(
                  "User database data:",
                  snapshot.val()
                );

                // =========================================
                // USER RECORD EXISTS
                // =========================================

                if (snapshot.exists()) {

                  const userData =
                    snapshot.val();

                  console.log(
                    "User data:",
                    userData
                  );

                  // =========================================
                  // NORMAL USER
                  // =========================================

                  if (
                    userData.role === "user"
                  ) {

                    console.log(
                      "NORMAL USER ACCOUNT DETECTED"
                    );

                    setUserRole("user");

                  }

                  // =========================================
                  // NO VALID ROLE
                  // =========================================

                  else {

                    console.log(
                      "No valid user role found."
                    );

                    setUserRole("user");

                  }

                }

                // =========================================
                // DATABASE RECORD DOES NOT EXIST
                // =========================================

                else {

                  console.log(
                    "No database record found."
                  );

                  setUserRole("user");

                }

                // =========================================
                // FINISHED AUTH CHECK
                // =========================================

                setAuthLoading(false);

              },

              (firebaseError) => {

                console.error(
                  "Error reading user data:",
                  firebaseError
                );

                setUserRole("user");

                setAuthLoading(false);

              }
            );

          // =========================================
          // CLEANUP USER LISTENER
          // =========================================

          return () => {

            unsubscribeUser();

          };

        }
      );

    // =========================================
    // CLEANUP AUTH LISTENER
    // =========================================

    return () => {

      unsubscribeAuth();

    };

  }, []);

  // =========================================================
  // FIREBASE REALTIME DATABASE - NODES
  // =========================================================

  useEffect(() => {

    // =========================================
    // NO USER
    // =========================================

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

    const nodesRef =
      ref(
        database,
        "nodes"
      );

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

    // =========================================
    // CLEANUP
    // =========================================

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
  // ADMIN
  // =========================================================

  if (userRole === "admin") {

    console.log(
      "Rendering AdminDashboard..."
    );

    return (
      <AdminDashboard />
    );

  }

  // =========================================================
  // NORMAL USER
  // =========================================================

  if (userRole === "user") {

    console.log(
      "Rendering FRENDS User Interface..."
    );

    return (

      <div className="app">

        {/* =====================================
            ABOUT US PAGE
        ===================================== */}

        {page === "about" ? (

          <AboutUs
            onBack={() => setPage("dashboard")}
          />

        ) : (

          <>

            {/* =====================================
                HEADER
            ===================================== */}

            <Header
              page={page}
              setPage={setPage}
              firebaseConnected={firebaseConnected}
              user={user}
            />

            {/* =====================================
                MAIN CONTENT
            ===================================== */}

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

              {page === "map" && (

                <MapSection />

              )}

            </main>

            {/* =====================================
                BOTTOM NAVIGATION
            ===================================== */}

            <BottomNavigation
              page={page}
              setPage={setPage}
            />

            {/* =====================================
                FOOTER
            ===================================== */}

            <Footer
              onAboutClick={() => setPage("about")}
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