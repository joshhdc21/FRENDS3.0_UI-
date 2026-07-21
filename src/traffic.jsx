import { useEffect, useState } from "react";

import Header from "./components/Header";
import HeroSection from "./components/trafficherosection";
import TrafficSection from "./components/TrafficSection";
import NodesSection from "./components/NodesSection";
import NewsSection from "./components/NewsSection";
import Footer from "./components/Footer";

import {
  subscribeToTraffic,
} from "./services/trafficService";

import "./App.css";

function trafficservice() {
  const [trafficData, setTrafficData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToTraffic(
      (data) => {
        setTrafficData(data);
        setLoading(false);
        setError("");
      },
      (err) => {
        setLoading(false);
        setError(err.message);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <div className="app">

      <Header connected={!error} />

      <main className="main-content">

        <HeroSection />

        <TrafficSection
          traffic={trafficData}
          loading={loading}
          error={error}
        />

        <NodesSection />

        <FloodLevelSection />

        <WeatherSection />

        <NewsSection />

      </main>

      <Footer />

    </div>
  );
}

export default trafficService;