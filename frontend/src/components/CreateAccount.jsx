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
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

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
      !age ||
      !gender ||
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
    // CHECK AGE
    // =========================================

    const numericAge = Number(age);

    if (
      numericAge < 1 ||
      numericAge > 120
    ) {

      setError(
        "Please enter a valid age."
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

          birthName:
            birthName.trim(),

          age: numericAge,

          gender: gender,

          email:
            email.trim(),

          createdAt:
            new Date().toISOString(),
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
      setAge("");
      setGender("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

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
    setAge("");
    setGender("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");

    if (onBackToLogin) {
      onBackToLogin();
    }
  }

  // =========================================
  // INTERFACE
  // =========================================

  return (

    <div className="login-page">

      <div className="login-card">

        {/* =====================================
            BACK TO LOGIN BUTTON
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
            FORM
        ===================================== */}

        <form
          onSubmit={handleCreateAccount}
        >

          {/* FULL NAME */}

          <div className="login-field">

            <label htmlFor="name">
              Full Name
            </label>

            <input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
              disabled={loading}
              autoComplete="name"
            />

          </div>

          {/* BIRTH NAME */}

          <div className="login-field">

            <label htmlFor="birthName">
              Birth Name
            </label>

            <input
              id="birthName"
              type="text"
              placeholder="Enter your birth name"
              value={birthName}
              onChange={(e) =>
                setBirthName(e.target.value)
              }
              required
              disabled={loading}
            />

          </div>

          {/* AGE */}

          <div className="login-field">

            <label htmlFor="age">
              Age
            </label>

            <input
              id="age"
              type="number"
              placeholder="Enter your age"
              min="1"
              max="120"
              value={age}
              onChange={(e) =>
                setAge(e.target.value)
              }
              required
              disabled={loading}
            />

          </div>

          {/* GENDER */}

          <div className="login-field">

            <label htmlFor="gender">
              Gender
            </label>

            <select
              id="gender"
              value={gender}
              onChange={(e) =>
                setGender(e.target.value)
              }
              required
              disabled={loading}
            >

              <option value="">
                Select Gender
              </option>

              <option value="Male">
                Male
              </option>

              <option value="Female">
                Female
              </option>

              <option value="Prefer not to say">
                Prefer not to say
              </option>

            </select>

          </div>

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
              disabled={loading}
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
              placeholder="Create a password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
              minLength={6}
              disabled={loading}
              autoComplete="new-password"
            />

          </div>

          {/* CONFIRM PASSWORD */}

          <div className="login-field">

            <label htmlFor="confirmPassword">
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(
                  e.target.value
                )
              }
              required
              minLength={6}
              disabled={loading}
              autoComplete="new-password"
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

          {/* CREATE ACCOUNT BUTTON */}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >

            {loading
              ? "Creating account..."
              : "Create Account"}

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

        </div>

      </div>

    </div>
  );
}

export default CreateAccount;