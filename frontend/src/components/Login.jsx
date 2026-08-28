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

// =========================================
// IMPORT YOUR LOGO
// =========================================

import frendsLogo from "../assets/frendslogo.png";

function Login() {
  // =========================================
  // INTRO
  // =========================================

  const [introFinished, setIntroFinished] =
    useState(false);

  // =========================================
  // CREATE ACCOUNT
  // =========================================

  const [showCreateAccount, setShowCreateAccount] =
    useState(false);

  // =========================================
  // LOGIN INFORMATION
  // =========================================

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  // =========================================
  // MESSAGES
  // =========================================

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // =========================================
  // LOADING
  // =========================================

  const [loading, setLoading] =
    useState(false);

  const [googleLoading, setGoogleLoading] =
    useState(false);

  // =========================================
  // START UP
  // =========================================

  function handleStartUp() {
    setIntroFinished(true);
  }

  // =========================================
  // EMAIL / PASSWORD LOGIN
  // =========================================

  async function handleLogin(e) {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // =======================================
      // FIREBASE AUTHENTICATION
      // =======================================

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const loggedInUser =
        userCredential.user;

      console.log(
        "================================="
      );

      console.log(
        "LOGIN SUCCESSFUL"
      );

      console.log(
        "Email:",
        loggedInUser.email
      );

      console.log(
        "UID:",
        loggedInUser.uid
      );

      console.log(
        "================================="
      );

      /*
       * IMPORTANT
       *
       * We DO NOT select the role here.
       *
       * After Firebase authentication succeeds,
       * App.jsx detects the logged-in user.
       *
       * App.jsx will then show:
       *
       * LOGIN
       *   ↓
       * ROLE INTERFACE
       *   ↓
       * USER / ADMIN
       */

      setSuccess(
        "Login successful!"
      );

    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      // =====================================
      // FIREBASE ERROR HANDLING
      // =====================================

      switch (error.code) {

        case "auth/invalid-credential":
          setError(
            "Invalid email or password."
          );
          break;

        case "auth/user-not-found":
          setError(
            "No account was found with this email."
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

        case "auth/user-disabled":
          setError(
            "This account has been disabled."
          );
          break;

        case "auth/network-request-failed":
          setError(
            "Network error. Please check your internet connection."
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

      const userCredential =
        await signInWithPopup(
          auth,
          googleProvider
        );

      const loggedInUser =
        userCredential.user;

      console.log(
        "================================="
      );

      console.log(
        "GOOGLE LOGIN SUCCESSFUL"
      );

      console.log(
        "Email:",
        loggedInUser.email
      );

      console.log(
        "UID:",
        loggedInUser.uid
      );

      console.log(
        "================================="
      );

      /*
       * App.jsx will detect the authenticated
       * Google account and display the
       * Role Interface.
       */

      setSuccess(
        "Google login successful!"
      );

    } catch (error) {
      console.error(
        "Google login error:",
        error
      );

      if (
        error.code ===
        "auth/popup-closed-by-user"
      ) {

        setError(
          "Google sign-in was cancelled."
        );

      } else if (
        error.code ===
        "auth/operation-not-allowed"
      ) {

        setError(
          "Google sign-in is not enabled in Firebase."
        );

      } else if (
        error.code ===
        "auth/popup-blocked"
      ) {

        setError(
          "Google sign-in popup was blocked by the browser."
        );

      } else if (
        error.code ===
        "auth/network-request-failed"
      ) {

        setError(
          "Network error. Please check your internet connection."
        );

      } else {

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

    setShowPassword(false);

    setShowCreateAccount(true);
  }

  // =========================================
  // BACK TO LOGIN
  // =========================================

  function backToLogin() {

    setShowCreateAccount(false);

    setEmail("");
    setPassword("");

    setShowPassword(false);

    setError("");
    setSuccess("");
  }

  // =========================================
  // CREATE ACCOUNT INTERFACE
  // =========================================

  if (showCreateAccount) {

    return (
      <CreateAccount
        onBackToLogin={backToLogin}
      />
    );
  }

  // =========================================
  // LOADING STATE
  // =========================================

  const isLoading =
    loading || googleLoading;

  // =========================================
  // LOGIN INTERFACE
  // =========================================

  return (
    <div
      className={`login-page ${
        introFinished
          ? "intro-finished"
          : "intro-active"
      }`}
    >

      {/* =====================================
          BACKGROUND
      ===================================== */}

      <div className="login-background">

        <div className="background-circle circle-one"></div>

        <div className="background-circle circle-two"></div>

        <div className="background-circle circle-three"></div>

        <div className="background-wave wave-one"></div>

        <div className="background-wave wave-two"></div>

      </div>

      {/* =====================================
          SPLASH SCREEN
      ===================================== */}

      <div
        className={`login-intro ${
          introFinished
            ? "intro-hide"
            : ""
        }`}
      >

        {/* LOGO */}

        <div className="intro-logo">

          <img
            src={frendsLogo}
            alt="FRENDS Logo"
            className="splash-logo"
          />

        </div>

        {/* DESCRIPTION */}

        <p>
          Flood Road Eye and Navigation
          Detection System
        </p>

        {/* LOADING ANIMATION */}

        <div className="intro-loading">

          <span></span>

        </div>

        {/* START BUTTON */}

        <button
          type="button"
          className="intro-start-button"
          onClick={handleStartUp}
        >

          <span>
            START UP
          </span>

          <span className="start-button-arrow">
            →
          </span>

        </button>

      </div>

      {/* =====================================
          LOGIN CARD
      ===================================== */}

      <div
        className={`login-card ${
          introFinished
            ? "card-show"
            : "card-hidden"
        }`}
      >

        {/* HEADER */}

        <div className="login-header">

          <p className="card-subtitle">
            WELCOME TO FRENDS
          </p>

        </div>

        {/* SYSTEM STATUS */}

        <div className="system-status">

          <span className="status-dot"></span>

          <span>
            Monitoring System Online
          </span>

        </div>

        {/* ===================================
            LOGIN FORM
        =================================== */}

        <form
          onSubmit={handleLogin}
          className="login-form"
        >

          {/* EMAIL */}

          <div
            className={`login-field email-field ${
              introFinished
                ? "field-show"
                : ""
            }`}
          >

            <label htmlFor="email">
              Email
            </label>

            <div className="input-wrapper">

              <span
                className="input-icon"
                aria-hidden="true"
              >
                ✉
              </span>

              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(
                    e.target.value
                  );

                  setError("");
                  setSuccess("");
                }}
                required
                autoComplete="email"
                disabled={isLoading}
              />

            </div>

          </div>

          {/* PASSWORD */}

          <div
            className={`login-field password-field ${
              introFinished
                ? "field-show"
                : ""
            }`}
          >

            <label htmlFor="password">
              Password
            </label>

            <div className="input-wrapper">

              <span
                className="input-icon"
                aria-hidden="true"
              >
                🔒
              </span>

              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(
                    e.target.value
                  );

                  setError("");
                  setSuccess("");
                }}
                required
                minLength={6}
                autoComplete="current-password"
                disabled={isLoading}
              />

              {/* PASSWORD VISIBILITY */}

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                disabled={isLoading}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                👁
              </button>

            </div>

          </div>

          {/* =================================
              ERROR MESSAGE
          ================================= */}

          {error && (

            <div
              className="login-message login-error"
              role="alert"
            >

              <span>
                ⚠
              </span>

              <p>
                {error}
              </p>

            </div>

          )}

          {/* =================================
              SUCCESS MESSAGE
          ================================= */}

          {success && (

            <div
              className="login-message login-success"
              role="status"
            >

              <span>
                ✓
              </span>

              <p>
                {success}
              </p>

            </div>

          )}

          {/* =================================
              LOGIN BUTTON
          ================================= */}

          <button
            type="submit"
            className={`login-button ${
              introFinished
                ? "button-show"
                : ""
            }`}
            disabled={isLoading}
          >

            {loading ? (

              <>
                <span className="spinner"></span>

                <span>
                  Signing in...
                </span>
              </>

            ) : (

              <>
                <span>
                  Login
                </span>

                <span className="button-arrow">
                  →
                </span>
              </>

            )}

          </button>

        </form>

        {/* ===================================
            CREATE ACCOUNT
        =================================== */}

        <div
          className={`login-switch ${
            introFinished
              ? "content-show"
              : ""
          }`}
        >

          <span>
            Don't have an account?
          </span>

          <button
            type="button"
            onClick={
              openCreateAccount
            }
            disabled={isLoading}
          >
            Create Account
          </button>

        </div>

        {/* ===================================
            DIVIDER
        =================================== */}

        <div
          className={`login-divider ${
            introFinished
              ? "content-show"
              : ""
          }`}
        >

          <span></span>

          <p>
            OR
          </p>

          <span></span>

        </div>

        {/* ===================================
            GOOGLE LOGIN
        =================================== */}

        <button
          type="button"
          className={`google-login-button ${
            introFinished
              ? "content-show"
              : ""
          }`}
          onClick={
            handleGoogleLogin
          }
          disabled={isLoading}
        >

          {googleLoading ? (

            <>
              <span className="spinner"></span>

              <span>
                Connecting...
              </span>
            </>

          ) : (

            <>
              <span className="google-icon">
                G
              </span>

              <span>
                Continue with Google
              </span>
            </>

          )}

        </button>

        {/* ===================================
            FOOTER
        =================================== */}

        <div
          className={`login-footer ${
            introFinished
              ? "content-show"
              : ""
          }`}
        >

          <small>
            Real-Time Flood &amp; Traffic Monitoring
          </small>

          <div className="footer-status">

            <span className="status-dot"></span>

            System Ready

          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;