import { initializeApp } from "firebase/app";

import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from "firebase/auth";

// =========================================
// FIREBASE CONFIGURATION
// =========================================

const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// =========================================
// INITIALIZE FIREBASE
// =========================================

const app = initializeApp(firebaseConfig);

// =========================================
// FIREBASE AUTHENTICATION
// =========================================

export const auth = getAuth(app);

// =========================================
// GOOGLE PROVIDER
// =========================================

export const googleProvider =
  new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

// =========================================
// FACEBOOK PROVIDER
// =========================================

export const facebookProvider =
  new FacebookAuthProvider();

facebookProvider.addScope("email");

// =========================================
// EXPORT APP
// =========================================

export default app;