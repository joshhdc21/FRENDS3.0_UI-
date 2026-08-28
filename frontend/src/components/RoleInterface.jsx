import { useState } from "react";
import "./RoleInterface.css";

function RoleInterface({ user, onRoleSelected }) {

  // =========================================
  // SELECTED ROLE
  // =========================================

  const [selectedRole, setSelectedRole] =
    useState(null);

  // =========================================
  // ADMIN PASSKEY
  // =========================================

  const [passkey, setPasskey] =
    useState("");

  const [showPasskey, setShowPasskey] =
    useState(false);

  // =========================================
  // ERROR
  // =========================================

  const [error, setError] =
    useState("");

  // =========================================
  // LOADING
  // =========================================

  const [loading, setLoading] =
    useState(false);

  // =========================================
  // ADMIN PASSKEY
  //
  // IMPORTANT:
  //
  // Change this to your desired passkey.
  // =========================================

  const ADMIN_PASSKEY = "FRENDS2026";

  // =========================================
  // SELECT ROLE
  // =========================================

  function handleRoleSelect(role) {

    setSelectedRole(role);

    setError("");

    setPasskey("");

  }

  // =========================================
  // CONTINUE
  // =========================================

  function handleContinue() {

    // =======================================
    // NO ROLE SELECTED
    // =======================================

    if (!selectedRole) {

      setError(
        "Please select a role to continue."
      );

      return;
    }

    // =======================================
    // USER
    // =======================================

    if (selectedRole === "user") {

      console.log(
        "Continuing as USER..."
      );

      /*
       * User does NOT need a passkey.
       *
       * App.jsx will open the normal
       * FRENDS monitoring interface.
       */

      onRoleSelected("user");

      return;
    }

    // =======================================
    // ADMIN
    // =======================================

    if (selectedRole === "admin") {

      /*
       * We don't immediately open AdminDashboard.
       *
       * First, show the admin passkey.
       */

      setShowPasskey(true);

      setError("");

    }
  }

  // =========================================
  // VERIFY ADMIN PASSKEY
  // =========================================

  function handleAdminPasskey(e) {

    e.preventDefault();

    setError("");

    setLoading(true);

    // =======================================
    // EMPTY PASSKEY
    // =======================================

    if (!passkey.trim()) {

      setError(
        "Please enter the administrator passkey."
      );

      setLoading(false);

      return;
    }

    // =======================================
    // CHECK PASSKEY
    // =======================================

    if (
      passkey === ADMIN_PASSKEY
    ) {

      console.log(
        "================================="
      );

      console.log(
        "ADMIN PASSKEY CORRECT"
      );

      console.log(
        "Opening ADMIN interface..."
      );

      console.log(
        "================================="
      );

      /*
       * Tell App.jsx that the admin
       * verification was successful.
       */

      onRoleSelected("admin");

    } else {

      console.log(
        "Incorrect administrator passkey."
      );

      setError(
        "Incorrect administrator passkey."
      );

      setPasskey("");

    }

    setLoading(false);
  }

  // =========================================
  // BACK TO ROLE SELECTION
  // =========================================

  function handleBackToRoles() {

    setShowPasskey(false);

    setSelectedRole(null);

    setPasskey("");

    setError("");

  }

  // =========================================
  // ADMIN PASSKEY INTERFACE
  // =========================================

  if (showPasskey) {

    return (
      <div className="role-page">

        {/* ===================================
            BACKGROUND
        =================================== */}

        <div className="role-background">

          <div className="role-circle circle-one"></div>

          <div className="role-circle circle-two"></div>

          <div className="role-circle circle-three"></div>

        </div>

        {/* ===================================
            PASSKEY CARD
        =================================== */}

        <div className="role-card">

          {/* HEADER */}

          <div className="role-header">

            <div className="role-logo">
              F
            </div>

            <p className="role-system-name">
              FRENDS
            </p>

            <h1>
              Administrator Access
            </h1>

            <p className="role-description">
              Enter the administrator passkey
              to continue.
            </p>

          </div>

          {/* =================================
              ACCOUNT
          ================================= */}

          <div className="role-account">

            <div className="account-avatar">
              {user?.email
                ? user.email
                    .charAt(0)
                    .toUpperCase()
                : "U"}
            </div>

            <div>

              <span>
                Signed in as
              </span>

              <strong>
                {user?.email ||
                  "Authenticated User"}
              </strong>

            </div>

          </div>

          {/* =================================
              ADMIN SECURITY
          ================================= */}

          <div className="admin-security-box">

            <div className="security-icon">
              🛡️
            </div>

            <div>

              <strong>
                Administrator Verification
              </strong>

              <p>
                This area is restricted to
                authorized administrators.
              </p>

            </div>

          </div>

          {/* =================================
              PASSKEY FORM
          ================================= */}

          <form
            className="passkey-form"
            onSubmit={
              handleAdminPasskey
            }
          >

            <label htmlFor="admin-passkey">
              Administrator Passkey
            </label>

            <div className="passkey-input-wrapper">

              <span className="passkey-icon">
                🔐
              </span>

              <input
                id="admin-passkey"
                type={
                  showPasskey
                    ? "text"
                    : "password"
                }
                value={passkey}
                onChange={(e) => {

                  setPasskey(
                    e.target.value
                  );

                  setError("");

                }}
                placeholder="Enter admin passkey"
                autoComplete="off"
                disabled={loading}
              />

              <button
                type="button"
                className="passkey-toggle"
                onClick={() =>
                  setShowPasskey(
                    !showPasskey
                  )
                }
                disabled={loading}
              >
                👁
              </button>

            </div>

            {/* ERROR */}

            {error && (

              <div
                className="role-error"
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

            {/* VERIFY BUTTON */}

            <button
              type="submit"
              className="role-continue"
              disabled={loading}
            >

              {loading ? (

                <>
                  <span>
                    Verifying...
                  </span>

                  <span className="spinner">
                  </span>
                </>

              ) : (

                <>
                  <span>
                    Verify &amp; Continue
                  </span>

                  <span className="continue-arrow">
                    →
                  </span>
                </>

              )}

            </button>

          </form>

          {/* BACK BUTTON */}

          <button
            type="button"
            className="role-back-button"
            onClick={
              handleBackToRoles
            }
            disabled={loading}
          >
            ← Back to Role Selection
          </button>

          {/* FOOTER */}

          <div className="role-footer">

            <span className="online-dot"></span>

            <span>
              FRENDS System Online
            </span>

          </div>

        </div>

      </div>
    );
  }

  // =========================================
  // ROLE SELECTION INTERFACE
  // =========================================

  return (
    <div className="role-page">

      {/* =====================================
          BACKGROUND
      ===================================== */}

      <div className="role-background">

        <div className="role-circle circle-one"></div>

        <div className="role-circle circle-two"></div>

        <div className="role-circle circle-three"></div>

      </div>

      {/* =====================================
          MAIN CARD
      ===================================== */}

      <div className="role-card">

        {/* ===================================
            HEADER
        =================================== */}

        <div className="role-header">

          <div className="role-logo">
            F
          </div>

          <p className="role-system-name">
            FRENDS
          </p>

          <h1>
            Welcome to FRENDS
          </h1>

          <p className="role-description">
            Select your account interface
            to continue.
          </p>

        </div>

        {/* ===================================
            ACCOUNT
        =================================== */}

        <div className="role-account">

          <div className="account-avatar">

            {user?.email
              ? user.email
                  .charAt(0)
                  .toUpperCase()
              : "U"}

          </div>

          <div>

            <span>
              Signed in as
            </span>

            <strong>
              {user?.email ||
                "Authenticated User"}
            </strong>

          </div>

        </div>

        {/* ===================================
            ROLE OPTIONS
        =================================== */}

        <div className="role-options">

          {/* =================================
              USER
          ================================= */}

          <button
            type="button"
            className={`role-option ${
              selectedRole === "user"
                ? "role-selected"
                : ""
            }`}
            onClick={() =>
              handleRoleSelect("user")
            }
          >

            <div className="role-icon user-icon">
              👤
            </div>

            <div className="role-info">

              <h2>
                User
              </h2>

              <p>
                Access flood monitoring,
                traffic information,
                maps, and navigation.
              </p>

            </div>

            <div className="role-check">

              {selectedRole === "user"
                ? "✓"
                : ""}

            </div>

          </button>

          {/* =================================
              ADMIN
          ================================= */}

          <button
            type="button"
            className={`role-option ${
              selectedRole === "admin"
                ? "role-selected"
                : ""
            }`}
            onClick={() =>
              handleRoleSelect("admin")
            }
          >

            <div className="role-icon admin-icon">
              🛡️
            </div>

            <div className="role-info">

              <h2>
                Administrator
              </h2>

              <p>
                Manage users, devices,
                flood nodes, and system
                information.
              </p>

              <small>
                Administrator passkey required
              </small>

            </div>

            <div className="role-check">

              {selectedRole === "admin"
                ? "✓"
                : ""}

            </div>

          </button>

        </div>

        {/* ===================================
            ERROR
        =================================== */}

        {error && (

          <div
            className="role-error"
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

        {/* ===================================
            CONTINUE
        =================================== */}

        <button
          type="button"
          className="role-continue"
          onClick={
            handleContinue
          }
          disabled={!selectedRole}
        >

          <span>

            Continue as{" "}

            {selectedRole === "admin"
              ? "Administrator"
              : "User"}

          </span>

          <span className="continue-arrow">
            →
          </span>

        </button>

        {/* ===================================
            FOOTER
        =================================== */}

        <div className="role-footer">

          <span className="online-dot"></span>

          <span>
            FRENDS System Online
          </span>

        </div>

      </div>

    </div>
  );
}

export default RoleInterface;