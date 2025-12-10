// 📂 firebase-init.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// !!! ЗАМЕНИТЕ ЭТО СВОЕЙ КОНФИГУРАЦИЕЙ !!!
const firebaseConfig = {
  apiKey: "AIzaSyAIQ6T04uz9ZzK435d3NSVIKfoFfbgRDow",
  authDomain: "games-563b9.firebaseapp.com",
  projectId: "games-563b9",
  storageBucket: "games-563b9.firebasestorage.app",
  messagingSenderId: "84338898086",
  appId: "1:84338898086:web:a096e8766d65f7129ef067",
  measurementId: "G-032GZRR0EJ",
};

const app = initializeApp(firebaseConfig);

// Экспорт для использования в script.js
export const db = getFirestore(app);
export { collection, doc, setDoc, getDoc, updateDoc, onSnapshot };
