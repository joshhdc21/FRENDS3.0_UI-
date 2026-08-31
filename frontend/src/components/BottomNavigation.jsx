function BottomNavigation({ page, setPage }) {
  return (
    <nav className="bottom-navigation">

      {/* HOME */}
      <button
        className={page === "dashboard" ? "active" : ""}
        onClick={() => setPage("dashboard")}
      >
        <small>Home</small>
      </button>

      {/* TRAFFIC */}
      <button
        className={page === "traffic" ? "active" : ""}
        onClick={() => setPage("traffic")}
      >
        <small>Traffic</small>
      </button>

      {/* NODES */}
      <button
        className={page === "nodes" ? "active" : ""}
        onClick={() => setPage("nodes")}
      >
        <small>Flood</small>
      </button>

      {/* MAP */}
      <button
        className={page === "map" ? "active" : ""}
        onClick={() => setPage("map")}
      >
        <small>Map</small>
      </button>

    </nav>
  );
}

export default BottomNavigation;