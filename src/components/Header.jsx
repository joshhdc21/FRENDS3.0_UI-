import { useState, useEffect } from "react";

function Header({ firebaseConnected }) {
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();

      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      };

      setCurrentDate(now.toLocaleString("en-US", options));
    };

    updateDate(); // Initial update

    const interval = setInterval(updateDate, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-logo">
          <span className="logo-main">F3</span>
        </div>

        <div className="brand-text">
          <h1>Frends 3.0</h1>
          <p>Smart Flood Monitoring System</p>
        </div>
      </div>

      <div className="header-right">

        {/* Live Date */}
        <div className="live-date">
          <span>{currentDate}</span>
        </div>

        {/* Firebase Status */}
        <div
          className={`connection-status ${
            firebaseConnected ? "connected" : "disconnected"
          }`}
        >
          <span className="status-dot"></span>

          <span>
            {firebaseConnected
              ? "Firebase Connected"
              : "Firebase Disconnected"}
          </span>
        </div>

      </div>
    </header>
  );
}

export default Header;