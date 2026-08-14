import { initializeApp, getApps, getApp } from "firebase/app";

import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from "firebase/auth";

import { getDatabase } from "firebase/database";

// =========================================
// FIREBASE CONFIGURATION
// =========================================

const firebaseConfig = {
  apiKey: "AIzaSyBi0QaaooAdB7SO6n3La5p7-PoyDMqcypg",
  authDomain: "frends-v3.firebaseapp.com",
  databaseURL:
    "https://frends-v3-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "frends-v3",
  storageBucket: "frends-v3.firebasestorage.app",
  messagingSenderId: "923438712951",
  appId: "1:923438712951:web:c43ebc1df4e5715acf5e72",
  measurementId: "G-39TPVGXFLD",
};

// =========================================
// INITIALIZE FIREBASE
// Avoid duplicate-app error
// =========================================

const firebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// =========================================
// REALTIME DATABASE
// =========================================

const database = getDatabase(firebaseApp);

// =========================================
// FIREBASE AUTHENTICATION
// =========================================

const auth = getAuth(firebaseApp);

// =========================================
// GOOGLE PROVIDER
// =========================================

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

// =========================================
// FACEBOOK PROVIDER
// =========================================

const facebookProvider = new FacebookAuthProvider();

facebookProvider.addScope("email");

// =========================================
// EXPORTS
// =========================================

export {
  firebaseApp,
  database,
  auth,
  googleProvider,
  facebookProvider,
};