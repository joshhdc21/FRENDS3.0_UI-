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
  // INTRO / LOADING SCREEN
  // =========================================

  const [introFinished, setIntroFinished] = useState(false);

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
  // PASSWORD VISIBILITY
  // =========================================

  const [showPassword, setShowPassword] = useState(false);

  // =========================================
  // MESSAGES
  // =========================================

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================================
  // LOADING
  // =========================================

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // =========================================
  // START UP BUTTON
  // =========================================

  function handleStartUp() {

    setIntroFinished(true);

  }

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

      setSuccess("Login successful!");

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

        case "auth/network-request-failed":

          setError(
            "Network error. Check your internet connection."
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

      setSuccess(
        "Google login successful!"
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

    setShowPassword(false);

    setShowCreateAccount(true);

  }

  // =========================================
  // RETURN TO LOGIN
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
  // CREATE ACCOUNT PAGE
  // =========================================

  if (showCreateAccount) {

    return (
      <CreateAccount
        onBackToLogin={backToLogin}
      />
    );

  }

  // =========================================
  // LOGIN LOADING
  // =========================================

  const isLoading =
    loading ||
    googleLoading;

  // =========================================
  // MAIN PAGE
  // =========================================

  return (

    <div
      className={
        `login-page ${
          introFinished
            ? "intro-finished"
            : "intro-active"
        }`
      }
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
          FRENDS LOADING / SPLASH SCREEN
      ===================================== */}

      <div
        className={
          `login-intro ${
            introFinished
              ? "intro-hide"
              : ""
          }`
        }
      >

        {/* ===================================
            FRENDS LOGO
        =================================== */}

        <div className="intro-logo">

          <span>
            F
          </span>

        </div>


        {/* ===================================
            FRENDS NAME
        =================================== */}

        <h2>
          FRENDS
        </h2>


        {/* ===================================
            DESCRIPTION
        =================================== */}

        <p>
          Smart Flood &amp; Traffic Monitoring
        </p>


        {/* ===================================
            LOADING LINE
        =================================== */}

        <div className="intro-loading">

          <span></span>

        </div>


        {/* ===================================
            START UP BUTTON
        =================================== */}

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
        className={
          `login-card ${
            introFinished
              ? "card-show"
              : "card-hidden"
          }`
        }
      >

        {/* ===================================
            HEADER
        =================================== */}

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


        {/* ===================================
            SYSTEM STATUS
        =================================== */}

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

          {/* =================================
              EMAIL
          ================================= */}

          <div
            className={
              `login-field email-field ${
                introFinished
                  ? "field-show"
                  : ""
              }`
            }
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

                }}
                required
                disabled={isLoading}
                autoComplete="email"
              />

            </div>

          </div>


          {/* =================================
              PASSWORD
          ================================= */}

          <div
            className={
              `login-field password-field ${
                introFinished
                  ? "field-show"
                  : ""
              }`
            }
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

                }}
                required
                minLength={6}
                disabled={isLoading}
                autoComplete="current-password"
              />


              {/* SHOW PASSWORD */}

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

                {showPassword
                  ? "🙈"
                  : "👁"}

              </button>

            </div>

          </div>


          {/* =================================
              ERROR
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
              SUCCESS
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
            className={
              `login-button ${
                introFinished
                  ? "button-show"
                  : ""
              }`
            }
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
          className={
            `login-switch ${
              introFinished
                ? "content-show"
                : ""
            }`
          }
        >

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


        {/* ===================================
            DIVIDER
        =================================== */}

        <div
          className={
            `login-divider ${
              introFinished
                ? "content-show"
                : ""
            }`
          }
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
          className={
            `google-login-button ${
              introFinished
                ? "content-show"
                : ""
            }`
          }
          onClick={handleGoogleLogin}
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
          className={
            `login-footer ${
              introFinished
                ? "content-show"
                : ""
            }`
          }
        >

          <span>
            FRENDS
          </span>

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