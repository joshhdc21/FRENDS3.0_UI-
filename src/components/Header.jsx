import { useState, useEffect } from "react";

// Dynamically resolve image asset path
const frendsLogo = new URL("../assets/frends.png", import.meta.url).href;

function Header({
  firebaseConnected,
  onMenuToggle,
  menuOpen = false,
}) {
  const [currentTime, setCurrentTime] = useState("");

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

  return (
    <header className="topbar">

      {/* LEFT SIDE */}
      <div className="brand">

        {/* MENU BUTTON */}
        <button
          type="button"
          className={`header-menu-button ${
            menuOpen ? "menu-open" : ""
          }`}
          onClick={onMenuToggle}
          aria-label={
            menuOpen
              ? "Close navigation menu"
              : "Open navigation menu"
          }
          aria-expanded={menuOpen}
          title={
            menuOpen
              ? "Close menu"
              : "Open menu"
          }
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        {/* FRENDS LOGO ONLY */}
        <div className="brand-logo-container">
          <img
            src={frendsLogo}
            alt="FRENDS"
            className="header-frends-logo"
          />
        </div>

      </div>

      {/* RIGHT SIDE */}
      <div className="header-right">

        {/* FIREBASE CONNECTION */}
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

      </div>

    </header>
  );
}

export default Header;