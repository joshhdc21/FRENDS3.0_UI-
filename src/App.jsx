import { useState } from "react";

import Header from "./components/Header";
import Footer from "./components/Footer";
import MonitoringSection from "./components/MonitoringSection";
import trafficherosection from "./components/trafficherosection";
import FloodLevelSection from "./components/FloodLevelSection";
import NodeSection from "./components/NodeSection";
import DeviceSection from "./components/DeviceSection";
import NewsSection from "./components/NewsSection";

import "./App.css";

function App() {
  const [page, setPage] = useState("dashboard");

  return (
    <div className="app">
      <Header />

      {/* Navigation */}
      <nav className="top-nav" aria-label="Main navigation">
        <button
          type="button"
          className={page === "dashboard" ? "active" : ""}
          onClick={() => setPage("dashboard")}
        >
          Dashboard
        </button>

        <button
          type="button"
          className={page === "traffic" ? "active" : ""}
          onClick={() => setPage("traffic")}
        >
          Traffic
        </button>

        <button
          type="button"
          className={page === "flood" ? "active" : ""}
          onClick={() => setPage("flood")}
        >
          Flood
        </button>

        <button
          type="button"
          className={page === "nodes" ? "active" : ""}
          onClick={() => setPage("nodes")}
        >
          Nodes
        </button>

        <button
          type="button"
          className={page === "devices" ? "active" : ""}
          onClick={() => setPage("devices")}
        >
          Devices
        </button>

        <button
          type="button"
          className={page === "news" ? "active" : ""}
          onClick={() => setPage("news")}
        >
          News
        </button>
      </nav>

      <main className="main-content">
        {page === "dashboard" && <MonitoringSection />}

        {page === "traffic" && <trafficherosection />}

        {page === "flood" && <FloodLevelSection />}

        {page === "nodes" && <NodeSection />}

        {page === "devices" && <DeviceSection />}

        {page === "news" && <NewsSection />}
      </main>

      <Footer />
    </div>
  );
}

export default App;