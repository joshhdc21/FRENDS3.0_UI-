function Header({ firebaseConnected, page, setPage }) {
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

      <nav className="navigation" aria-label="Main navigation">
        <button
          className={page === "dashboard" ? "active" : ""}
          onClick={() => setPage("dashboard")}
        >
          Dashboard
        </button>

        <button
          className={page === "traffic" ? "active" : ""}
          onClick={() => setPage("traffic")}
        >
          Traffic
        </button>

        <button
          className={page === "flood" ? "active" : ""}
          onClick={() => setPage("flood")}
        >
          Flood
        </button>

        <button
          className={page === "nodes" ? "active" : ""}
          onClick={() => setPage("nodes")}
        >
          Nodes
        </button>

        <button
          className={page === "devices" ? "active" : ""}
          onClick={() => setPage("devices")}
        >
          Devices
        </button>

        <button
          className={page === "news" ? "active" : ""}
          onClick={() => setPage("news")}
        >
          News
        </button>
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