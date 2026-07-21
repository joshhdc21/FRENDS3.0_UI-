import { useState } from "react";

import Header from "./components/Header";
import Footer from "./components/Footer";
import MonitoringSection from "./components/MonitoringSection";
import TrafficHeroSection from "./components/trafficherosection";
import FloodLevelSection from "./components/FloodLevelSection";
import NodesSection from "./components/NodesSection";
import DeviceSection from "./components/DeviceSection";
import NewsSection from "./components/NewsSection";

import "./App.css";

function App() {
  const [page, setPage] = useState("dashboard");

  // Temporary data for NodesSection
  const [nodes] = useState([]);
  const [loading] = useState(false);
  const [error] = useState(null);

  // Temporary Firebase connection status
  const [firebaseConnected] = useState(false);

  return (
    <div className="app">
      <Header
        page={page}
        setPage={setPage}
        firebaseConnected={firebaseConnected}
      />

      <main className="main-content">
        {page === "dashboard" && <MonitoringSection />}

        {page === "traffic" && <TrafficHeroSection />}

        {page === "flood" && <FloodLevelSection />}

        {page === "nodes" && (
          <NodesSection
            nodes={nodes}
            loading={loading}
            error={error}
          />
        )}

        {page === "devices" && <DeviceSection />}

        {page === "news" && <NewsSection />}
      </main>

      <Footer />
    </div>
  );
}

export default App;