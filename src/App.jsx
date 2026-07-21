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
  const [nodes] = useState([
  {
    id: "NODE-01",
    location: "Area 1 - North Entrance",
    waterLevel: 4,
    pressure: 1013.2,
    battery: 8.1,
    status: "online",
    timestamp: Date.now(),
  },
  {
    id: "NODE-02",
    location: "Area 2 - Main Road",
    waterLevel: 13,
    pressure: 1014.1,
    battery: 7.9,
    status: "online",
    timestamp: Date.now(),
  },
  {
    id: "NODE-03",
    location: "Area 3 - Bridge",
    waterLevel: 28,
    pressure: 1015.4,
    battery: 7.8,
    status: "online",
    timestamp: Date.now(),
  },
  {
    id: "NODE-04",
    location: "Area 4 - Riverside",
    waterLevel: 56,
    pressure: 1017.2,
    battery: 7.5,
    status: "online",
    timestamp: Date.now(),
  },
  {
    id: "NODE-05",
    location: "Area 5 - Market Road",
    waterLevel: 9,
    pressure: 1013.8,
    battery: 8.0,
    status: "online",
    timestamp: Date.now(),
  },
  {
    id: "NODE-06",
    location: "Area 6 - School Zone",
    waterLevel: 18,
    pressure: 1014.7,
    battery: 7.7,
    status: "online",
    timestamp: Date.now(),
  },
  {
    id: "NODE-07",
    location: "Area 7 - Residential Road",
    waterLevel: 35,
    pressure: 1016.3,
    battery: 7.6,
    status: "online",
    timestamp: Date.now(),
  },
  {
    id: "NODE-08",
    location: "Area 8 - Drainage Channel",
    waterLevel: 7,
    pressure: 1013.5,
    battery: 8.2,
    status: "online",
    timestamp: Date.now(),
  },
  {
    id: "NODE-09",
    location: "Area 9 - Low-Lying Road",
    waterLevel: 48,
    pressure: 1016.8,
    battery: 7.4,
    status: "online",
    timestamp: Date.now(),
  },
  {
    id: "NODE-10",
    location: "Area 10 - South Entrance",
    waterLevel: 0,
    pressure: 0,
    battery: 0,
    status: "offline",
    timestamp: Date.now(),
  },
]);
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