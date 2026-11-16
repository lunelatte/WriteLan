import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  onAuthStateChanged, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs,
  addDoc, updateDoc, query, where, orderBy, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ⚠️ นำค่า Config จาก Firebase Console ของคุณมาใส่ตรงนี้
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let currentUser = null;
let userData = { favorites: [], bookmarks: [], readHistory: [] };
let allNovels = [];
let selectedContentWarnings = [];
let currentStudioNovelId = null;
let currentChapterFootnotes = [];
let currentReadingNovel = null;
let currentReadingChapter = null;

// ================= 1. เปลี่ยนชุดสีหลักของเว็บ (4 ธีม) =================
window.setTheme = (themeName) => {
  document.documentElement.setAttribute("data-theme", themeName);
  localStorage.setItem("writelan_theme", themeName);
  const selector = document.getElementById("theme-selector");
  if (selector) selector.value = themeName;
};

const savedTheme = localStorage.getItem("writelan_theme") || "pruksa";
window.setTheme(savedTheme);
document.getElementById("theme-selector").addEventListener("change", (e) => window.setTheme(e.target.value));

// ================= 2. หน้าแรกพิกเซล & ระบบสมาชิก =================
document.getElementById("btn-start-app").addEventListener("click", () => {
  document.getElementById("view-splash").classList.remove("active");
  if (currentUser) {
    document.getElementById("app-shell").classList.remove("hidden");
  } else {
    document.getElementById("view-auth").classList.add("active");
  }
});

let isRegisterMode = false;
document.getElementById("auth-toggle-link").addEventListener("click", (e) => {
  e.preventDefault();
  isRegisterMode = !isRegisterMode;
  document.getElementById("register-fields").classList.toggle("hidden", !isRegisterMode);
  document.getElementById("auth-title").textContent = isRegisterMode ? "สมัครสมาชิกใหม่" : "เข้าสู่ระบบ WriteLan";
  document.getElementById("auth-submit-btn").textContent = isRegisterMode ? "สมัครสมาชิก" : "เข้าสู่ระบบ";
  document.getElementById("auth-switch-text").textContent = isRegisterMode ? "มีบัญชีอยู่แล้ว?" : "ยังไม่เคยเป็นสมาชิก?";
  document.getElementById("auth-toggle-link").textContent = isRegisterMode ? "เข้าสู่ระบบ" : "สมัครสมาชิกที่นี่";
});

document.getElementById("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const displayName = document.getElementById("auth-displayname").value.trim() || "นักอ่าน WriteLan";

  try {
    if (isRegisterMode) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      await setDoc(doc(db, "users", cred.user.uid), {
        displayName, favorites: [], bookmarks: [], readHistory: []
      });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (err) {
    alert("เกิดข้อผิดพลาด: " + err.message);
  }
});

document.getElementById("btn-logout").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    document.getElementById("view-splash").classList.remove("active");
    document.getElementById("view-auth").classList.remove("active");
    document.getElementById("app-shell").classList.remove("hidden");
    document.getElementById("acc-username").textContent = user.displayName || user.email;
    await loadUserData();
    await loadAllNovels();
  } else {
    document.getElementById("app-shell").classList.add("hidden");
    document.getElementById("view-splash").classList.add("active");
  }
});

async function loadUserData() {
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    userData = snap.data();
  } else {
    await setDoc(userRef, { displayName: currentUser.displayName || "นักอ่าน", favorites: [], bookmarks: [], readHistory: [] });
  }
  updateAccountStats();
}

// ================= 3. ระบบสลับแท็บเมนูด้านล่าง =================
document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.dataset.target;
    document.getElementById(target).classList.add("active");

    if (target === "tab-library") renderLibrary();
    if (target === "tab-writer") renderMyNovels();
    if (target === "tab-account") updateAccountStats();
  });
});

document.getElementById("btn-go-library").addEventListener("click", () => {
  document.querySelector('[data-target="tab-library"]').click();
});

