import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import "./AdminDashboard.css";

function AdminDashboard() {
  // =========================================
  // LOGOUT
  // =========================================
  async function handleLogout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  return (
    <div className="admin-page">

      {/* =====================================
          ADMIN HEADER
      ===================================== */}
      <header className="admin-header">
        <div className="admin-brand">
          <div className="admin-logo">
            F
          </div>

          <div>
            <h1>FRENDS</h1>
            <span>ADMINISTRATOR</span>
          </div>
        </div>

        <button
          className="admin-logout"
          onClick={handleLogout}
        >
          <span>↪</span>
          Logout
        </button>
      </header>

      {/* =====================================
          MAIN CONTENT
      ===================================== */}
      <main className="admin-content">

        {/* WELCOME */}
        <section className="admin-welcome">
          <div>
            <p className="admin-label">
              ADMIN DASHBOARD
            </p>

            <h2>
              Welcome, Administrator
            </h2>

            <p>
              Manage and monitor the FRENDS
              flood and traffic monitoring system.
            </p>
          </div>

          <div className="admin-status">
            <span className="status-dot"></span>
            System Online
          </div>
        </section>

        {/* =====================================
            OVERVIEW CARDS
        ===================================== */}
        <section className="admin-overview">

          {/* FLOOD */}
          <div className="admin-card">
            <div className="admin-card-icon">
              💧
            </div>

            <div className="admin-card-info">
              <span>FLOOD MONITORING</span>
              <strong>Live</strong>
              <small>
                Monitor flood sensor data
              </small>
            </div>
          </div>

          {/* TRAFFIC */}
          <div className="admin-card">
            <div className="admin-card-icon">
              🚦
            </div>

            <div className="admin-card-info">
              <span>TRAFFIC MONITORING</span>
              <strong>Live</strong>
              <small>
                Monitor traffic conditions
              </small>
            </div>
          </div>

          {/* USERS */}
          <div className="admin-card">
            <div className="admin-card-icon">
              👥
            </div>

            <div className="admin-card-info">
              <span>USERS</span>
              <strong>Manage</strong>
              <small>
                Manage registered users
              </small>
            </div>
          </div>

          {/* NEWS */}
          <div className="admin-card">
            <div className="admin-card-icon">
              📰
            </div>

            <div className="admin-card-info">
              <span>NEWS</span>
              <strong>Manage</strong>
              <small>
                Manage system news
              </small>
            </div>
          </div>

        </section>

        {/* =====================================
            SYSTEM MONITORING
        ===================================== */}
        <section className="admin-section">

          <div className="admin-section-header">
            <div>
              <p className="admin-label">
                SYSTEM MONITORING
              </p>

              <h3>
                FRENDS System Status
              </h3>
            </div>

            <span className="live-badge">
              ● LIVE
            </span>
          </div>

          <div className="system-monitor-grid">

            <div className="monitor-item">
              <span className="monitor-title">
                Firebase Database
              </span>

              <strong className="online">
                Connected
              </strong>
            </div>

            <div className="monitor-item">
              <span className="monitor-title">
                Flood Sensors
              </span>

              <strong className="online">
                Active
              </strong>
            </div>

            <div className="monitor-item">
              <span className="monitor-title">
                Traffic API
              </span>

              <strong className="online">
                Active
              </strong>
            </div>

            <div className="monitor-item">
              <span className="monitor-title">
                News API
              </span>

              <strong className="online">
                Active
              </strong>
            </div>

          </div>
        </section>

        {/* =====================================
            ADMIN ACTIONS
        ===================================== */}
        <section className="admin-section">

          <div className="admin-section-header">
            <div>
              <p className="admin-label">
                ADMINISTRATION
              </p>

              <h3>
                System Management
              </h3>
            </div>
          </div>

          <div className="admin-actions">

            <button className="admin-action">
              <span>👥</span>

              <div>
                <strong>
                  User Management
                </strong>

                <small>
                  View and manage system users
                </small>
              </div>

              <b>→</b>
            </button>

            <button className="admin-action">
              <span>💧</span>

              <div>
                <strong>
                  Flood Monitoring
                </strong>

                <small>
                  View real-time flood sensor data
                </small>
              </div>

              <b>→</b>
            </button>

            <button className="admin-action">
              <span>🚦</span>

              <div>
                <strong>
                  Traffic Monitoring
                </strong>

                <small>
                  View current traffic conditions
                </small>
              </div>

              <b>→</b>
            </button>

            <button className="admin-action">
              <span>📰</span>

              <div>
                <strong>
                  News Management
                </strong>

                <small>
                  Manage flood and traffic news
                </small>
              </div>

              <b>→</b>
            </button>

          </div>
        </section>

      </main>

      {/* =====================================
          FOOTER
      ===================================== */}
      <footer className="admin-footer">
        <span>
          FRENDS — Flood Road Eye and Navigation
          Detection System
        </span>

        <span>
          Administrator Panel
        </span>
      </footer>

    </div>
  );
}

export default AdminDashboard;