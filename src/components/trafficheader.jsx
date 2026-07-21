export default function Header({ connected }) {
  return (
    <header className="topbar">

      <div className="brand">

        <div className="brand-logo">
          <span className="logo-main">🚦</span>
        </div>

        <div className="brand-text">
          <h1>FRENDS</h1>
          <p>Flood & Road Navigation Decision System</p>
        </div>

      </div>

      <nav className="navigation">
        <a href="#home">Home</a>
        <a href="#traffic">Traffic</a>
        <a href="#nodes">Nodes</a>
        <a href="#flood">Flood</a>
        <a href="#weather">Weather</a>
        <a href="#news">News</a>
      </nav>

      <div
        className={`connection-status ${
          connected ? "connected" : "disconnected"
        }`}
      >
        <span className="status-dot"></span>

        {connected
          ? "Firebase Connected"
          : "Disconnected"}
      </div>

    </header>
  );
}