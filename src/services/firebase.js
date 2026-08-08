import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// =========================================
// FIREBASE CONFIGURATION
// =========================================

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
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

export default app;