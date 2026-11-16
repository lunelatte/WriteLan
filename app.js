// นำเข้า Firebase SDKs (ใช้ ES Modules จาก CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  onAuthStateChanged, signOut, updateProfile 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, collection, doc, setDoc, getDoc, getDocs, 
  addDoc, updateDoc, query, where, orderBy, arrayUnion, arrayRemove 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ตั้งค่า Firebase Config ของคุณ
const firebaseConfig = {
  apiKey: "AIzaSyCSYfdcEWTVlJH_Y0eR5-J1UtBemSDM8Kc",
  authDomain: "writelan-3d9f7.firebaseapp.com",
  projectId: "writelan-3d9f7",
  storageBucket: "writelan-3d9f7.firebasestorage.app",
  messagingSenderId: "795305585238",
  appId: "1:795305585238:web:c9695a2ae91089e325e9f7",
  measurementId: "G-V8M4B4F10M"
};

// เริ่มต้นใช้งาน Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("Firebase initialized successfully!");