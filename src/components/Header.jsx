function Header({ firebaseConnected }) {
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

        <div className="weather-widget">
          <span className="weather-icon">🌤️</span>

          <div className="weather-info">
            <h4>30°C</h4>
            <p>Mostly Sunny</p>
          </div>
        </div>

        <div
          className={`connection-status ${
            firebaseConnected ? "connected" : "disconnected"
          }`}
        >
          <span className="status-dot"></span>

          <span>
            {firebaseConnected
              ? "FirebaseConnected"
              : "Firebase Disconnected"}
          </span>
        </div>

      </div>
    </header>
  );
}

export default Header;