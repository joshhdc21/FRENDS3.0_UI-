import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";

// =========================================
// FRENDS AUTHENTICATION FIREBASE
// =========================================

const firebaseConfig = {
  apiKey: "AIzaSyC8B93t7MfWtXL2zKxCOaaOKTRZT0CVfb8",
  authDomain: "frends-authentication.firebaseapp.com",
  projectId: "frends-authentication",
  storageBucket: "frends-authentication.firebasestorage.app",
  messagingSenderId: "134371958928",
  appId: "1:134371958928:web:d5ea7e2c12d6efc0967815",
};

// =========================================
// INITIALIZE AUTH FIREBASE APP
// =========================================

const authApp = initializeApp(
  firebaseConfig,
  "frendsAuthentication"
);

// =========================================
// FIREBASE AUTHENTICATION
// =========================================

export const auth = getAuth(authApp);

// =========================================
// GOOGLE PROVIDER
// =========================================

export const googleProvider =
  new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

// =========================================
// EXPORT
// =========================================

export default authApp;