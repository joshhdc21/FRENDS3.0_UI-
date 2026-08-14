import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";

function Header({ firebaseConnected }) {
  const [currentTime, setCurrentTime] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  // =========================================
  // LIVE TIME
  // =========================================

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
    };

    updateTime();

    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // =========================================
  // LOGOUT
  // =========================================

  async function handleLogout() {
    try {
      setLoggingOut(true);

      await signOut(auth);

    } catch (error) {
      console.error("Logout error:", error);

      setLoggingOut(false);
    }
  }

  // =========================================
  // HEADER
  // =========================================

  return (
    <header className="topbar">

      {/* =====================================
          BRAND
      ===================================== */}

      <div className="brand">

        <div className="brand-logo">
          <span className="logo-main">
            F3
          </span>
        </div>

        <div className="brand-text">
          <h1>Frends 3.0</h1>

          <p>
            Smart Flood Monitoring System
          </p>
        </div>

      </div>


      {/* =====================================
          HEADER INFORMATION
      ===================================== */}

      <div className="header-right">

        {/* FIREBASE */}

        <div
          className={`connection-status ${
            firebaseConnected
              ? "connected"
              : "disconnected"
          }`}
          title={
            firebaseConnected
              ? "Firebase Connected"
              : "Firebase Disconnected"
          }
        >
          <span className="status-dot"></span>

          <span className="connection-text">
            {firebaseConnected
              ? "Connected"
              : "Disconnected"}
          </span>
        </div>


        {/* CURRENT TIME */}

        <div className="header-time">
          <span className="time-icon">
            🕐
          </span>

          <span>
            {currentTime}
          </span>
        </div>


        {/* LOGOUT */}

        <button
          type="button"
          className="logout-icon-button"
          onClick={handleLogout}
          disabled={loggingOut}
          title="Logout"
          aria-label="Logout"
        >
          ⎋
        </button>

      </div>

    </header>
  );
}

export default Header;