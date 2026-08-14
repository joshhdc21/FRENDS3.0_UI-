import { useState } from "react";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import {
  auth,
  googleProvider,
} from "../firebase/firebaseConfig";

import "../../Login.css";

function Login() {
  // =========================================
  // LOGIN / REGISTER MODE
  // =========================================

  const [isRegistering, setIsRegistering] =
    useState(false);

  // =========================================
  // FORM
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
  // EMAIL LOGIN / CREATE ACCOUNT
  // =========================================

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // =======================================
      // CREATE ACCOUNT
      // =======================================

      if (isRegistering) {

        // Create Firebase account
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        // IMPORTANT:
        // Firebase automatically signs the
        // newly created account in.
        //
        // We immediately sign it out because
        // the user must LOGIN manually afterward.

        await signOut(auth);

        // Clear form
        setEmail("");
        setPassword("");

        // Return to LOGIN interface
        setIsRegistering(false);

        // Show success message
        setSuccess(
          "Account created successfully! Please log in with your new account."
        );

        return;
      }

      // =======================================
      // LOGIN
      // =======================================

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // App.jsx will detect the authenticated
      // user through onAuthStateChanged().

    } catch (error) {

      console.error(
        "Authentication error:",
        error
      );

      switch (error.code) {

        // =====================================
        // LOGIN ERRORS
        // =====================================

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

        // =====================================
        // EMAIL
        // =====================================

        case "auth/invalid-email":
          setError(
            "Please enter a valid email address."
          );
          break;

        // =====================================
        // CREATE ACCOUNT
        // =====================================

        case "auth/email-already-in-use":
          setError(
            "An account already exists with this email."
          );
          break;

        case "auth/weak-password":
          setError(
            "Password must be at least 6 characters."
          );
          break;

        // =====================================
        // PROVIDER DISABLED
        // =====================================

        case "auth/operation-not-allowed":
          setError(
            "Email/Password authentication is not enabled in Firebase."
          );
          break;

        // =====================================
        // TOO MANY REQUESTS
        // =====================================

        case "auth/too-many-requests":
          setError(
            "Too many attempts. Please try again later."
          );
          break;

        // =====================================
        // DEFAULT
        // =====================================

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

      // Google login directly enters the app.
      // App.jsx detects the authenticated user.

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
  // SWITCH LOGIN / CREATE ACCOUNT
  // =========================================

  function toggleMode() {

    setIsRegistering(
      (previousMode) => !previousMode
    );

    setEmail("");
    setPassword("");

    setError("");
    setSuccess("");
  }

  // =========================================
  // LOADING
  // =========================================

  const isLoading =
    loading ||
    googleLoading;

  // =========================================
  // INTERFACE
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
            {isRegistering
              ? "Create your FRENDS Account"
              : "Welcome to FRENDS"}
          </h1>

          <p>
            Smart Flood &amp; Traffic Monitoring
          </p>

        </div>

        {/* =====================================
            FORM
        ===================================== */}

        <form onSubmit={handleSubmit}>

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
              autoComplete={
                isRegistering
                  ? "new-password"
                  : "current-password"
              }
            />

          </div>

          {/* ===================================
              ERROR
          =================================== */}

          {error && (
            <p className="login-error">
              {error}
            </p>
          )}

          {/* ===================================
              SUCCESS
          =================================== */}

          {success && (
            <p className="login-success">
              {success}
            </p>
          )}

          {/* ===================================
              BUTTON
          =================================== */}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >

            {loading
              ? isRegistering
                ? "Creating account..."
                : "Signing in..."
              : isRegistering
                ? "Create Account"
                : "Login"}

          </button>

        </form>

        {/* =====================================
            SWITCH LOGIN / REGISTER
        ===================================== */}

        <div className="login-switch">

          <span>
            {isRegistering
              ? "Already have an account?"
              : "Don't have an account?"}
          </span>

          <button
            type="button"
            onClick={toggleMode}
            disabled={isLoading}
          >
            {isRegistering
              ? "Login"
              : "Create Account"}
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