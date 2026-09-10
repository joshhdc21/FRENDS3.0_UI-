import React from "react";
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">

      {/* =========================================
          FOOTER CONTAINER
      ========================================= */}

      <div className="footer-container">

        {/* =========================================
            FRENDS BRAND
        ========================================= */}

        <div className="footer-brand">

          <div className="footer-logo">
            FRENDS
          </div>

          <p>
            Real-time flood and traffic information
            for smarter travel decisions in Metro Manila.
          </p>

        </div>

        {/* =========================================
            FRENDS INFORMATION
        ========================================= */}

        <div className="footer-column">

          <h3>About FRENDS</h3>

          <p>
            FRENDS is a flood monitoring and smart
            navigation system designed to provide
            real-time information for safer and
            smarter journeys in Metro Manila.
          </p>

        </div>

      </div>

      {/* =========================================
          FOOTER BOTTOM
      ========================================= */}

      <div className="footer-bottom">

        <p>
          © {new Date().getFullYear()} FRENDS.
          All Rights Reserved.
        </p>

        <p>
          Flood Monitoring & Smart Navigation System
        </p>

      </div>

    </footer>
  );
}

export default Footer;