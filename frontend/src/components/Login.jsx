import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase/firebaseConfig";
import CreateAccount from "./CreateAccount";
import "../../Login.css";

// =========================================
// IMPORT YOUR LOGO HERE
// =========================================
import frendsLogo from "../assets/frendslogo.png";

function Login() {
  const [introFinished, setIntroFinished] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function handleStartUp() {
    setIntroFinished(true);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setSuccess("Login successful!");
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setSuccess("");
    setGoogleLoading(true);

    try {
      await signInWithPopup(auth, googleProvider);
      setSuccess("Google login successful!");
    } catch (error) {
      console.error("Google login error:", error);
      setError("Unable to sign in with Google.");
    } finally {
      setGoogleLoading(false);
    }
  }

  function openCreateAccount() {
    setError("");
    setSuccess("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setShowCreateAccount(true);
  }

  function backToLogin() {
    setShowCreateAccount(false);
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setError("");
    setSuccess("");
  }

  if (showCreateAccount) {
    return <CreateAccount onBackToLogin={backToLogin} />;
  }

  const isLoading = loading || googleLoading;

  return (
    <div className={`login-page ${introFinished ? "intro-finished" : "intro-active"}`}>
      <div className="login-background">
        <div className="background-circle circle-one"></div>
        <div className="background-circle circle-two"></div>
        <div className="background-circle circle-three"></div>
        <div className="background-wave wave-one"></div>
        <div className="background-wave wave-two"></div>
      </div>

      {/* =====================================
          SPLASH SCREEN (WITH LOGO)
      ===================================== */}
      <div className={`login-intro ${introFinished ? "intro-hide" : ""}`}>
        
        {/* LOGO IS PLACED HERE */}
        <div className="intro-logo">
          <img src={frendsLogo} alt="FRENDS Logo" className="splash-logo" />
        </div>

        <p>Flood Road Eye and Navigation Detection System</p>
        
        <div className="intro-loading">
          <span></span>
        </div>
        
        <button type="button" className="intro-start-button" onClick={handleStartUp}>
          <span>START UP</span>
          <span className="start-button-arrow">→</span>
        </button>
      </div>

      {/* =====================================
          LOGIN CARD (NO LOGO)
      ===================================== */}
      <div className={`login-card ${introFinished ? "card-show" : "card-hidden"}`}>
        
        {/* NO LOGO HERE, JUST TEXT */}
        <div className="login-header">
          <p className="card-subtitle"> WELCOME TO FRENDS </p>
        </div>

        <div className="system-status">
          <span className="status-dot"></span>
          <span>Monitoring System Online</span>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className={`login-field email-field ${introFinished ? "field-show" : ""}`}>
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <span className="input-icon" aria-hidden="true">✉</span>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className={`login-field password-field ${introFinished ? "field-show" : ""}`}>
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <span className="input-icon" aria-hidden="true">🔒</span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                required
                minLength={6}
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? "👁" : "👁"}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-message login-error" role="alert">
              <span>⚠</span><p>{error}</p>
            </div>
          )}
          {success && (
            <div className="login-message login-success" role="status">
              <span>✓</span><p>{success}</p>
            </div>
          )}

          <button type="submit" className={`login-button ${introFinished ? "button-show" : ""}`} disabled={isLoading}>
            {loading ? (
              <><span className="spinner"></span><span>Signing in...</span></>
            ) : (
              <><span>Login</span><span className="button-arrow">→</span></>
            )}
          </button>
        </form>

        <div className={`login-switch ${introFinished ? "content-show" : ""}`}>
          <span>Don't have an account?</span>
          <button type="button" onClick={openCreateAccount} disabled={isLoading}>Create Account</button>
        </div>

        <div className={`login-divider ${introFinished ? "content-show" : ""}`}>
          <span></span><p>OR</p><span></span>
        </div>

        <button type="button" className={`google-login-button ${introFinished ? "content-show" : ""}`} onClick={handleGoogleLogin} disabled={isLoading}>
          {googleLoading ? (
            <><span className="spinner"></span><span>Connecting...</span></>
          ) : (
            <><span className="google-icon">G</span><span>Continue with Google</span></>
          )}
        </button>

        <div className={`login-footer ${introFinished ? "content-show" : ""}`}>
          <small>Real-Time Flood &amp; Traffic Monitoring</small>
          <div className="footer-status">
            <span className="status-dot"></span>System Ready
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;