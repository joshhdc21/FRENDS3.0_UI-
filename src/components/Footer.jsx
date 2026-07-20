function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div>
        <strong>Frends 3.0</strong>
        <p>Multi-node smart flood monitoring system</p>
      </div>

      <div className="footer-links">
        <a href="#monitoring">Overview</a>
        <a href="#nodes">Nodes</a>
        <a href="#flood-level">Flood Guide</a>
        <a href="#device">Devices</a>
      </div>

      <p className="copyright">
        © {currentYear} Frends 3.0
      </p>
    </footer>
  );
}

export default Footer;