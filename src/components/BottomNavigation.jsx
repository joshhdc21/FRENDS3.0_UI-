function BottomNavigation({ page, setPage }) {
  return (
    <nav className="bottom-navigation">

      <button
        className={page === "dashboard" ? "active" : ""}
        onClick={() => setPage("dashboard")}
      >
        <small>Home</small>
      </button>

      <button
        className={page === "traffic" ? "active" : ""}
        onClick={() => setPage("traffic")}
      >
        <small>Traffic</small>
      </button>

      <button
        className={page === "flood" ? "active" : ""}
        onClick={() => setPage("flood")}
      >
        <small>Flood</small>
      </button>

      <button
        className={page === "nodes" ? "active" : ""}
        onClick={() => setPage("nodes")}
      >
        <small>Nodes</small>
      </button>

      <button
        className={page === "devices" ? "active" : ""}
        onClick={() => setPage("devices")}
      >
        <small>Devices</small>
      </button>

      <button
        className={page === "news" ? "active" : ""}
        onClick={() => setPage("news")}
      >
        <small>News</small>
      </button>

    </nav>
  );
}

export default BottomNavigation;