// ================= 4. โหลดนิยาย & ค้นหาตามแท็ก =================
async function loadAllNovels() {
  const snap = await getDocs(collection(db, "novels"));
  allNovels = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderNovelGrid(allNovels, "home-novels-grid");
  renderQuickTags();
  updateAccountStats();
}

function renderQuickTags() {
  const tagSet = new Set(["แฟนตาซี", "สยองขวัญ", "กาว", "ดันเจี้ยน", "จีนโบราณ", "พีเรียด"]);
  allNovels.forEach(n => (n.tags || []).forEach(t => tagSet.add(t)));
  const container = document.getElementById("quick-tags");
  container.innerHTML = "";
  Array.from(tagSet).slice(0, 10).forEach(tag => {
    const btn = document.createElement("button");
    btn.className = "tag-pill";
    btn.textContent = "#" + tag;
    btn.onclick = () => {
      document.getElementById("tag-search-input").value = tag;
      filterNovelsByTag(tag);
    };
    container.appendChild(btn);
  });
}

document.getElementById("tag-search-input").addEventListener("input", (e) => {
  filterNovelsByTag(e.target.value.trim());
});

function filterNovelsByTag(keyword) {
  const resSection = document.getElementById("search-results-section");
  if (!keyword) {
    resSection.classList.add("hidden");
    return;
  }
  const kw = keyword.toLowerCase();
  const matched = allNovels.filter(n =>
    (n.tags || []).some(t => t.toLowerCase().includes(kw)) ||
    (n.title || "").toLowerCase().includes(kw) ||
    (n.category || "").toLowerCase().includes(kw)
  );
  document.getElementById("search-keyword-label").textContent = keyword;
  resSection.classList.remove("hidden");
  renderNovelGrid(matched, "search-results-grid");
}

function renderNovelGrid(novels, containerId) {
  const grid = document.getElementById(containerId);
  if (!novels.length) {
    grid.innerHTML = `<p style="color:var(--text-muted); grid-column:1/-1;">ยังไม่มีนิยายในหมวดนี้</p>`;
    return;
  }
  grid.innerHTML = novels.map(n => `
    <div class="novel-card" onclick="openNovelDetail('${n.id}')">
      <img src="${n.coverUrl || 'artworks/BG1.png'}" alt="${n.title}" />
      <div class="novel-card-info">
        <div class="novel-card-title">${n.nsfw ? '🔞 ' : ''}${n.title}</div>
        <div class="novel-card-meta">${n.category} • ${n.status || 'มาใหม่'}</div>
        <div class="novel-card-meta">✍️ ${n.author || 'ไม่ระบุ'}</div>
      </div>
    </div>
  `).join("");
}

// ================= 5. สตูดิโอนักเขียน (สร้าง/แก้ไขนิยาย) =================
function renderMyNovels() {
  document.getElementById("writer-dashboard").classList.remove("hidden");
  document.getElementById("novel-studio").classList.add("hidden");
  document.getElementById("chapter-editor-view").classList.add("hidden");

  const mine = allNovels.filter(n => n.ownerId === currentUser.uid);
  const list = document.getElementById("my-novels-list");
  if (!mine.length) {
    list.innerHTML = `<p style="color:var(--text-muted);">คุณยังไม่ได้สร้างนิยาย กดปุ่ม "+ เพิ่มเรื่องใหม่" ด้านบนได้เลย!</p>`;
    return;
  }
  list.innerHTML = mine.map(n => `
    <div class="chapter-item-card" onclick="openNovelStudio('${n.id}')">
      <div style="display:flex; gap:12px; align-items:center;">
        <img src="${n.coverUrl || 'artworks/BG1.png'}" style="width:50px; height:68px; object-fit:cover; border-radius:8px;" />
        <div>
          <strong>${n.title}</strong>
          <div style="font-size:0.8rem; color:var(--text-muted);">${n.category} • ${n.status} • เรท ${n.rating}</div>
        </div>
      </div>
      <span>จัดการเรื่อง &gt;</span>
    </div>
  `).join("");
}

