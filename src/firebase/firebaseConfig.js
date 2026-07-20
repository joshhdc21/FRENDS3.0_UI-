import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBi0QaaooAdB7SO6n3La5p7-PoyDMqcypg",
  authDomain: "frends-v3.firebaseapp.com",
  databaseURL: "https://frends-v3-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "frends-v3",
  storageBucket: "frends-v3.firebasestorage.app",
  messagingSenderId: "923438712951",
  appId: "1:923438712951:web:c43ebc1df4e5715acf5e72",
  measurementId: "G-39TPVGXFLD"
};

const firebaseApp = initializeApp(firebaseConfig);

const database = getDatabase(firebaseApp);

export { firebaseApp, database };