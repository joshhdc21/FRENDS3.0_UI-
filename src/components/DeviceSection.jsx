function DeviceSection() {
  return (
    <section id="device" className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">DEVICE INFORMATION</p>
          <h3>ESP32-C3 monitoring unit</h3>
        </div>

        <span className="offline-badge">Offline</span>
      </div>

      <div className="device-grid">
        <article className="device-information-card">
          <div className="information-row">
            <span>Device ID</span>
            <strong>esp32-c3-01</strong>
          </div>

          <div className="information-row">
            <span>Sensor</span>
            <strong>MS5540C pressure sensor</strong>
          </div>

          <div className="information-row">
            <span>Communication</span>
            <strong>Wi-Fi / Air780E cellular</strong>
          </div>

          <div className="information-row">
            <span>Last update</span>
            <strong>No data received</strong>
          </div>

          <div className="information-row">
            <span>Firebase status</span>
            <strong>Not connected</strong>
          </div>
        </article>

        <article className="device-condition-card">
          <span className="device-icon">ESP</span>

          <div>
            <p className="eyebrow">DEVICE CONDITION</p>
            <h4>Monitoring unit is offline</h4>

            <p>
              Connect the website to Firebase and upload sensor readings from
              the ESP32 to begin real-time monitoring.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

export default DeviceSection;