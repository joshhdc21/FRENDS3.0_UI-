import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "./firebase/firebaseConfig";

import Header from "./components/Header";
import Footer from "./components/Footer";
import MonitoringSection from "./components/MonitoringSection";
import TrafficHeroSection from "./components/trafficherosection";
import FloodLevelSection from "./components/FloodLevelSection";
import NodesSection from "./components/NodesSection";
import DeviceSection from "./components/DeviceSection";
import NewsSection from "./components/NewsSection";
import BottomNavigation from "./components/BottomNavigation";
import MapSection from "./components/MapSection";

import "./App.css";

function App() {
  const [page, setPage] = useState("dashboard");

  // Live Firebase data
  const [nodes, setNodes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Firebase connection status
  const [firebaseConnected, setFirebaseConnected] = useState(false);

  useEffect(() => {
    const nodesRef = ref(database, "nodes");

    const unsubscribe = onValue(
      nodesRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setNodes(snapshot.val());
          setFirebaseConnected(true);
          setLoading(false);
          setError(null);
        } else {
          setNodes({});
          setFirebaseConnected(false);
          setLoading(false);
        }
      },
      (err) => {
        console.error("Firebase Error:", err);
        setError(err.message);
        setFirebaseConnected(false);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

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
            nodes={Object.values(nodes)}
            loading={loading}
            error={error}
          />
        )}

        {page === "devices" && <DeviceSection />}

        {page === "news" && <NewsSection />}

        {page === "map" && <MapSection />}
      </main>

      <BottomNavigation
        page={page}
        setPage={setPage}
      />

      <Footer />
    </div>
  );
}

export default App;