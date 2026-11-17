import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCSYfdcEWTVlJH_Y0eR5-J1UtBemSDM8Kc",
  authDomain: "writelan-3d9f7.firebaseapp.com",
  projectId: "writelan-3d9f7",
  storageBucket: "writelan-3d9f7.firebasestorage.app",
  messagingSenderId: "795305585238",
  appId: "1:795305585238:web:c9695a2ae91089e325e9f7",
  measurementId: "G-V8M4B4F10M"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ฟังก์ชันสลับสีปุ่มเมนูด้านล่างเมื่อกดเลือก
window.switchTab = function(element, tabName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');
    console.log("เปิดหน้า:", tabName);
};

// ฟังก์ชันเมื่อกดปุ่มทางลัด 4 ปุ่มด้านบน
window.selectMenu = function(menuName) {
    console.log("เลือกเมนู:", menuName);
};