document.getElementById("btn-create-novel").addEventListener("click", () => openNovelStudio(null));
document.getElementById("btn-back-writer").addEventListener("click", renderMyNovels);

// จัดการปุ่มคำเตือนเนื้อหาแบบภาพที่ 3
document.querySelectorAll(".cw-chip:not(.add-custom)").forEach(chip => {
  chip.addEventListener("click", () => {
    const cw = chip.dataset.cw;
    chip.classList.toggle("selected");
    if (selectedContentWarnings.includes(cw)) {
      selectedContentWarnings = selectedContentWarnings.filter(x => x !== cw);
    } else {
      selectedContentWarnings.push(cw);
    }
  });
});

document.getElementById("btn-add-custom-cw").addEventListener("click", () => {
  const custom = prompt("พิมพ์คำเตือนเนื้อหาเพิ่มเติม:");
  if (custom && custom.trim()) {
    const val = custom.trim();
    selectedContentWarnings.push(val);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cw-chip selected";
    btn.textContent = val;
    document.getElementById("cw-chips-container").insertBefore(btn, document.getElementById("btn-add-custom-cw"));
  }
});

let selectedCoverFile = null;
document.getElementById("novel-cover-input").addEventListener("change", (e) => {
  if (e.target.files[0]) {
    selectedCoverFile = e.target.files[0];
    document.getElementById("cover-preview").src = URL.createObjectURL(selectedCoverFile);
  }
});

window.openNovelStudio = async (novelId) => {
  currentStudioNovelId = novelId;
  selectedCoverFile = null;
  document.getElementById("writer-dashboard").classList.add("hidden");
  document.getElementById("chapter-editor-view").classList.add("hidden");
  document.getElementById("novel-studio").classList.remove("hidden");

  document.querySelectorAll(".cw-chip").forEach(c => c.classList.remove("selected"));
  selectedContentWarnings = [];

  if (!novelId) {
    document.getElementById("studio-form-title").textContent = "สร้างนิยายเรื่องใหม่";
    document.getElementById("novel-meta-form").reset();
    document.getElementById("cover-preview").src = "artworks/BG1.png";
    document.getElementById("studio-chapters-section").classList.add("hidden");
  } else {
    const novel = allNovels.find(n => n.id === novelId);
    document.getElementById("studio-form-title").textContent = "สตูดิโอนิยาย: " + novel.title;
    document.getElementById("novel-title").value = novel.title || "";
    document.getElementById("novel-category").value = novel.category || "แฟนตาซี";
    document.getElementById("novel-author").value = novel.author || "";
    document.getElementById("novel-artist").value = novel.artist || "";
    document.getElementById("novel-status").value = novel.status || "มาใหม่";
    document.getElementById("novel-tags").value = (novel.tags || []).join(", ");
    document.getElementById("novel-nsfw").checked = !!novel.nsfw;
    document.getElementById("novel-cw-detail").value = novel.cwDetail || "";
    document.getElementById("novel-short-desc").value = novel.shortDesc || "";
    document.getElementById("novel-long-desc").value = novel.longDesc || "";
    document.getElementById("cover-preview").src = novel.coverUrl || "artworks/BG1.png";

    const rRadio = document.querySelector(`input[name="novel-rating"][value="${novel.rating || 'G'}"]`);
    if (rRadio) rRadio.checked = true;

    selectedContentWarnings = novel.contentWarnings || [];
    document.querySelectorAll(".cw-chip").forEach(c => {
      if (selectedContentWarnings.includes(c.dataset.cw)) c.classList.add("selected");
    });

    document.getElementById("studio-chapters-section").classList.remove("hidden");
    await loadStudioChapters(novelId);
  }
};

