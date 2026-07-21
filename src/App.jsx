import { useState } from "react";

import Header from "./components/Header";
import Footer from "./components/Footer";
import MonitoringSection from "./components/MonitoringSection";
import trafficherosection from "./components/trafficherosection";
import FloodLevelSection from "./components/FloodLevelSection";
import DeviceSection from "./components/DeviceSection";
import NewsSection from "./components/NewsSection";

import "./App.css";


function App() {

  const [page, setPage] = useState("dashboard");
 

  return (

    <div className="app">

      <Header />


      {/* Navigation */}
      <nav className="top-nav">

        <button onClick={() => setPage("dashboard")}>
          Dashboard
        </button>


        <button onClick={() => setPage("traffic")}>
          Traffic
        </button>


        <button onClick={() => setPage("flood")}>
          Flood
        </button>


        <button onClick={() => setPage("devices")}>
          Devices
        </button>


        <button onClick={() => setPage("news")}>
          News
        </button>


      </nav>


      <main className="main-content">


        {page === "dashboard" && (
          <MonitoringSection />
        )}


        {page === "traffic" && (
          <>
            <trafficherosection />
          </>
        )}


        {page === "flood" && (
          <FloodLevelSection />
        )}


        {page === "devices" && (
          <DeviceSection />
        )}


        {page === "news" && (
          <NewsSection />
        )}


      </main>


      <Footer />


    </div>

  );

}


export default App;