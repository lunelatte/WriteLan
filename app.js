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

// 1. ระบบแบนเนอร์เลื่อนอัตโนมัติทุกๆ 5 วินาที
let currentBannerIndex = 0;
const totalSlides = 3;

function showSlide(index) {
    const track = document.getElementById('bannerTrack');
    const dots = document.querySelectorAll('.b-dot');
    if (!track) return;
    
    currentBannerIndex = (index + totalSlides) % totalSlides;
    track.style.transform = `translateX(-${currentBannerIndex * 33.333}%)`;
    
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentBannerIndex);
    });
}

window.currentSlide = function(index) {
    showSlide(index);
}

// ตั้งเวลาเปลี่ยนสไลด์ทุก 5 วินาที
setInterval(() => {
    showSlide(currentBannerIndex + 1);
}, 5000);


// 2. ระบบสลับธีมสี 4 โหมด (☁️ -> ☕️ -> 🌷 -> 🌙)
const themes = [
    { class: 'theme-teal', icon: '☁️' },
    { class: 'theme-coffee', icon: '☕️' },
    { class: 'theme-pink', icon: '🌷' },
    { class: 'theme-dark', icon: '🌙' }
];
let currentThemeIdx = 0;

window.cycleTheme = function() {
    currentThemeIdx = (currentThemeIdx + 1) % themes.length;
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    
    // ลบธีมเก่าออกทั้งหมด
    themes.forEach(t => body.classList.remove(t.class));
    
    // ใส่ธีมใหม่
    body.classList.add(themes[currentThemeIdx].class);
    if (themeIcon) {
        themeIcon.textContent = themes[currentThemeIdx].icon;
    }
};


// 3. ฟังก์ชันควบคุมการคลิกเมนูต่างๆ
window.switchTab = function(element, tabName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');
    console.log("เปิดหน้า:", tabName);
};

window.selectMenu = function(menuName) {
    console.log("เลือกเมนู:", menuName);
};

window.openSearch = function() {
    alert("เปิดหน้าค้นหานิยาย");
};

window.openNotifications = function() {
    alert("เปิดหน้าแจ้งเตือน");
};