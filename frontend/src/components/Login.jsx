import { useState } from "react";

import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

import {
  auth,
  googleProvider,
} from "../firebase/firebaseConfig";

import CreateAccount from "./CreateAccount";

import "../../Login.css";

function Login() {

  // =========================================
  // CREATE ACCOUNT PAGE
  // =========================================

  const [showCreateAccount, setShowCreateAccount] =
    useState(false);

  // =========================================
  // LOGIN FORM
  // =========================================

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // =========================================
  // MESSAGES
  // =========================================

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================================
  // LOADING
  // =========================================

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] =
    useState(false);

  // =========================================
  // LOGIN
  // =========================================

  async function handleLogin(e) {

    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // App.jsx will detect the authenticated user.

    } catch (error) {

      console.error(
        "Login error:",
        error
      );

      switch (error.code) {

        case "auth/invalid-credential":
          setError(
            "Invalid email or password."
          );
          break;

        case "auth/user-not-found":
          setError(
            "No account found with this email."
          );
          break;

        case "auth/wrong-password":
          setError(
            "Incorrect password."
          );
          break;

        case "auth/invalid-email":
          setError(
            "Please enter a valid email address."
          );
          break;

        case "auth/too-many-requests":
          setError(
            "Too many attempts. Please try again later."
          );
          break;

        case "auth/operation-not-allowed":
          setError(
            "Email/Password authentication is not enabled in Firebase."
          );
          break;

        default:
          setError(
            error.message ||
            "Authentication failed. Please try again."
          );
      }

    } finally {

      setLoading(false);

    }
  }

  // =========================================
  // GOOGLE LOGIN
  // =========================================

  async function handleGoogleLogin() {

    setError("");
    setSuccess("");
    setGoogleLoading(true);

    try {

      await signInWithPopup(
        auth,
        googleProvider
      );

    } catch (error) {

      console.error(
        "Google login error:",
        error
      );

      switch (error.code) {

        case "auth/operation-not-allowed":
          setError(
            "Google login is not enabled in Firebase Authentication."
          );
          break;

        case "auth/popup-closed-by-user":
          setError(
            "Google sign-in was cancelled."
          );
          break;

        case "auth/popup-blocked":
          setError(
            "Your browser blocked the Google sign-in popup."
          );
          break;

        case "auth/cancelled-popup-request":
          setError(
            "Google sign-in was cancelled."
          );
          break;

        case "auth/network-request-failed":
          setError(
            "Network error. Check your internet connection."
          );
          break;

        case "auth/account-exists-with-different-credential":
          setError(
            "An account already exists using another sign-in method."
          );
          break;

        default:
          setError(
            "Unable to sign in with Google."
          );
      }

    } finally {

      setGoogleLoading(false);

    }
  }

  // =========================================
  // OPEN CREATE ACCOUNT
  // =========================================

  function openCreateAccount() {

    setError("");
    setSuccess("");

    setEmail("");
    setPassword("");

    setShowCreateAccount(true);
  }

  // =========================================
  // RETURN TO LOGIN
  // =========================================

  function backToLogin() {

    setShowCreateAccount(false);

    setEmail("");
    setPassword("");

    setError("");
    setSuccess("");
  }

  // =========================================
  // SHOW CREATE ACCOUNT PAGE
  // =========================================

  if (showCreateAccount) {

    return (
      <CreateAccount
        onBackToLogin={backToLogin}
      />
    );

  }

  // =========================================
  // LOADING
  // =========================================

  const isLoading =
    loading ||
    googleLoading;

  // =========================================
  // LOGIN INTERFACE
  // =========================================

  return (
    <div className="login-page">

      <div className="login-card">

        {/* =====================================
            HEADER
        ===================================== */}

        <div className="login-header">

          <div className="login-logo">
            F
          </div>

          <h1>
            Welcome to FRENDS
          </h1>

          <p>
            Smart Flood &amp; Traffic Monitoring
          </p>

        </div>

        {/* =====================================
            LOGIN FORM
        ===================================== */}

        <form onSubmit={handleLogin}>

          {/* EMAIL */}

          <div className="login-field">

            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
              disabled={isLoading}
              autoComplete="email"
            />

          </div>

          {/* PASSWORD */}

          <div className="login-field">

            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
              minLength={6}
              disabled={isLoading}
              autoComplete="current-password"
            />

          </div>

          {/* ERROR */}

          {error && (
            <p className="login-error">
              {error}
            </p>
          )}

          {/* SUCCESS */}

          {success && (
            <p className="login-success">
              {success}
            </p>
          )}

          {/* LOGIN BUTTON */}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >

            {loading
              ? "Signing in..."
              : "Login"}

          </button>

        </form>

        {/* =====================================
            CREATE ACCOUNT
        ===================================== */}

        <div className="login-switch">

          <span>
            Don't have an account?
          </span>

          <button
            type="button"
            onClick={openCreateAccount}
            disabled={isLoading}
          >
            Create Account
          </button>

        </div>

        {/* =====================================
            DIVIDER
        ===================================== */}

        <div className="login-divider">

          <span></span>

          <p>OR</p>

          <span></span>

        </div>

        {/* =====================================
            GOOGLE
        ===================================== */}

        <button
          type="button"
          className="google-login-button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
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

        {/* =====================================
            FOOTER
        ===================================== */}

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