import { useState } from "react";

import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";

import { ref, set } from "firebase/database";

import {
  auth,
  database,
} from "../firebase/firebaseConfig";

import "../../Login.css";

function CreateAccount({ onBackToLogin }) {

  // =========================================================
  // FORM DATA
  // =========================================================

  const [username, setUsername] = useState("");
  const [birthday, setBirthday] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // =========================================================
  // PASSWORD VISIBILITY
  // =========================================================

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // =========================================================
  // MESSAGES
  // =========================================================

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================================================
  // LOADING
  // =========================================================

  const [loading, setLoading] = useState(false);

  // =========================================================
  // CREATE ACCOUNT
  // =========================================================

  async function handleCreateAccount(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    // =======================================================
    // CHECK REQUIRED FIELDS
    // =======================================================

    if (
      !username.trim() ||
      !birthday ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError("Please complete all fields.");
      return;
    }

    // =======================================================
    // CHECK USERNAME
    // =======================================================

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    // =======================================================
    // CHECK PASSWORD LENGTH
    // =======================================================

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    // =======================================================
    // CHECK PASSWORD MATCH
    // =======================================================

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // =======================================================
    // START LOADING
    // =======================================================

    try {
      setLoading(true);

      // =====================================================
      // CREATE FIREBASE AUTH ACCOUNT
      // =====================================================

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const user = userCredential.user;

      // =====================================================
      // UPDATE FIREBASE DISPLAY NAME
      // USE USERNAME
      // =====================================================

      await updateProfile(user, {
        displayName: username.trim(),
      });

      // =====================================================
      // SAVE USER INFORMATION
      // TO FIREBASE REALTIME DATABASE
      // =====================================================
      //
      // IMPORTANT:
      //
      // EVERY ACCOUNT CREATED THROUGH THIS PAGE
      // IS AUTOMATICALLY A NORMAL USER.
      //
      // The user cannot choose "admin".
      //
      // Admin accounts are created separately by FRENDS.
      //
      // =====================================================

      const userData = {
        uid: user.uid,
        username: username.trim(),
        birthday: birthday,
        email: email.trim(),

        // =========================================
        // ROLE
        // =========================================

        role: "user",

        createdAt: new Date().toISOString(),
      };

      await set(
        ref(database, `users/${user.uid}`),
        userData
      );

      // =====================================================
      // SIGN OUT AFTER REGISTRATION
      // =====================================================

      await signOut(auth);

      // =====================================================
      // SUCCESS MESSAGE
      // =====================================================

      setSuccess(
        "Account created successfully! Please log in."
      );

      // =====================================================
      // CLEAR FORM
      // =====================================================

      setUsername("");
      setBirthday("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      setShowPassword(false);
      setShowConfirmPassword(false);

    } catch (error) {

      console.error(
        "Create account error:",
        error
      );

      // =====================================================
      // FIREBASE ERROR HANDLING
      // =====================================================

      switch (error.code) {

        case "auth/email-already-in-use":
          setError(
            "An account already exists with this email."
          );
          break;

        case "auth/invalid-email":
          setError(
            "Please enter a valid email address."
          );
          break;

        case "auth/weak-password":
          setError(
            "Password must be at least 6 characters."
          );
          break;

        case "auth/operation-not-allowed":
          setError(
            "Email/Password authentication is not enabled in Firebase."
          );
          break;

        case "auth/network-request-failed":
          setError(
            "Network error. Please check your internet connection."
          );
          break;

        case "auth/too-many-requests":
          setError(
            "Too many attempts. Please try again later."
          );
          break;

        default:
          setError(
            error?.message ||
            "Unable to create account. Please try again."
          );
      }

    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // BACK TO LOGIN
  // =========================================================

  function handleBackToLogin() {

    if (loading) {
      return;
    }

    setError("");
    setSuccess("");

    setUsername("");
    setBirthday("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");

    setShowPassword(false);
    setShowConfirmPassword(false);

    if (typeof onBackToLogin === "function") {
      onBackToLogin();
    }
  }

  // =========================================================
  // INTERFACE
  // =========================================================

  return (
    <div className="login-page create-account-page">

      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="login-background">

        <div className="background-circle circle-one"></div>

        <div className="background-circle circle-two"></div>

        <div className="background-circle circle-three"></div>

        <div className="background-wave wave-one"></div>

        <div className="background-wave wave-two"></div>

      </div>


      {/* =====================================================
          CREATE ACCOUNT CARD
      ===================================================== */}

      <div className="login-card create-account-card">

        {/* ===================================================
            BACK TO LOGIN
        =================================================== */}

        <button
          type="button"
          className="back-to-login-button"
          onClick={handleBackToLogin}
          disabled={loading}
        >

          <span className="back-arrow">
            ←
          </span>

          <span>
            Back to Login
          </span>

        </button>


        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="login-header">

          <h1>
            Create your FRENDS Account
          </h1>

          <p>
            Flood Road Eye and Navigation Detection System
          </p>

        </div>


        {/* ===================================================
            SYSTEM STATUS
        =================================================== */}

        <div className="system-status">

          <span className="status-dot"></span>

          <span>
            Registration System Online
          </span>

        </div>


        {/* ===================================================
            FORM
        =================================================== */}

        <form
          onSubmit={handleCreateAccount}
          className="create-account-form"
          noValidate
        >

          {/* =================================================
              USERNAME
          ================================================= */}

          <div className="login-field">

            <label htmlFor="username">
              Username
            </label>

            <div className="input-wrapper">

              <span
                className="input-icon"
                aria-hidden="true"
              >
                👤
              </span>

              <input
                id="username"
                name="username"
                className="create-account-input"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                disabled={loading}
                autoComplete="username"
                maxLength={30}
              />

            </div>

          </div>


          {/* =================================================
              BIRTHDAY
          ================================================= */}

          <div className="login-field">

            <label htmlFor="birthday">
              Birthday
            </label>

            <div className="input-wrapper">

              <span
                className="input-icon"
                aria-hidden="true"
              >
                🎂
              </span>

              <input
                id="birthday"
                name="birthday"
                className="create-account-input"
                type="date"
                value={birthday}
                onChange={(e) => {
                  setBirthday(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                disabled={loading}
                autoComplete="bday"
              />

            </div>

          </div>


          {/* =================================================
              EMAIL
          ================================================= */}

          <div className="login-field">

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
                name="email"
                className="create-account-input"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                disabled={loading}
                autoComplete="email"
              />

            </div>

          </div>


          {/* =================================================
              PASSWORD
          ================================================= */}

          <div className="login-field">

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
                name="password"
                className="create-account-input"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Create a password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                minLength={6}
                disabled={loading}
                autoComplete="new-password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    (previous) => !previous
                  )
                }
                disabled={loading}
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


          {/* =================================================
              CONFIRM PASSWORD
          ================================================= */}

          <div className="login-field">

            <label htmlFor="confirmPassword">
              Confirm Password
            </label>

            <div className="input-wrapper">

              <span
                className="input-icon"
                aria-hidden="true"
              >
                🔐
              </span>

              <input
                id="confirmPassword"
                name="confirmPassword"
                className="create-account-input"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                minLength={6}
                disabled={loading}
                autoComplete="new-password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    (previous) => !previous
                  )
                }
                disabled={loading}
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                👁
              </button>

            </div>

          </div>


          {/* =================================================
              ERROR MESSAGE
          ================================================= */}

          {error && (
            <div
              className="login-message login-error"
              role="alert"
            >

              <span aria-hidden="true">
                ⚠
              </span>

              <p>
                {error}
              </p>

            </div>
          )}


          {/* =================================================
              SUCCESS MESSAGE
          ================================================= */}

          {success && (
            <div
              className="login-message login-success"
              role="status"
            >

              <span aria-hidden="true">
                ✓
              </span>

              <p>
                {success}
              </p>

            </div>
          )}


          {/* =================================================
              CREATE ACCOUNT BUTTON
          ================================================= */}

          <button
            type="submit"
            className="create-account-button"
            disabled={loading}
          >

            {loading ? (
              <>
                <span
                  className="spinner"
                  aria-hidden="true"
                ></span>

                <span>
                  Creating Account...
                </span>
              </>
            ) : (
              <>
                <span>
                  Create Account
                </span>

                <span
                  className="button-arrow"
                  aria-hidden="true"
                >
                  →
                </span>
              </>
            )}

          </button>

        </form>


        {/* =====================================================
            FOOTER
        ===================================================== */}

        <div className="login-footer">

          <span>
            FRENDS
          </span>

          <small>
            Real-Time Flood &amp; Traffic Monitoring
          </small>

          <div className="footer-status">

            <span className="status-dot"></span>

            Registration Ready

          </div>

        </div>

      </div>

    </div>
  );
}

export default CreateAccount;