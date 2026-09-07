import React from "react";
import "./AboutUs.css";

function AboutUs({ onBack }) {
  return (
    <div className="about-page">

      {/* ================================
          HEADER
      ================================= */}
      <div className="about-header">
        <button className="about-back-btn" onClick={onBack}>
          ← Back
        </button>

        <div className="about-header-content">
          <span className="about-label">ABOUT FRENDS</span>

          <h1>Our Story</h1>

          <p>
            Discover the history, purpose, and people behind FRENDS —
            a smart flood monitoring and navigation system designed
            for safer journeys.
          </p>
        </div>
      </div>


      {/* ================================
          ABOUT FRENDS
      ================================= */}
      <section className="about-section">

        <div className="section-title">
          <span>01</span>
          <h2>What is FRENDS?</h2>
        </div>

        <div className="about-intro">

          <div className="about-intro-text">

            <h3>
              Making Every Journey Safer
            </h3>

            <p>
              FRENDS is a smart flood monitoring and navigation system
              developed to help people make safer and more informed
              travel decisions, especially during heavy rainfall and
              flooding.
            </p>

            <p>
              The system combines real-time flood monitoring,
              traffic information, and navigation technologies to
              provide users with updated information about road
              conditions.
            </p>

            <p>
              Through the integration of sensors, Firebase, and a
              mobile application, FRENDS transforms collected
              environmental data into useful information that can
              assist commuters and motorists in choosing safer routes.
            </p>

          </div>


          <div className="about-highlight">

            <div className="highlight-icon">
              🌊
            </div>

            <h3>
              FRENDS
            </h3>

            <p>
              Real-time flood and traffic information for smarter
              travel decisions in Metro Manila.
            </p>

          </div>

        </div>

      </section>


      {/* ================================
          HISTORY
      ================================= */}
      <section className="about-section history-section">

        <div className="section-title">
          <span>02</span>
          <h2>The History of FRENDS</h2>
        </div>


        <div className="history-container">

          {/* HISTORY 01 */}
          <div className="history-item">

            <div className="history-number">
              01
            </div>

            <div className="history-content">

              <span className="history-tag">
                THE BEGINNING
              </span>

              <h3>
                Identifying the Problem
              </h3>

              <p>
                FRENDS began from the recognition of a common problem
                faced by commuters and motorists in Metro Manila:
                unpredictable flooding and its effect on daily
                transportation.
              </p>

              <p>
                During heavy rainfall, flood conditions can change
                rapidly. Without accurate and timely information,
                travelers may unknowingly enter flooded roads or
                experience significant delays.
              </p>

            </div>

          </div>


          {/* HISTORY 02 */}
          <div className="history-item">

            <div className="history-number">
              02
            </div>

            <div className="history-content">

              <span className="history-tag">
                DEVELOPMENT
              </span>

              <h3>
                Building a Smart Monitoring System
              </h3>

              <p>
                The concept evolved into a smart monitoring system
                capable of collecting flood-level information through
                connected sensors.
              </p>

              <p>
                The collected data could then be transmitted and
                processed to provide users with real-time information
                about flood conditions.
              </p>

            </div>

          </div>


          {/* HISTORY 03 */}
          <div className="history-item">

            <div className="history-number">
              03
            </div>

            <div className="history-content">

              <span className="history-tag">
                FRENS 2.0
              </span>

              <h3>
                Expanding the System
              </h3>

              <p>
                FRENDS continued to evolve by introducing additional
                capabilities for monitoring and presenting flood
                information in a more accessible way.
              </p>

              <p>
                The system moved toward a more connected approach,
                allowing monitored information to become available
                through a digital interface.
              </p>

            </div>

          </div>


          {/* HISTORY 04 */}
          <div className="history-item">

            <div className="history-number">
              04
            </div>

            <div className="history-content">

              <span className="history-tag">
                FRENDS 
              </span>

              <h3>
                A Smarter Approach to Travel
              </h3>

              <p>
                FRENDS builds upon the previous versions by
                combining flood monitoring with traffic information
                and smart navigation.
              </p>

              <p>
                Its goal is to provide travelers with real-time
                information that can support safer and smarter
                transportation decisions.
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* ================================
          HOW FRENDS WORKS
      ================================= */}
      <section className="about-section">

        <div className="section-title">
          <span>03</span>
          <h2>How FRENDS Works</h2>
        </div>


        <div className="feature-grid">

          {/* FLOOD MONITORING */}
          <div className="feature-card">

            <div className="feature-icon">
              🌊
            </div>

            <h3>
              Flood Monitoring
            </h3>

            <p>
              Sensors monitor water levels and provide real-time
              information about flood conditions.
            </p>

          </div>


          {/* TRAFFIC MONITORING */}
          <div className="feature-card">

            <div className="feature-icon">
              🚦
            </div>

            <h3>
              Traffic Monitoring
            </h3>

            <p>
              Traffic information helps users understand current
              road conditions and possible delays.
            </p>

          </div>


          {/* SMART NAVIGATION */}
          <div className="feature-card">

            <div className="feature-icon">
              🗺️
            </div>

            <h3>
              Smart Navigation
            </h3>

            <p>
              The system helps users identify safer and more suitable
              routes based on available road information.
            </p>

          </div>


          {/* LIVE UPDATES */}
          <div className="feature-card">

            <div className="feature-icon">
              ⚡
            </div>

            <h3>
              Live Updates
            </h3>

            <p>
              Information is continuously updated to help users make
              decisions using the latest available data.
            </p>

          </div>

        </div>

      </section>


      {/* ================================
          MISSION & VISION
      ================================= */}
      <section className="about-section mission-section">

        {/* MISSION */}
        <div className="mission-card">

          <span>
            OUR MISSION
          </span>

          <h2>
            Empower safer travel through
            real-time information.
          </h2>

          <p>
            FRENDS aims to provide accessible and reliable
            environmental and transportation information that can
            help individuals make better travel decisions during
            flooding and adverse weather conditions.
          </p>

        </div>


        {/* VISION */}
        <div className="mission-card vision-card">

          <span>
            OUR VISION
          </span>

          <h2>
            A safer and smarter
            transportation environment.
          </h2>

          <p>
            We envision a connected transportation environment where
            real-time flood, traffic, and navigation information
            contributes to safer and more efficient journeys.
          </p>

        </div>

      </section>


      {/* ================================
          AUTHORS
      ================================= */}
      <section className="about-section authors-section">

        <div className="section-title">
          <span>04</span>
          <h2>The Authors</h2>
        </div>


        <p className="authors-description">
          FRENDS is the result of the collaboration, research, and
          development of its student authors.
        </p>


        <div className="authors-grid">

          {/* =========================
              AUTHOR 1
          ========================== */}
          <div className="author-card">

            <div className="author-photo">
              <span>👤</span>
            </div>

            <div className="author-info">

              <h3>
                Joshua B. Dela Cruz
              </h3>

              <span className="author-role">
                Project Lead, Embedded System Developer &
                Software Verification Head
              </span>

              <p>
                Leads the FRENDS project while contributing to
                embedded system development and software
                verification.
              </p>

            </div>

          </div>


          {/* =========================
              AUTHOR 2
          ========================== */}
          <div className="author-card">

            <div className="author-photo">
              <span>👤</span>
            </div>

            <div className="author-info">

              <h3>
                Clarabelle D. Bismonte
              </h3>

              <span className="author-role">
                Front End & Backend Developer
              </span>

              <p>
                Responsible for developing the front-end and
                backend components of the FRENDS platform and
                integrating its core system functionalities.
              </p>

            </div>

          </div>


          {/* =========================
              AUTHOR 3
          ========================== */}
          <div className="author-card">

            <div className="author-photo">
              <span>👤</span>
            </div>

            <div className="author-info">

              <h3>
                Kris Edward P. Castro
              </h3>

              <span className="author-role">
                Hardware & Physical Prototype Developer
              </span>

              <p>
                Develops the hardware components and physical
                prototype of the FRENDS flood monitoring system.
              </p>

            </div>

          </div>


          {/* =========================
              AUTHOR 4
          ========================== */}
          <div className="author-card">

            <div className="author-photo">
              <span>👤</span>
            </div>

            <div className="author-info">

              <h3>
                Karl Arthur Von T. Gomez
              </h3>

              <span className="author-role">
                Navigation & Routing Developer
              </span>

              <p>
                Develops the navigation and routing functionalities
                of FRENDS to support safer and more efficient
                travel.
              </p>

            </div>

          </div>


          {/* =========================
              AUTHOR 5
          ========================== */}
          <div className="author-card">

            <div className="author-photo">
              <span>👤</span>
            </div>

            <div className="author-info">

              <h3>
                Daphne Grace M. Villagrvo
              </h3>

              <span className="author-role">
                Documentation, Hardware & Power Battery System
              </span>

              <p>
                Handles project documentation while contributing
                to the hardware and power battery system of FRENDS.
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* ================================
          CLOSING
      ================================= */}
      <section className="about-closing">

        <div className="closing-content">

          <span>
            FRENDS
          </span>

          <h2>
            Make Every Journey Safer.
          </h2>

          <p>
            Real-time flood and traffic information for smarter
            travel decisions in Metro Manila.
          </p>

          <button
            className="closing-button"
            onClick={onBack}
          >
            Return to FRENDS
          </button>

        </div>

      </section>

    </div>
  );
}

export default AboutUs;