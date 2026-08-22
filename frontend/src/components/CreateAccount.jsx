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

  // =========================================
  // FORM DATA
  // =========================================

  const [name, setName] = useState("");
  const [birthName, setBirthName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // =========================================
  // PASSWORD VISIBILITY
  // =========================================

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // =========================================
  // MESSAGES
  // =========================================

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================================
  // LOADING
  // =========================================

  const [loading, setLoading] = useState(false);

  // =========================================
  // CREATE ACCOUNT
  // =========================================

  async function handleCreateAccount(e) {

    e.preventDefault();

    setError("");
    setSuccess("");

    // =========================================
    // CHECK REQUIRED FIELDS
    // =========================================

    if (
      !name.trim() ||
      !birthName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {

      setError(
        "Please complete all fields."
      );

      return;
    }

    // =========================================
    // CHECK PASSWORD
    // =========================================

    if (password.length < 6) {

      setError(
        "Password must be at least 6 characters."
      );

      return;
    }

    // =========================================
    // CONFIRM PASSWORD
    // =========================================

    if (password !== confirmPassword) {

      setError(
        "Passwords do not match."
      );

      return;
    }

    try {

      setLoading(true);

      // =========================================
      // CREATE FIREBASE AUTH ACCOUNT
      // =========================================

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const user =
        userCredential.user;

      // =========================================
      // SET FIREBASE DISPLAY NAME
      // =========================================

      await updateProfile(user, {
        displayName: name.trim(),
      });

      // =========================================
      // SAVE USER INFORMATION
      // TO REALTIME DATABASE
      // =========================================

      await set(
        ref(
          database,
          `users/${user.uid}`
        ),
        {
          uid: user.uid,

          name: name.trim(),

          birthName: birthName.trim(),

          email: email.trim(),

          createdAt: new Date().toISOString(),
        }
      );

      // =========================================
      // SIGN OUT
      // =========================================

      await signOut(auth);

      // =========================================
      // SUCCESS MESSAGE
      // =========================================

      setSuccess(
        "Account created successfully! Please log in."
      );

      // =========================================
      // CLEAR FORM
      // =========================================

      setName("");
      setBirthName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      // Reset password visibility
      setShowPassword(false);
      setShowConfirmPassword(false);

    } catch (error) {

      console.error(
        "Create account error:",
        error
      );

      // =========================================
      // FIREBASE ERRORS
      // =========================================

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

        default:

          setError(
            error.message ||
            "Unable to create account."
          );
      }

    } finally {

      setLoading(false);

    }
  }

  // =========================================
  // BACK TO LOGIN
  // =========================================

  function handleBackToLogin() {

    if (loading) {
      return;
    }

    setError("");
    setSuccess("");

    setName("");
    setBirthName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");

    // Reset password visibility
    setShowPassword(false);
    setShowConfirmPassword(false);

    if (onBackToLogin) {
      onBackToLogin();
    }
  }

  // =========================================
  // INTERFACE
  // =========================================

  return (

    <div className="login-page create-account-page">

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
          CREATE ACCOUNT CARD
      ===================================== */}

      <div className="login-card create-account-card">

        {/* =====================================
            BACK TO LOGIN
        ===================================== */}

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


        {/* =====================================
            HEADER
        ===================================== */}

        <div className="login-header">

          <div className="login-logo">
            F
          </div>

          <h1>
            Create your FRENDS Account
          </h1>

          <p>
            Smart Flood &amp; Traffic Monitoring
          </p>

        </div>


        {/* =====================================
            SYSTEM STATUS
        ===================================== */}

        <div className="system-status">

          <span className="status-dot"></span>

          <span>
            Registration System Online
          </span>

        </div>


        {/* =====================================
            FORM
        ===================================== */}

        <form
          onSubmit={handleCreateAccount}
          className="create-account-form"
        >

          {/* =================================
              FULL NAME
          ================================= */}

          <div className="login-field">

            <label htmlFor="name">
              Full Name
            </label>

            <div className="input-wrapper">

              <span className="input-icon">
                👤
              </span>

              <input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                required
                disabled={loading}
                autoComplete="name"
              />

            </div>

          </div>


          {/* =================================
              BIRTH NAME
          ================================= */}

          <div className="login-field">

            <label htmlFor="birthName">
              Birth Name
            </label>

            <div className="input-wrapper">

              <span className="input-icon">
                🪪
              </span>

              <input
                id="birthName"
                type="text"
                placeholder="Enter your birth name"
                value={birthName}
                onChange={(e) => {
                  setBirthName(e.target.value);
                  setError("");
                }}
                required
                disabled={loading}
              />

            </div>

          </div>


          {/* =================================
              EMAIL
          ================================= */}

          <div className="login-field">

            <label htmlFor="email">
              Email
            </label>

            <div className="input-wrapper">

              <span className="input-icon">
                ✉
              </span>

              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                required
                disabled={loading}
                autoComplete="email"
              />

            </div>

          </div>


          {/* =================================
              PASSWORD
          ================================= */}

          <div className="login-field">

            <label htmlFor="password">
              Password
            </label>

            <div className="input-wrapper">

              <span className="input-icon">
                🔒
              </span>

              <input
                id="password"
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
                }}
                required
                minLength={6}
                disabled={loading}
                autoComplete="new-password"
              />

              {/* SHOW / HIDE PASSWORD */}

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                disabled={loading}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >

                {showPassword
                  ? "🙈"
                  : "👁️"}

              </button>

            </div>

          </div>


          {/* =================================
              CONFIRM PASSWORD
          ================================= */}

          <div className="login-field">

            <label htmlFor="confirmPassword">
              Confirm Password
            </label>

            <div className="input-wrapper">

              <span className="input-icon">
                🔐
              </span>

              <input
                id="confirmPassword"
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
                }}
                required
                minLength={6}
                disabled={loading}
                autoComplete="new-password"
              />

              {/* SHOW / HIDE CONFIRM PASSWORD */}

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
                disabled={loading}
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >

                {showConfirmPassword
                  ? "🙈"
                  : "👁️"}

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
              CREATE ACCOUNT BUTTON
          ================================= */}

          <button
            type="submit"
            className="create-account-button"
            disabled={loading}
          >

            {loading ? (

              <>

                <span className="spinner"></span>

                <span>
                  Creating Account...
                </span>

              </>

            ) : (

              <>

                <span>
                  Create Account
                </span>

                <span className="button-arrow">
                  →
                </span>

              </>

            )}

          </button>

        </form>


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