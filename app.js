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


// 2. ระบบสลับธีมสี 4 โหมด พร้อมเปลี่ยนสีขอบบนสุดของมือถือให้กลมกลืน
const themes = [
    { class: 'theme-teal', icon: '☁️', bgColor: '#f2fbfa' },
    { class: 'theme-coffee', icon: '☕️', bgColor: '#faf3eb' },
    { class: 'theme-pink', icon: '🌷', bgColor: '#fdf2f8' },
    { class: 'theme-dark', icon: '🌙', bgColor: '#0b1120' }
];
let currentThemeIdx = 0;

window.cycleTheme = function() {
    currentThemeIdx = (currentThemeIdx + 1) % themes.length;
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    const metaTheme = document.getElementById('meta-theme-color');
    
    themes.forEach(t => body.classList.remove(t.class));
    
    const selected = themes[currentThemeIdx];
    body.classList.add(selected.class);
    
    if (themeIcon) themeIcon.textContent = selected.icon;
    if (metaTheme) metaTheme.setAttribute('content', selected.bgColor);
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

// ฟังก์ชันสลับแท็บเมนูด้านล่าง
window.switchTab = function(element, tabName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');

    // จัดการการแสดงผลแต่ละหน้า
    const homeSections = document.querySelectorAll('.banner-slider-container, .quick-menu, .novel-section');
    const profilePage = document.getElementById('profile-page');

    if (tabName === 'บัญชี') {
        // ซ่อนหน้าแรก แสดงหน้าบัญชี
        homeSections.forEach(sec => sec.style.display = 'none');
        if (profilePage) profilePage.style.display = 'block';
    } else {
        // แสดงหน้าแรก ซ่อนหน้าบัญชี (สำหรับแท็บอื่นๆ ที่กำลังพัฒนาต่อ)
        homeSections.forEach(sec => sec.style.display = '');
        if (profilePage) profilePage.style.display = 'none';
    }
};

window.openProfileDetail = function() {
    alert("ไปยังหน้าโปรไฟล์ของคุณ");
};

window.openMenuAction = function(menuName) {
    alert("เปิดเมนู: " + menuName);
};

window.handleLogout = function() {
    if(confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
        alert("ออกจากระบบเรียบร้อยแล้ว");
    }
};