document.getElementById("novel-meta-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  let coverUrl = document.getElementById("cover-preview").src;

  if (selectedCoverFile) {
    const storageRef = ref(storage, `covers/${currentUser.uid}_${Date.now()}`);
    await uploadBytes(storageRef, selectedCoverFile);
    coverUrl = await getDownloadURL(storageRef);
  }

  const tagsRaw = document.getElementById("novel-tags").value;
  const tagsArray = tagsRaw.split(",").map(t => t.trim()).filter(Boolean);

  const payload = {
    ownerId: currentUser.uid,
    title: document.getElementById("novel-title").value.trim(),
    category: document.getElementById("novel-category").value,
    author: document.getElementById("novel-author").value.trim(),
    artist: document.getElementById("novel-artist").value.trim(),
    status: document.getElementById("novel-status").value,
    tags: tagsArray,
    rating: document.querySelector('input[name="novel-rating"]:checked').value,
    nsfw: document.getElementById("novel-nsfw").checked,
    contentWarnings: selectedContentWarnings,
    cwDetail: document.getElementById("novel-cw-detail").value.trim(),
    shortDesc: document.getElementById("novel-short-desc").value.trim(),
    longDesc: document.getElementById("novel-long-desc").value.trim(),
    coverUrl,
    updatedAt: Date.now()
  };

  if (currentStudioNovelId) {
    await updateDoc(doc(db, "novels", currentStudioNovelId), payload);
  } else {
    const docRef = await addDoc(collection(db, "novels"), { ...payload, totalWords: 0 });
    currentStudioNovelId = docRef.id;
  }

  alert("บันทึกข้อมูลนิยายเรียบร้อยแล้ว!");
  await loadAllNovels();
  openNovelStudio(currentStudioNovelId);
});

// ================= 6. หน้าเพิ่ม/แก้ไขตอน (Rich Editor + นับคำไทย/อังกฤษ) =================
async function loadStudioChapters(novelId) {
  const snap = await getDocs(collection(db, "novels", novelId, "chapters"));
  const chapters = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const list = document.getElementById("studio-chapter-list");
  list.innerHTML = chapters.map(ch => `
    <div class="chapter-item-card" onclick="openChapterEditor('${ch.id}')">
      <div>
        <strong>${ch.title}</strong>
        <div style="font-size:0.78rem; color:var(--text-muted);">
          ${ch.published ? '🟢 เผยแพร่แล้ว' : '🟡 ฉบับร่าง (Draft)'} • ${ch.wordCount || 0} คำ
        </div>
      </div>
      <span>แก้ไข &gt;</span>
    </div>
  `).join("") || `<p style="color:var(--text-muted);">ยังไม่มีตอน กด "+ เพิ่มตอนใหม่"</p>`;
}

document.getElementById("btn-new-chapter").addEventListener("click", () => openChapterEditor(null));
document.getElementById("btn-back-studio").addEventListener("click", () => openNovelStudio(currentStudioNovelId));

const editorArea = document.getElementById("chapter-content-editor");

function countWordsAccurate(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return 0;
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter("th", { granularity: "word" });
    let count = 0;
    for (const seg of segmenter.segment(clean)) {
      if (seg.isWordLike) count++;
    }
    return count;
  }
  return clean.split(" ").length;
}

editorArea.addEventListener("input", () => {
  const words = countWordsAccurate(editorArea.innerText);
  document.getElementById("editor-word-count").textContent = words.toLocaleString();
});

document.querySelectorAll(".tb-btn[data-cmd]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.execCommand(btn.dataset.cmd, false, null);
    editorArea.focus();
  });
});

document.getElementById("editor-font-select").addEventListener("change", (e) => {
  editorArea.style.fontFamily = e.target.value;
});

document.getElementById("text-color-picker").addEventListener("input", (e) => {
  document.execCommand("foreColor", false, e.target.value);
});

document.getElementById("hilite-color-picker").addEventListener("input", (e) => {
  document.execCommand("hiliteColor", false, e.target.value);
});

document.getElementById("btn-insert-indent").addEventListener("click", () => {
  document.execCommand("insertHTML", false, "&emsp;&emsp;");
});

