import { useEffect, useState } from "react";

import Header from "./components/Header";
import MonitoringSection from "./components/MonitoringSection";
import NodesSection from "./components/NodesSection";
import FloodLevelSection from "./components/FloodLevelSection";
import DeviceSection from "./components/DeviceSection";
import NewsSection from "./components/NewsSection";
import Footer from "./components/Footer";

import {
  createSampleNodes,
  subscribeToNodes,
} from "./services/nodeService";

import "./App.css";

function App() {
  const [nodes, setNodes] = useState([]);
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToNodes(
      (firebaseNodes) => {
        setNodes(firebaseNodes);
        setFirebaseLoading(false);
        setFirebaseError("");
      },
      (error) => {
        setFirebaseError(error.message);
        setFirebaseLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  async function handleCreateSampleNodes() {
    try {
      setFirebaseError("");
      await createSampleNodes();
    } catch (error) {
      console.error(error);
      setFirebaseError(error.message);
    }
  }

  return (
    <div className="app">
      <Header firebaseConnected={!firebaseError} />

      <main className="main-content">
        <MonitoringSection />

        <div className="firebase-test-panel">
          <div>
            <strong>Firebase connection test</strong>

            <p>
              Create ten sample nodes in Realtime Database.
            </p>
          </div>

          <button
            type="button"
            className="firebase-test-button"
            onClick={handleCreateSampleNodes}
          >
            Create sample nodes
          </button>
        </div>

        <NodesSection
          nodes={nodes}
          loading={firebaseLoading}
          error={firebaseError}
        />

        <FloodLevelSection />
        <DeviceSection />
        <NewsSection />
      </main>

      <Footer />
    </div>
  );
}

export default App;