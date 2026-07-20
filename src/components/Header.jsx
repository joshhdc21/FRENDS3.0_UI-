function Header({ firebaseConnected }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-logo">
          <span className="logo-main">F3</span>
        </div>

        <div className="brand-text">
          <h1>Frends 3.0</h1>
          <p>Smart fgfyfg by Flood Monitoring System</p>
        </div>
      </div>

      <nav className="navigation" aria-label="Main navigation">
        <a href="#monitoring">Overview</a>
        <a href="#nodes">Nodes</a>
        <a href="#flood-level">Flood Guide</a>
        <a href="#device">Devices</a>
        <a href="#news">News</a>
      </nav>

      <div
        className={`connection-status ${
          firebaseConnected ? "connected" : "disconnected"
        }`}
      >
        <span className="status-dot"></span>

        <span>
          {firebaseConnected
            ? "Firebase connected"
            : "Firebase disconnected"}
        </span>
      </div>
    </header>
  );
}

export default Header;