document.getElementById("btn-insert-image").addEventListener("click", () => {
  document.getElementById("editor-img-upload").click();
});
document.getElementById("editor-img-upload").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const sRef = ref(storage, `chapter_images/${currentUser.uid}_${Date.now()}`);
  await uploadBytes(sRef, file);
  const url = await getDownloadURL(sRef);
  editorArea.focus();
  document.execCommand("insertImage", false, url);
});

document.getElementById("btn-insert-footnote").addEventListener("click", () => {
  const noteText = prompt("พิมพ์คำอธิบายเชิงอรรถ:");
  if (!noteText) return;
  const idx = currentChapterFootnotes.length + 1;
  currentChapterFootnotes.push({ index: idx, text: noteText });
  editorArea.focus();
  document.execCommand("insertHTML", false, `<sup>[${idx}]</sup>`);
  renderEditorFootnotes();
});

function renderEditorFootnotes() {
  const box = document.getElementById("editor-footnotes-box");
  const list = document.getElementById("footnotes-list");
  if (!currentChapterFootnotes.length) {
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  list.innerHTML = currentChapterFootnotes.map(f => `<div style="font-size:0.85rem;"><strong>[${f.index}]</strong> ${f.text}</div>`).join("");
}

let editingChapterId = null;
window.openChapterEditor = async (chapterId) => {
  editingChapterId = chapterId;
  document.getElementById("novel-studio").classList.add("hidden");
  document.getElementById("chapter-editor-view").classList.remove("hidden");
  currentChapterFootnotes = [];

  if (!chapterId) {
    document.getElementById("chapter-title-input").value = "";
    editorArea.innerHTML = "";
    document.getElementById("editor-word-count").textContent = "0";
    renderEditorFootnotes();
  } else {
    const chSnap = await getDoc(doc(db, "novels", currentStudioNovelId, "chapters", chapterId));
    const ch = chSnap.data();
    document.getElementById("chapter-title-input").value = ch.title || "";
    editorArea.innerHTML = ch.contentHtml || "";
    currentChapterFootnotes = ch.footnotes || [];
    document.getElementById("editor-word-count").textContent = (ch.wordCount || 0).toLocaleString();
    renderEditorFootnotes();
  }
};

async function saveChapter(isPublished) {
  const title = document.getElementById("chapter-title-input").value.trim() || "ไม่มีชื่อตอน";
  const contentHtml = editorArea.innerHTML;
  const wordCount = countWordsAccurate(editorArea.innerText);

  const payload = {
    title, contentHtml, wordCount,
    footnotes: currentChapterFootnotes,
    published: isPublished,
    updatedAt: Date.now()
  };

  if (editingChapterId) {
    await updateDoc(doc(db, "novels", currentStudioNovelId, "chapters", editingChapterId), payload);
  } else {
    await addDoc(collection(db, "novels", currentStudioNovelId, "chapters"), { ...payload, createdAt: Date.now() });
  }

  const allChSnap = await getDocs(collection(db, "novels", currentStudioNovelId, "chapters"));
  let totalWords = 0;
  allChSnap.forEach(d => totalWords += (d.data().wordCount || 0));
  await updateDoc(doc(db, "novels", currentStudioNovelId), { totalWords });

  alert(isPublished ? "เผยแพร่ตอนเรียบร้อยแล้ว!" : "บันทึกฉบับร่างเรียบร้อย!");
  await loadAllNovels();
  openNovelStudio(currentStudioNovelId);
}

document.getElementById("btn-save-draft").addEventListener("click", () => saveChapter(false));
document.getElementById("btn-publish-chapter").addEventListener("click", () => saveChapter(true));

// ================= 7. หน้าอ่านนิยาย + ตั้งค่า 6 ระดับ + บุ๊กมาร์ก + รายการโปรด =================
window.openNovelDetail = async (novelId) => {
  const novel = allNovels.find(n => n.id === novelId);
  currentReadingNovel = novel;
  const modal = document.getElementById("novel-detail-modal");
  modal.classList.remove("hidden");

  const isFav = (userData.favorites || []).includes(novelId);
  const favBtn = document.getElementById("btn-toggle-fav");
  favBtn.textContent = isFav ? "❤️ อยู่ในรายการโปรด" : "🤍 เพิ่มรายการโปรด";
  favBtn.onclick = async () => {
    const uRef = doc(db, "users", currentUser.uid);
    if ((userData.favorites || []).includes(novelId)) {
      await updateDoc(uRef, { favorites: arrayRemove(novelId) });
    } else {
      await updateDoc(uRef, { favorites: arrayUnion(novelId) });
    }
    await loadUserData();
    openNovelDetail(novelId);
  };

  const chSnap = await getDocs(collection(db, "novels", novelId, "chapters"));
  const chapters = chSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(c => c.published || novel.ownerId === currentUser.uid)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  document.getElementById("novel-detail-body").innerHTML = `
    <div style="max-width:720px; margin:16px auto;">
      <div style="display:flex; gap:16px; margin-bottom:16px;">
        <img src="${novel.coverUrl || 'artworks/BG1.png'}" style="width:120px; height:165px; object-fit:cover; border-radius:14px;" />
        <div>
          <h2 style="margin:0 0 6px;">${novel.nsfw ? '🔞 ' : ''}${novel.title}</h2>
          <div>✍️ เขียนโดย: <strong>${novel.author || '-'}</strong></div>
          <div>🎨 วาดโดย: <strong>${novel.artist || '-'}</strong></div>
          <div>หมวด: ${novel.category} | สถานะ: ${novel.status} | เรท: ${novel.rating}</div>
          <div style="margin-top:8px;">${(novel.tags || []).map(t => `<span class="tag-pill">#${t}</span>`).join(" ")}</div>
        </div>
      </div>

      ${(novel.contentWarnings && novel.contentWarnings.length) ? `
        <div class="warning-box-container">
          <strong>⚠️ คำเตือนเนื้อหา:</strong> ${novel.contentWarnings.join(", ")}
          ${novel.cwDetail ? `<p style="margin:6px 0 0; font-size:0.88rem;">${novel.cwDetail}</p>` : ''}
        </div>
      ` : ''}

      <div class="studio-card">
        <strong>คำโปรย:</strong>
        <p>${novel.shortDesc || '-'}</p>
        <strong>แนะนำเรื่อง:</strong>
        <p style="white-space:pre-line;">${novel.longDesc || '-'}</p>
      </div>

      <h3>สารบัญตอน (${chapters.length} ตอน)</h3>
      ${chapters.map(ch => `
        <div class="chapter-item-card" onclick="openReader('${novelId}', '${ch.id}')">
          <div>
            <strong>${ch.title}</strong>
            <div style="font-size:0.78rem; color:var(--text-muted);">จำนวนคำ: ${(ch.wordCount || 0).toLocaleString()} คำ</div>
          </div>
          <span>อ่านเลย &gt;</span>
        </div>
      `).join("")}
    </div>
  `;
};

document.getElementById("btn-close-detail").addEventListener("click", () => {
  document.getElementById("novel-detail-modal").classList.add("hidden");
});

window.openReader = async (novelId, chapterId) => {
  const chSnap = await getDoc(doc(db, "novels", novelId, "chapters", chapterId));
  const ch = { id: chapterId, novelId, ...chSnap.data() };
  currentReadingChapter = ch;

  document.getElementById("reader-modal").classList.remove("hidden");
  document.getElementById("reader-chapter-title").textContent = ch.title;
  document.getElementById("reader-word-count").textContent = (ch.wordCount || 0).toLocaleString();
  document.getElementById("reader-body-text").innerHTML = ch.contentHtml || "";

  const fnBox = document.getElementById("reader-footnotes-display");
  fnBox.innerHTML = (ch.footnotes && ch.footnotes.length)
    ? `<hr><h4>เชิงอรรถ</h4>` + ch.footnotes.map(f => `<p style="font-size:0.85rem;"><strong>[${f.index}]</strong> ${f.text}</p>`).join("")
    : "";

  await updateDoc(doc(db, "users", currentUser.uid), { readHistory: arrayUnion(novelId) });
  await loadUserData();
};

document.getElementById("btn-close-reader").addEventListener("click", () => {
  document.getElementById("reader-modal").classList.add("hidden");
  document.getElementById("reader-settings-panel").classList.add("hidden");
});

document.getElementById("btn-bookmark-chapter").addEventListener("click", async () => {
  if (!currentReadingChapter) return;
  const bmObj = {
    novelId: currentReadingChapter.novelId,
    novelTitle: currentReadingNovel?.title || "นิยาย",
    chapterId: currentReadingChapter.id,
    chapterTitle: currentReadingChapter.title
  };
  await updateDoc(doc(db, "users", currentUser.uid), { bookmarks: arrayUnion(bmObj) });
  await loadUserData();
  alert("⭐ บันทึกตอนโปรดลงในบุ๊กมาร์กแล้ว!");
});

document.getElementById("btn-reader-settings").addEventListener("click", () => {
  document.getElementById("reader-settings-panel").classList.toggle("hidden");
});

const readerTextEl = document.getElementById("reader-body-text");
document.querySelectorAll(".font-choice").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".font-choice").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    readerTextEl.style.fontFamily = btn.dataset.font;
  });
});

const sizeSlider = document.getElementById("reader-fontsize-slider");
function updateFontSize(val) {
  sizeSlider.value = val;
  document.getElementById("reader-fontsize-val").textContent = val;
  readerTextEl.style.fontSize = val + "px";
}
sizeSlider.addEventListener("input", (e) => updateFontSize(e.target.value));
document.getElementById("btn-font-dec").addEventListener("click", () => updateFontSize(Math.max(14, Number(sizeSlider.value) - 1)));
document.getElementById("btn-font-inc").addEventListener("click", () => updateFontSize(Math.min(28, Number(sizeSlider.value) + 1)));

const lineHeights = [1.0, 1.3, 1.6, 1.9, 2.2, 2.5];
document.getElementById("reader-lineheight-slider").addEventListener("input", (e) => {
  const lh = lineHeights[Number(e.target.value)];
  document.getElementById("reader-lineheight-val").textContent = lh.toFixed(1);
  readerTextEl.style.lineHeight = lh;
});

// ================= 8. คลังของฉัน & สถิติหน้าบัญชี =================
document.querySelectorAll(".sub-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sub-tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".sub-tab-pane").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.subtab).classList.add("active");
  });
});

function renderLibrary() {
  const favNovels = allNovels.filter(n => (userData.favorites || []).includes(n.id));
  renderNovelGrid(favNovels, "favorites-grid");

  const bmList = document.getElementById("bookmarks-list");
  const bms = userData.bookmarks || [];
  bmList.innerHTML = bms.length
    ? bms.map(b => `
        <div class="chapter-item-card" onclick="openReader('${b.novelId}', '${b.chapterId}')">
          <div>
            <strong>${b.chapterTitle}</strong>
            <div style="font-size:0.8rem; color:var(--text-muted);">เรื่อง: ${b.novelTitle}</div>
          </div>
          <span>อ่านต่อ &gt;</span>
        </div>
      `).join("")
    : `<p style="color:var(--text-muted);">ยังไม่มีตอนที่บุ๊กมาร์กไว้</p>`;
}

function updateAccountStats() {
  document.getElementById("stat-read-count").textContent = (userData.readHistory || []).length;
  document.getElementById("stat-fav-count").textContent = (userData.favorites || []).length;

  const myWrittenWords = allNovels
    .filter(n => currentUser && n.ownerId === currentUser.uid)
    .reduce((sum, n) => sum + (n.totalWords || 0), 0);
  document.getElementById("stat-word-count").textContent = myWrittenWords.toLocaleString();
}