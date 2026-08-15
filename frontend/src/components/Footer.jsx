function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      {/* Project Information */}
      <div className="footer-brand">
        <h2>Frends 3.0</h2>

        <p className="footer-subtitle">
          Multi-node Smart Flood Monitoring System
        </p>

        <small>
          Frends 3.0 is a web-based flood monitoring platform that provides
          real-time water level monitoring, traffic updates, and route guidance
          using smart sensor nodes and cloud-based data synchronization.
        </small>
      </div>

      {/* System Information */}
      <div className="footer-info">
        <h4>System Information</h4>

        <p><strong>Version:</strong> 3.0</p>
        <p><strong>Status:</strong> Operational</p>
        
      </div>

      {/* Copyright */}
      <div className="footer-copy">
        <h4>Project</h4>

        <p>Technological University of the Philippines – Manila</p>

        <br />

        <p>© {currentYear} Frends 3.0</p>
        <small>All Rights Reserved.</small>
      </div>
    </footer>
  );
}

export default Footer;