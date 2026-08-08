import { useState } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

import { auth } from "../services/firebase";
import "../../Login.css";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // =========================================
  // EMAIL + PASSWORD LOGIN
  // =========================================

  async function handleLogin(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      onLogin(userCredential.user);
    } catch (error) {
      console.error(error);
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  // =========================================
  // GOOGLE LOGIN
  // =========================================

  async function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);

      onLogin(result.user);
    } catch (error) {
      console.error(error);

      if (error.code === "auth/popup-closed-by-user") {
        setError("Google sign-in was cancelled.");
      } else {
        setError("Unable to sign in with Google.");
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  // =========================================
  // LOGIN INTERFACE
  // =========================================

  return (
    <div className="login-page">
      <div className="login-card">

        {/* =========================================
            HEADER
        ========================================= */}

        <div className="login-header">

          <div className="login-logo">
            F
          </div>

          <h1>Welcome to FRENDS</h1>

          <p>
            Smart Flood &amp; Traffic Monitoring
          </p>

        </div>

        {/* =========================================
            EMAIL LOGIN
        ========================================= */}

        <form onSubmit={handleLogin}>

          <div className="login-field">

            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || googleLoading}
            />

          </div>

          <div className="login-field">

            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading || googleLoading}
            />

          </div>

          {/* ERROR */}

          {error && (
            <p className="login-error">
              {error}
            </p>
          )}

          {/* LOGIN BUTTON */}

          <button
            type="submit"
            className="login-button"
            disabled={loading || googleLoading}
          >
            {loading ? "Signing in..." : "Login"}
          </button>

        </form>

        {/* =========================================
            DIVIDER
        ========================================= */}

        <div className="login-divider">

          <span></span>

          <p>OR</p>

          <span></span>

        </div>

        {/* =========================================
            GOOGLE LOGIN
        ========================================= */}

        <button
          type="button"
          className="google-login-button"
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
        >

          <span className="google-icon">
            G
          </span>

          <span>
            {googleLoading
              ? "Connecting..."
              : "Continue with Google"}
          </span>

        </button>

        {/* =========================================
            FOOTER
        ========================================= */}

        <div className="login-footer">

          <span>
            FRENDS
          </span>

          <small>
            Real-Time Flood &amp; Traffic Monitoring
          </small>

        </div>

      </div>
    </div>
  );
}

export default Login;