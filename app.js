/*
  Koi 💗 — Build 1
  Local-first PWA prototype.
  --------------------------------------------
  This build intentionally keeps everything in localStorage so you can test
  the complete app flow before connecting Supabase/auth/sync later.

  Included in Build 1:
  - Onboarding + local pair setup
  - Two local test profiles (switch between partners)
  - Home / Today daily question flow
  - Private answers locked until both respond
  - Answer reactions + question skip
  - Us dashboard + derived journey stats
  - Check-ins (mood, energy, social battery, need)
  - Memories CRUD + optional compressed photo
  - Same Moment, Two Sides private perspective flow
  - Relationship Lore CRUD
  - Our Museum auto-gallery
  - Date Jar CRUD + random picker + filters
  - Our Room + unlockable/customizable decor
  - Our Canon + Traditions
  - Then vs Now starter flow
  - Paired pink + lavender themes + wallpapers
  - Reminder preferences + browser notification permission hook
  - JSON export/import + local reset
  - Offline service worker + install prompt hook
*/

const STORAGE_KEY = "koi_build1_state_v1";
const CURRENT_VERSION = 3;

const QUESTION_BANK = [
  { id: "q01", category: "Sweet", text: "What’s one small thing I did recently that made you feel loved?" },
  { id: "q02", category: "Funny", text: "What is one tiny thing about me that always makes you laugh?" },
  { id: "q03", category: "Memory", text: "Which ordinary day with me do you secretly wish you could relive?" },
  { id: "q04", category: "Future", text: "If we could disappear for one weekend, where would you take us?" },
  { id: "q05", category: "Food", text: "What meal instantly feels like an ‘us’ meal now?" },
  { id: "q06", category: "Cute", text: "What is something I do that you find cute but rarely tell me?" },
  { id: "q07", category: "Deep", text: "What do you think we understand about each other better now than a year ago?" },
  { id: "q08", category: "Playful", text: "If our relationship had a ridiculous mascot, what would it be?" },
  { id: "q09", category: "Gratitude", text: "What are you quietly grateful to me for this week?" },
  { id: "q10", category: "Travel", text: "What place would you love to experience with me for the first time?" },
  { id: "q11", category: "This or That", text: "For our next date: dressed-up night out or cozy stay-at-home night?" },
  { id: "q12", category: "Lore", text: "Which inside joke of ours would be impossible to explain to anyone else?" },
  { id: "q13", category: "Comfort", text: "When you’ve had a rough day, what do I do that helps the most?" },
  { id: "q14", category: "Future", text: "What little tradition would you love us to still be doing ten years from now?" },
  { id: "q15", category: "Dreamy", text: "What does our perfect slow morning look like?" }
];

const THEME_PAIRS = {
  wedding: {
    label: "Wedding Soft",
    pink: "#F3B8D0",
    pinkDeep: "#D96E9B",
    pinkSoft: "#FCE7F0",
    lavender: "#D7C4F2",
    lavenderDeep: "#8F73B8",
    lavenderSoft: "#F0E9FA"
  },
  powder: {
    label: "Powder Bloom",
    pink: "#F6C8D9",
    pinkDeep: "#D87CA0",
    pinkSoft: "#FDEBF2",
    lavender: "#CDC2EE",
    lavenderDeep: "#8271AF",
    lavenderSoft: "#EEEAF9"
  },
  roseLilac: {
    label: "Rose & Lilac",
    pink: "#EFAFCB",
    pinkDeep: "#C9608C",
    pinkSoft: "#FBE3ED",
    lavender: "#C8B3E8",
    lavenderDeep: "#7F65AA",
    lavenderSoft: "#ECE3F7"
  },
  cotton: {
    label: "Cotton Candy",
    pink: "#F5BFD8",
    pinkDeep: "#D26F9C",
    pinkSoft: "#FDE8F2",
    lavender: "#DECDF5",
    lavenderDeep: "#9578BE",
    lavenderSoft: "#F2EBFB"
  }
};

const WALLPAPER_OPTIONS = [
  { id: "petals", label: "Petals" },
  { id: "clouds", label: "Clouds" },
  { id: "ribbon", label: "Ribbon" },
  { id: "gingham", label: "Gingham" },
  { id: "bubbles", label: "Bubbles" },
  { id: "sparkle", label: "Sparkle" },
  { id: "waves", label: "Waves" },
  { id: "confetti", label: "Confetti" },
  { id: "soft", label: "Soft Glow" }
];

function normalizeHexColor(value, fallback = "#F3B8D0") {
  const raw = String(value || "").trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(raw)) return raw;
  if (/^[0-9A-F]{6}$/.test(raw)) return `#${raw}`;
  return fallback;
}

function mixHexColor(color, target, amount) {
  const from = normalizeHexColor(color).slice(1);
  const to = normalizeHexColor(target, "#FFFFFF").slice(1);
  const ratio = Math.max(0, Math.min(1, Number(amount) || 0));
  const out = [0, 2, 4].map(index => {
    const a = parseInt(from.slice(index, index + 2), 16);
    const b = parseInt(to.slice(index, index + 2), 16);
    return Math.round(a + (b - a) * ratio).toString(16).padStart(2, "0");
  }).join("");
  return `#${out.toUpperCase()}`;
}

function customThemeFromSettings(settings = {}) {
  const first = normalizeHexColor(settings.customColorOne, "#F3B8D0");
  const second = normalizeHexColor(settings.customColorTwo, "#D7C4F2");
  return {
    label: "Our Custom Colors",
    pink: first,
    pinkDeep: mixHexColor(first, "#000000", 0.18),
    pinkSoft: mixHexColor(first, "#FFFFFF", 0.80),
    lavender: second,
    lavenderDeep: mixHexColor(second, "#000000", 0.18),
    lavenderSoft: mixHexColor(second, "#FFFFFF", 0.80)
  };
}

const clone = value => JSON.parse(JSON.stringify(value));
const uid = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const todayKey = () => new Date().toLocaleDateString("en-CA");
const formatDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Not set";
const formatShortDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
const escapeHTML = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

function daysBetween(startValue, end = new Date()) {
  if (!startValue) return 0;
  const start = new Date(`${startValue}T12:00:00`);
  return Math.max(0, Math.floor((end - start) / 86400000));
}

function dateParts(value = "") {
  const [year = "", month = "", day = ""] = String(value || "").split("-");
  return { year, month, day };
}

function compactDatePickerHTML(prefix, value = "", { required = false } = {}) {
  const selected = dateParts(value);
  const now = new Date();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthOptions = months.map((label, index) => {
    const val = String(index + 1).padStart(2, "0");
    return `<option value="${val}" ${selected.month === val ? "selected" : ""}>${label}</option>`;
  }).join("");
  const dayOptions = Array.from({ length: 31 }, (_, index) => {
    const val = String(index + 1).padStart(2, "0");
    return `<option value="${val}" ${selected.day === val ? "selected" : ""}>${index + 1}</option>`;
  }).join("");
  const yearOptions = Array.from({ length: 101 }, (_, index) => now.getFullYear() - index)
    .map(year => `<option value="${year}" ${selected.year === String(year) ? "selected" : ""}>${year}</option>`).join("");
  const req = required ? "required" : "";
  return `<div class="compact-date-picker" data-date-picker="${prefix}">
    <select id="${prefix}Month" name="${prefix}Month" aria-label="Month" ${req}><option value="">Month</option>${monthOptions}</select>
    <select id="${prefix}Day" name="${prefix}Day" aria-label="Day" ${req}><option value="">Day</option>${dayOptions}</select>
    <select id="${prefix}Year" name="${prefix}Year" aria-label="Year" ${req}><option value="">Year</option>${yearOptions}</select>
  </div>`;
}

function readCompactDate(source, prefix, { required = false, futureAllowed = false } = {}) {
  const get = name => {
    if (source instanceof FormData) return String(source.get(name) || "");
    return String(document.getElementById(name)?.value || "");
  };
  const month = get(`${prefix}Month`);
  const day = get(`${prefix}Day`);
  const year = get(`${prefix}Year`);
  if (!month && !day && !year && !required) return "";
  if (!month || !day || !year) throw new Error("Choose the month, day, and year.");
  const iso = `${year}-${month}-${day}`;
  const candidate = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(candidate.getTime()) || candidate.getFullYear() !== Number(year) || candidate.getMonth() + 1 !== Number(month) || candidate.getDate() !== Number(day)) {
    throw new Error("That date is not valid.");
  }
  if (!futureAllowed && candidate > new Date()) throw new Error("That date can't be in the future.");
  return iso;
}

function memoryPhotos(item = {}) {
  const photos = Array.isArray(item.photos) ? item.photos.filter(Boolean) : [];
  if (!photos.length && item.photo) photos.push(item.photo);
  return photos;
}

function primaryMemoryPhoto(item = {}) {
  return memoryPhotos(item)[0] || "";
}

function memoryPhotoGallery(item = {}, { maxHeight = 280 } = {}) {
  const photos = memoryPhotos(item);
  if (!photos.length) return `<div class="frame" style="margin-bottom:12px">${escapeHTML(item.icon || "💗")}</div>`;
  return `<div class="memory-photo-gallery" style="--memory-photo-max:${maxHeight}px">${photos.map((src, index) => `<img src="${escapeHTML(src)}" alt="Memory photo ${index + 1}" loading="lazy">`).join("")}</div>`;
}

function hashString(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash) + text.charCodeAt(i);
  return Math.abs(hash);
}

const DEFAULT_STATE = {
  version: CURRENT_VERSION,
  onboardingComplete: false,
  currentUserId: "u1",
  profiles: [
    { id: "u1", displayName: "You", avatar: "🌷" },
    { id: "u2", displayName: "Love", avatar: "☁️" }
  ],
  pair: {
    pairId: "pair_local_demo",
    anniversary: "2023-03-12",
    relationshipMode: "dating",
    datingAnniversary: "2023-03-12",
    weddingAnniversary: "",
    inviteCode: "KOI-LOVE",
    currentEra: "Golden Everyday Era",
    comfortFood: "Ramen",
    song: "Our favorite song",
    nextDate: "",
    nextDateLabel: "Dinner + something fun"
  },
  settings: {
    themePair: "wedding",
    customColorOne: "#F3B8D0",
    customColorTwo: "#D7C4F2",
    wallpaper: "petals",
    customWallpaperPhoto: "",
    customWallpaperEnabled: false,
    customWallpaperOverlay: "medium",
    customWallpaperPosition: "center",
    dailyReminder: true,
    weeklyCheckin: true,
    notificationPermissionAsked: false,
    questionPack: "all"
  },
  dailyQuestionOverrides: {},
  answers: {},
  reactions: {},
  customQuestions: [],
  littleThings: [],
  dateCompletions: [],
  blindDate: { preferences: { u1: null, u2: null }, match: null, updatedAt: null },
  predictions: [],
  eras: [
    { id: "era_current", title: "Golden Everyday Era", emoji: "✨", startDate: "2023-03-12", endDate: "", description: "The chapter we are living right now.", active: true }
  ],
  activeEraId: "era_current",
  dismissedTraditionSuggestions: [],
  museum: { featuredIds: [] },
  checkins: [],
  memories: [
    {
      id: "m_seed_1",
      type: "memory",
      title: "How We Started",
      date: "2023-03-12",
      location: "Our beginning",
      note: "The chapter that started everything.",
      tags: ["Milestone"],
      chapter: "How We Started",
      photo: "",
      icon: "💗",
      createdAt: Date.now() - 100000
    },
    {
      id: "m_seed_2",
      type: "memory",
      title: "Japan Trip",
      date: "2025-03-31",
      location: "Japan",
      note: "Tiny streets, favorite food, and a lot of walking together.",
      tags: ["Trip", "Japan"],
      chapter: "Adventures",
      photo: "",
      icon: "🌸",
      createdAt: Date.now() - 90000
    },
    {
      id: "m_seed_3",
      type: "two-sides",
      title: "Coffee Date",
      date: "2025-04-12",
      location: "A tiny café",
      note: "One morning, remembered twice.",
      tags: ["Everyday"],
      chapter: "Little Days",
      photo: "",
      icon: "☕",
      sides: {
        u1: { text: "I loved how excited you got about the tiny bookstore beside the café.", submittedAt: Date.now() - 70000 },
        u2: { text: "Your laugh made the whole slow morning feel special.", submittedAt: Date.now() - 65000 }
      },
      createdAt: Date.now() - 80000
    }
  ],
  lore: [
    {
      id: "l_seed_1",
      title: "The Pancake Debate",
      origin: "One of us wanted fluffy pancakes. The other cared way too much about crispy edges.",
      meaning: "A reminder that tiny disagreements usually become our funniest stories.",
      tags: ["Food", "Inside Joke"],
      icon: "🥞",
      createdAt: Date.now() - 60000
    }
  ],
  dateIdeas: [
    { id: "d1", title: "Pick a café neither of us has tried", category: "Food", budget: "Cheap", completed: false },
    { id: "d2", title: "Museum + dessert date", category: "Out", budget: "Treat", completed: false },
    { id: "d3", title: "Cook one new recipe together", category: "At Home", budget: "Cheap", completed: false },
    { id: "d4", title: "Sunset walk + convenience-store snacks", category: "Outdoor", budget: "Free", completed: false }
  ],
  canon: [
    { id: "c1", category: "Comfort Food", text: "Ramen", status: "official" },
    { id: "c2", category: "Default Mood", text: "A little silly", status: "official" }
  ],
  traditions: [
    { id: "t1", title: "Sunday slow morning", cadence: "Weekly", startDate: "2025-01-05", count: 8 }
  ],
  thenNow: [
    { id: "tn1", prompt: "What does our perfect slow morning look like?", oldDate: "2025-01-10", oldAnswer: "Coffee, breakfast, and nowhere to rush to.", newAnswer: "", completedAt: "" }
  ],
  room: {
    level: 3,
    mascots: { pinkName: "Pink Koi", lavenderName: "Lavender Koi" },
    unlockedMoments: [],
    activeDecor: ["lights", "frame", "plant", "plush"],
    unlockedDecor: ["lights", "frame", "plant", "plush", "camera", "heart", "books"],
    pet: "🐰"
  }
};

function deepMerge(base, saved) {
  if (Array.isArray(base)) return Array.isArray(saved) ? saved : base;
  if (typeof base !== "object" || base === null) return saved === undefined ? base : saved;
  const output = { ...base };
  if (saved && typeof saved === "object") {
    Object.keys(saved).forEach(key => {
      output[key] = key in base ? deepMerge(base[key], saved[key]) : saved[key];
    });
  }
  return output;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return saved ? deepMerge(clone(DEFAULT_STATE), saved) : clone(DEFAULT_STATE);
  } catch (error) {
    console.warn("Could not load Koi data; starting fresh.", error);
    return clone(DEFAULT_STATE);
  }
}

let state = loadState();
let runtime = {
  route: location.hash.replace("#", "") || "home",
  memoryTab: "museum",
  extrasView: "",
  selectedDateFilter: "All",
  installPrompt: null,
  onboardingStep: 0,
  onboardingDraft: {}
};

const mainView = document.getElementById("mainView");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalBody = document.getElementById("modalBody");
const modalTitle = document.getElementById("modalTitle");
const modalEyebrow = document.getElementById("modalEyebrow");
const toastEl = document.getElementById("toast");
const appShell = document.getElementById("app");

let localPersistTimer = null;
let lastThemeFingerprint = "";

function themeFingerprint() {
  const settings = state.settings || {};
  const photo = String(settings.customWallpaperPhoto || "");
  // Avoid repeatedly hashing a potentially large data URL. Length + edges are
  // enough to detect practical wallpaper changes without blocking the main thread.
  const photoMark = photo ? `${photo.length}:${photo.slice(0, 28)}:${photo.slice(-28)}` : "";
  return [
    settings.themePair,
    settings.customColorOne,
    settings.customColorTwo,
    settings.wallpaper,
    settings.customWallpaperEnabled,
    settings.customWallpaperOverlay,
    settings.customWallpaperPosition,
    photoMark
  ].join("|");
}

function applyThemeIfChanged(force = false) {
  const next = themeFingerprint();
  if (!force && next === lastThemeFingerprint) return;
  lastThemeFingerprint = next;
  applyTheme();
}

function persistStateNow() {
  clearTimeout(localPersistTimer);
  localPersistTimer = null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Could not save Koi locally.", error);
  }
}

function scheduleStatePersist(delay = 90) {
  clearTimeout(localPersistTimer);
  localPersistTimer = setTimeout(persistStateNow, delay);
}

function saveState() {
  // localStorage writes are synchronous. Batching rapid UI edits keeps taps,
  // typing and scrolling smooth while the in-memory state still updates instantly.
  scheduleStatePersist();
  applyThemeIfChanged();
  window.KoiCloud?.sharedState?.scheduleFromLocal?.();
}

window.KoiLocalState = {
  get: () => state,
  persistRemote: () => {
    scheduleStatePersist(60);
    applyThemeIfChanged();
  },
  flushPersist: () => persistStateNow(),
  render: () => render(),
  applyTheme: () => applyThemeIfChanged(true)
};

window.addEventListener("pagehide", persistStateNow);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") persistStateNow();
});

function applyTheme() {
  const theme = state.settings.themePair === "custom"
    ? customThemeFromSettings(state.settings)
    : (THEME_PAIRS[state.settings.themePair] || THEME_PAIRS.wedding);
  const root = document.documentElement;
  root.style.setProperty("--pink", theme.pink);
  root.style.setProperty("--pink-deep", theme.pinkDeep);
  root.style.setProperty("--pink-soft", theme.pinkSoft);
  root.style.setProperty("--lavender", theme.lavender);
  root.style.setProperty("--lavender-deep", theme.lavenderDeep);
  root.style.setProperty("--lavender-soft", theme.lavenderSoft);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.pink);

  const customPhoto = String(state.settings.customWallpaperPhoto || "");
  const useCustomPhoto = Boolean(customPhoto && state.settings.customWallpaperEnabled);
  appShell.dataset.wallpaper = useCustomPhoto ? "custom" : (state.settings.wallpaper || "petals");
  appShell.dataset.wallpaperOverlay = state.settings.customWallpaperOverlay || "medium";
  appShell.dataset.wallpaperPosition = state.settings.customWallpaperPosition || "center";
  root.style.setProperty("--custom-wallpaper-image", customPhoto ? `url(${customPhoto})` : "none");
}

function currentProfile() { return state.profiles.find(profile => profile.id === state.currentUserId) || state.profiles[0]; }
function partnerProfile() { return state.profiles.find(profile => profile.id !== state.currentUserId) || state.profiles[1]; }
function profileById(id) { return state.profiles.find(profile => profile.id === id) || { id, displayName: "Partner", avatar: "💗" }; }

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("is-visible");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toastEl.classList.remove("is-visible"), 2200);
}

function openModal({ eyebrow = "KOI", title = "", html = "" }) {
  modalEyebrow.textContent = eyebrow;
  modalTitle.textContent = title;
  modalBody.innerHTML = html;
  modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => modalBody.querySelector("input, textarea, select, button")?.focus(), 60);
}

function closeModal() {
  modalBackdrop.hidden = true;
  modalBody.innerHTML = "";
  document.body.style.overflow = "";
}

function setFab({ icon = "+", label = "Add", action = "" } = {}) {
  document.querySelector(".fab")?.remove();
  if (!action) return;
  const button = document.createElement("button");
  button.className = "fab";
  button.type = "button";
  button.dataset.action = action;
  button.setAttribute("aria-label", label);
  button.textContent = icon;
  document.body.appendChild(button);
}

function updateNav() {
  document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("is-active", button.dataset.route === runtime.route));
}

function navigate(route) {
  runtime.route = route;
  runtime.extrasView = "";
  location.hash = route;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function dailyQuestion() {
  const key = todayKey();
  const override = state.dailyQuestionOverrides[key];
  if (override) return QUESTION_BANK.find(question => question.id === override) || QUESTION_BANK[0];
  return QUESTION_BANK[hashString(key) % QUESTION_BANK.length];
}

function todayAnswerRecord() {
  const key = todayKey();
  const question = dailyQuestion();
  if (!state.answers[key] || state.answers[key].questionId !== question.id) {
    state.answers[key] = { questionId: question.id, u1: null, u2: null };
  }
  return state.answers[key];
}

function bothAnswered(record = todayAnswerRecord()) { return Boolean(record.u1?.text && record.u2?.text); }
function answeredBy(id, record = todayAnswerRecord()) { return Boolean(record[id]?.text); }

function partnerStatusRow(profile, answered, isCurrent = false) {
  return `
    <div class="partner-row">
      <div class="avatar">${escapeHTML(profile.avatar)}</div>
      <div>
        <strong>${escapeHTML(profile.displayName)}${isCurrent ? " · you" : ""}</strong>
        <small>${answered ? "Answered privately" : "Hasn’t answered yet"}</small>
      </div>
      <span class="partner-state">${answered ? "✓" : "○"}</span>
    </div>`;
}

function renderHome() {
  const me = currentProfile();
  const partner = partnerProfile();
  const question = dailyQuestion();
  const record = todayAnswerRecord();
  const mine = record[me.id];
  const partnerAnswer = record[partner.id];
  const reveal = bothAnswered(record);
  const days = daysBetween(state.pair.anniversary);
  const lastCheckin = [...state.checkins].reverse().find(item => item.userId === partner.id);

  setFab();
  mainView.innerHTML = `
    <section class="page">
      <div class="page-header">
        <div>
          <p class="eyebrow">TODAY · ${escapeHTML(formatShortDate(todayKey()))}</p>
          <h1>Good ${greeting()}, ${escapeHTML(me.displayName)} 💗</h1>
          <p>One tiny ritual for your little us.</p>
        </div>
        <span class="pill pill-lavender">♡ ${days} days</span>
      </div>

      <article class="card card-duo hero-question">
        <div class="question-meta">
          <span class="pill pill-pink">Daily Question</span>
          <span class="pill pill-lavender">${escapeHTML(question.category)}</span>
        </div>
        <h2 class="question-text">${escapeHTML(question.text)}</h2>
        <div class="partner-status">
          ${partnerStatusRow(me, Boolean(mine), true)}
          ${partnerStatusRow(partner, Boolean(partnerAnswer), false)}
        </div>
        ${reveal ? `
          <div class="answer-grid">
            ${answerCard(me, record[me.id], "is-you")}
            ${answerCard(partner, record[partner.id], "is-partner")}
          </div>
          <div class="reaction-row" aria-label="React to partner answer">
            ${["💗", "🥹", "😂", "🫶", "👀"].map(emoji => `<button class="reaction-button ${state.reactions[`${todayKey()}_${me.id}`] === emoji ? "is-active" : ""}" data-action="react-answer" data-value="${emoji}">${emoji}</button>`).join("")}
          </div>
        ` : `
          <button class="button button-primary button-block" data-action="answer-question">${mine ? "Edit my private answer" : "Answer privately"} 💌</button>
          <button class="button button-ghost button-block" style="margin-top:8px" data-action="skip-question">Skip this question</button>
          <p class="small muted" style="text-align:center;margin:10px 0 0">Both answers unlock together.</p>
        `}
      </article>

      ${lastCheckin ? `
        <article class="card card-lavender">
          <div class="section-heading" style="margin:0 0 8px"><h2>${escapeHTML(partner.displayName)}’s latest check-in</h2><button data-action="open-checkin">Check in</button></div>
          <div class="two-grid">
            <div class="stat-card"><strong>${escapeHTML(lastCheckin.mood)}</strong><span>Mood</span></div>
            <div class="stat-card"><strong>${lastCheckin.energy}/5</strong><span>Energy</span></div>
          </div>
          <p class="small" style="margin-bottom:0">Could use: <strong>${escapeHTML(lastCheckin.need)}</strong></p>
        </article>` : ""}

      <div class="section-heading"><h2>Our little dashboard</h2><button data-action="go-us">View us</button></div>
      <div class="stat-grid">
        <div class="stat-card"><strong>${days}</strong><span>Days together</span></div>
        <div class="stat-card"><strong>${state.memories.length}</strong><span>Memories</span></div>
        <div class="stat-card"><strong>${state.lore.length}</strong><span>Pieces of lore</span></div>
      </div>

      <div class="section-heading"><h2>Quick access</h2><span class="micro muted">our everyday</span></div>
      <div class="quick-grid">
        ${quickCard("🛋️", "Our Room", "Build your cozy corner", "open-room")}
        ${quickCard("💌", "Date Jar", `${state.dateIdeas.filter(item => !item.completed).length} ideas waiting`, "open-date-jar")}
        ${quickCard("☺️", "Check-in", "Mood, energy & what you need", "open-checkin")}
        ${quickCard("🏛️", "Our Museum", "Visit your favorite chapters", "open-museum")}
      </div>

      <article class="card card-pink" style="margin-top:12px">
        <p class="eyebrow">LITTLE NOTE</p>
        <h3>Little by little, you’re building something worth remembering.</h3>
        <p class="small muted">Koi keeps the ordinary days, the weird jokes, and the big chapters in the same little place.</p>
      </article>
    </section>`;
}

function answerCard(profile, answer, extraClass) {
  if (!answer?.text) return `<div class="answer-card is-locked"><div><div class="lock-icon">♡</div><strong>${escapeHTML(profile.displayName)}</strong><p>Waiting for an answer.</p></div></div>`;
  return `<div class="answer-card ${extraClass}"><div class="partner-row" style="padding:0;border:0;background:none"><div class="avatar">${escapeHTML(profile.avatar)}</div><strong>${escapeHTML(profile.displayName)}</strong></div><p>${escapeHTML(answer.text)}</p><span class="micro muted">${new Date(answer.submittedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span></div>`;
}

function quickCard(icon, title, subtitle, action) {
  return `<button class="quick-card" data-action="${action}"><span class="quick-icon">${icon}</span><strong>${escapeHTML(title)}</strong><small>${escapeHTML(subtitle)}</small></button>`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function renderUs() {
  const datingAnniversary = state.pair.datingAnniversary || state.pair.anniversary;
  const weddingAnniversary = state.pair.weddingAnniversary || "";
  const marriedMode = state.pair.relationshipMode === "married";
  const days = daysBetween(datingAnniversary);
  const me = currentProfile();
  const partner = partnerProfile();
  const completedDates = state.dateIdeas.filter(item => item.completed).length;
  const checkinCount = state.checkins.length;
  const activityScore = Math.min(100, 30 + state.memories.length * 5 + state.lore.length * 4 + checkinCount * 2);

  setFab();
  mainView.innerHTML = `
    <section class="page">
      <div class="page-header">
        <div><p class="eyebrow">OUR LITTLE US</p><h1>Us ♡</h1><p>Everything about your shared world.</p></div>
        <button class="icon-button" data-action="edit-us">⚙︎</button>
      </div>

      <article class="card card-duo">
        <div class="profile-switch" aria-label="Local test profile">
          ${state.profiles.map(profile => `<button class="${state.currentUserId === profile.id ? "is-active" : ""}" data-action="switch-profile" data-id="${profile.id}">${escapeHTML(profile.avatar)} ${escapeHTML(profile.displayName)}</button>`).join("")}
        </div>
        <p class="micro muted" style="margin:8px 2px 0">Build 1 testing: switch profiles to test private two-person flows on one device.</p>
      </article>

      <article class="card">
        <p class="eyebrow">OUR JOURNEY</p>
        <div class="stat-grid">
          <div class="stat-card"><strong>${days}</strong><span>Days together</span></div>
          <div class="stat-card"><strong>${completedDates}</strong><span>Dates completed</span></div>
          <div class="stat-card"><strong>${state.memories.length}</strong><span>Memories</span></div>
        </div>
      </article>

      <article class="card card-duo relationship-dates-card">
        <div class="section-heading" style="margin:0"><div><p class="eyebrow">OUR ANNIVERSARIES</p><h2>${marriedMode ? "Married mode 💍" : "Dating mode 💗"}</h2></div><button data-action="edit-us">Edit</button></div>
        <div class="relationship-date-list">
          <div><span>Dating / together since</span><strong>${escapeHTML(formatDate(datingAnniversary))}</strong></div>
          ${marriedMode ? `<div><span>Wedding anniversary</span><strong>${escapeHTML(formatDate(weddingAnniversary))}</strong></div>` : ""}
        </div>
      </article>

      <div class="desktop-grid">
        <article class="card card-lavender">
          <p class="eyebrow">OUR CURRENT ERA</p>
          <h2>${escapeHTML(state.pair.currentEra)}</h2>
          <p class="small muted">Started whenever it started feeling like this ✨</p>
          <div class="tags"><span class="tag">Dreamy</span><span class="tag">Everyday</span><span class="tag">Team Us</span></div>
        </article>
        <article class="card card-pink">
          <p class="eyebrow">CURRENT FAVORITES</p>
          <div class="two-grid">
            <div class="stat-card"><strong style="font-size:15px">${escapeHTML(state.pair.comfortFood)}</strong><span>Comfort food 🍜</span></div>
            <div class="stat-card"><strong style="font-size:15px">${escapeHTML(state.pair.song)}</strong><span>Our song ♫</span></div>
          </div>
        </article>
      </div>

      <article class="card">
        <div class="section-heading" style="margin:0 0 10px"><h2>Up next</h2><button data-action="edit-us">Edit</button></div>
        <div class="partner-row">
          <div class="avatar">📅</div>
          <div><strong>${escapeHTML(state.pair.nextDateLabel || "Plan a date")}</strong><small>${state.pair.nextDate ? formatDate(state.pair.nextDate) : "No date chosen yet"}</small></div>
          <span class="partner-state">›</span>
        </div>
      </article>

      <article class="card card-duo">
        <p class="eyebrow">COUPLE DNA · BUILD 1 PREVIEW</p>
        <h2>Patterns, not a relationship score.</h2>
        <p class="small muted">This grows from what you actually save in Koi.</p>
        ${dnaBar("Sentimental", Math.min(100, 45 + state.memories.length * 8))}
        ${dnaBar("Playful", Math.min(100, 40 + state.lore.length * 15))}
        ${dnaBar("Ritual people", Math.min(100, 30 + state.traditions.length * 18))}
        ${dnaBar("Koi activity", activityScore)}
      </article>

      <article class="card">
        <p class="eyebrow">OUR PAIR</p>
        <div class="two-grid">
          <div class="stat-card"><div class="avatar avatar-lg">${escapeHTML(me.avatar)}</div><strong style="font-size:14px;margin-top:6px">${escapeHTML(me.displayName)}</strong><span>Current tester</span></div>
          <div class="stat-card"><div class="avatar avatar-lg">${escapeHTML(partner.avatar)}</div><strong style="font-size:14px;margin-top:6px">${escapeHTML(partner.displayName)}</strong><span>Your person</span></div>
        </div>
        <button class="button button-secondary button-block" style="margin-top:10px" data-action="pair-menu">Open pair code</button>
      </article>
    </section>`;
}

function dnaBar(label, value) {
  return `<div style="margin:12px 0"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:5px"><strong>${escapeHTML(label)}</strong><span class="muted">${value}%</span></div><div class="progress-bar"><span style="width:${value}%"></span></div></div>`;
}

function renderMemories() {
  setFab({ icon: "+", label: "Add memory", action: "add-memory-menu" });
  const tabs = [
    ["museum", "Museum"],
    ["memories", "Memories"],
    ["two-sides", "Two Sides"],
    ["lore", "Lore"]
  ];
  mainView.innerHTML = `
    <section class="page">
      <div class="page-header">
        <div><p class="eyebrow">OUR ARCHIVE</p><h1>Memories</h1><p>Little days become chapters here.</p></div>
        <span class="pill pill-pink">${state.memories.length + state.lore.length} saved</span>
      </div>
      <div class="tabs">${tabs.map(([id, label]) => `<button class="tab-button ${runtime.memoryTab === id ? "is-active" : ""}" data-action="memory-tab" data-tab="${id}">${label}</button>`).join("")}</div>
      <div id="memoryTabContent">${renderMemoryTabContent()}</div>
    </section>`;
}

function renderMemoryTabContent() {
  if (runtime.memoryTab === "memories") return renderMemoryList();
  if (runtime.memoryTab === "two-sides") return renderTwoSidesList();
  if (runtime.memoryTab === "lore") return renderLoreList();
  return renderMuseum();
}

function renderMuseum() {
  const exhibits = [
    ...state.memories.map(item => ({ kind: "memory", id: item.id, title: item.title, subtitle: item.chapter || formatDate(item.date), photo: item.photo, icon: item.icon || "💗" })),
    ...state.lore.map(item => ({ kind: "lore", id: item.id, title: item.title, subtitle: "Relationship Lore", photo: "", icon: item.icon || "📖" }))
  ];
  if (!exhibits.length) return emptyState("Your museum is waiting", "Save a memory or a piece of lore to create your first exhibit.");
  return `<article class="card card-lavender"><p class="eyebrow">OUR MUSEUM</p><h2>A gallery of our favorite chapters.</h2><p class="small muted">Your saved memories automatically become exhibits in Build 1.</p></article><div class="museum-grid">${exhibits.map(item => `<button class="exhibit" data-action="open-exhibit" data-kind="${item.kind}" data-id="${item.id}"><div class="frame">${item.photo ? `<img src="${item.photo}" alt="">` : escapeHTML(item.icon)}</div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.subtitle)}</p></button>`).join("")}</div>`;
}

function renderMemoryList() {
  const items = state.memories.filter(item => item.type === "memory").sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  if (!items.length) return emptyState("No memories yet", "Add the ordinary days too. They age surprisingly well.");
  return `<div class="memory-list">${items.map(item => memoryRow(item, "open-memory")).join("")}</div>`;
}

function memoryRow(item, action) {
  const cover = primaryMemoryPhoto(item);
  return `<button class="memory-item" data-action="${action}" data-id="${item.id}" style="width:100%;text-align:left;color:inherit"><div class="memory-thumb">${cover ? `<img src="${cover}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:15px">` : escapeHTML(item.icon || "💗")}</div><div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(formatDate(item.date))}${item.location ? ` · ${escapeHTML(item.location)}` : ""}</p><div class="tags" style="margin-top:6px">${(item.tags || []).slice(0, 2).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}</div></div><span>›</span></button>`;
}

function renderTwoSidesList() {
  const items = state.memories.filter(item => item.type === "two-sides").sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  if (!items.length) return emptyState("No two-sided moments yet", "Start one memory and let each person write what they remember privately.");
  return `<article class="card card-duo"><p class="eyebrow">SAME MOMENT, TWO SIDES</p><h2>One memory. Two private perspectives.</h2><p class="small muted">Sides only reveal when both people have written theirs.</p></article><div class="memory-list">${items.map(item => memoryRow(item, "open-two-sides")).join("")}</div>`;
}

function renderLoreList() {
  if (!state.lore.length) return emptyState("Your lore book is empty", "Inside jokes deserve archival treatment too.");
  return `<div class="memory-list">${state.lore.map(item => `<button class="memory-item" data-action="open-lore" data-id="${item.id}" style="width:100%;text-align:left;color:inherit"><div class="memory-thumb">${escapeHTML(item.icon || "📖")}</div><div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.meaning)}</p><div class="tags" style="margin-top:6px">${(item.tags || []).slice(0,2).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}</div></div><span>›</span></button>`).join("")}</div>`;
}

function emptyState(title, copy) {
  return `<div class="empty-state"><div class="empty-icon">♡</div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(copy)}</p></div>`;
}

function renderExtras() {
  if (runtime.extrasView === "room") return renderRoom();
  if (runtime.extrasView === "dateJar") return renderDateJar();
  if (runtime.extrasView === "checkin") return renderCheckin();
  if (runtime.extrasView === "canon") return renderCanon();
  if (runtime.extrasView === "traditions") return renderTraditions();
  if (runtime.extrasView === "thenNow") return renderThenNow();

  setFab();
  mainView.innerHTML = `
    <section class="page">
      <div class="page-header"><div><p class="eyebrow">A LITTLE MAGIC</p><h1>Extras ✦</h1><p>Useful, weird, sentimental — ideally all three.</p></div></div>
      <div class="quick-grid">
        ${quickCard("💌", "Date Jar", `${state.dateIdeas.length} date ideas`, "open-date-jar")}
        ${quickCard("🛋️", "Our Room", `Cozy level ${roomLevel()}`, "open-room")}
        ${quickCard("☺️", "Check-ins", `${state.checkins.length} saved`, "open-checkin")}
        ${quickCard("📖", "Our Canon", `${state.canon.length} official things`, "open-canon")}
        ${quickCard("🎀", "Traditions", `${state.traditions.length} little rituals`, "open-traditions")}
        ${quickCard("📷", "Then vs Now", "See how answers change", "open-then-now")}
      </div>

      <article class="card card-duo" style="margin-top:12px">
        <p class="eyebrow">BUILD 1 LAB</p>
        <h2>More unusual Koi ideas are already seeded into the structure.</h2>
        <div class="tags" style="margin-top:10px"><span class="tag">Accidental Traditions</span><span class="tag">Memory Games</span><span class="tag">I Bet You</span><span class="tag">Easter Eggs</span><span class="tag">Relationship Eras</span></div>
        <p class="small muted">These are intentionally not fully automated yet; they’ll make more sense once real two-person sync exists.</p>
      </article>
    </section>`;
}

function subviewHeader(eyebrow, title, copy, extra = "") {
  return `<div class="page-header"><div><p class="eyebrow">${escapeHTML(eyebrow)}</p><h1>${escapeHTML(title)}</h1><p>${escapeHTML(copy)}</p></div>${extra}</div><button class="button button-ghost" data-action="extras-back" style="min-height:36px;padding:7px 12px;margin-bottom:12px">← Extras</button>`;
}

function renderRoom() {
  setFab();
  const active = new Set(state.room.activeDecor || []);
  const decor = [
    ["lights", "✨", "Lights"], ["frame", "🖼️", "Frame"], ["plant", "🌿", "Plant"],
    ["plush", "🧸", "Plush"], ["camera", "📷", "Camera"], ["heart", "💗", "Heart"], ["books", "📚", "Books"]
  ];
  const unlocked = new Set(roomUnlockedDecor());
  mainView.innerHTML = `<section class="page">${subviewHeader("OUR COZY CORNER", "Our Room", "A shared space that grows with your story.", `<span class="pill pill-lavender">Lv. ${roomLevel()}</span>`)}
    <div class="room-level"><strong>Cozy Level</strong><span class="heart-meter">${"♥".repeat(Math.min(5, roomLevel()))}${"♡".repeat(Math.max(0, 5 - roomLevel()))}</span></div>
    <div class="room-scene">
      ${active.has("lights") ? `<div class="room-wall-lights">✦ · ✧ · ✦ · ✧ · ✦</div>` : ""}
      ${active.has("frame") ? `<div class="room-frame">You & Me<br>forever</div>` : ""}
      <div class="room-shelf"></div>
      <div class="room-items">
        <span>${active.has("books") ? "📚" : ""}</span>
        <span>${active.has("camera") ? "📷" : ""}</span>
        <span>${active.has("plant") ? "🪴" : ""}</span>
      </div>
      <div class="room-floor-items"><span>${active.has("heart") ? "💗" : ""}</span><span>${active.has("plush") ? "🧸" : ""}</span><span class="room-pet">${escapeHTML(state.room.pet || "🐰")}</span></div>
    </div>
    <div class="section-heading"><h2>Decor</h2><span class="micro muted">Tap to show/hide</span></div>
    <div class="decor-grid">${decor.map(([id, icon, label]) => `<button class="decor-button ${active.has(id) ? "is-active" : ""}" data-action="toggle-decor" data-id="${id}" ${unlocked.has(id) ? "" : "disabled"}>${icon}<br>${escapeHTML(label)}${unlocked.has(id) ? "" : " 🔒"}</button>`).join("")}</div>
    <article class="card card-lavender" style="margin-top:12px"><p class="eyebrow">HOW UNLOCKS WORK</p><p class="small">Memories, lore, check-ins and traditions raise your Cozy Level. Build 1 unlocks decor locally; later this can become a shared synced room.</p></article>
  </section>`;
}

function roomLevel() {
  return Math.max(1, Math.min(12, 1 + Math.floor((state.memories.length + state.lore.length + state.checkins.length + state.traditions.length) / 3)));
}

function roomUnlockedDecor() {
  const order = ["lights", "frame", "plant", "plush", "camera", "heart", "books"];
  return order.slice(0, Math.min(order.length, 2 + roomLevel()));
}

function renderDateJar() {
  setFab({ icon: "+", label: "Add date idea", action: "add-date-idea" });
  const categories = ["All", ...new Set(state.dateIdeas.map(item => item.category))];
  const filtered = runtime.selectedDateFilter === "All" ? state.dateIdeas : state.dateIdeas.filter(item => item.category === runtime.selectedDateFilter);
  mainView.innerHTML = `<section class="page">${subviewHeader("DATE JAR", "Pick our next little adventure", "Save ideas now. Let future-you avoid ‘I don’t know, you decide.’")}
    <article class="card card-duo" style="text-align:center">
      <div class="jar"><div class="jar-hearts">${state.dateIdeas.slice(0,12).map((_, index) => `<span>${index % 2 ? "💜" : "💗"}</span>`).join("")}</div></div>
      <h2>${state.dateIdeas.filter(item => !item.completed).length} ideas waiting</h2>
      <button class="button button-primary" data-action="pick-date">Pick a date ✦</button>
      <div id="datePickResult"></div>
    </article>
    <div class="tabs">${categories.map(category => `<button class="tab-button ${runtime.selectedDateFilter === category ? "is-active" : ""}" data-action="date-filter" data-value="${escapeHTML(category)}">${escapeHTML(category)}</button>`).join("")}</div>
    <div class="memory-list">${filtered.map(item => `<div class="memory-item"><div class="memory-thumb">${item.completed ? "✓" : "💌"}</div><div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.category)} · ${escapeHTML(item.budget)}</p></div><button class="icon-button" data-action="toggle-date-complete" data-id="${item.id}" aria-label="Toggle complete">${item.completed ? "↺" : "✓"}</button></div>`).join("") || emptyState("No ideas in this filter", "Add one with the + button.")}</div>
  </section>`;
}

function renderCheckin() {
  setFab();
  const me = currentProfile();
  const partner = partnerProfile();
  const mine = [...state.checkins].reverse().find(item => item.userId === me.id);
  const theirs = [...state.checkins].reverse().find(item => item.userId === partner.id);
  mainView.innerHTML = `<section class="page">${subviewHeader("CHECK-IN", "How are we today?", "Supportive, quick, and deliberately not clinical.")}
    <article class="card card-duo">
      <div class="section-heading" style="margin:0 0 8px"><h2>${escapeHTML(me.displayName)}’s check-in</h2><button data-action="new-checkin">${mine ? "Update" : "Check in"}</button></div>
      ${mine ? checkinSummary(mine) : `<p class="small muted">No check-in yet today.</p><button class="button button-primary button-block" data-action="new-checkin">Check in now</button>`}
    </article>
    <article class="card card-lavender">
      <div class="section-heading" style="margin:0 0 8px"><h2>${escapeHTML(partner.displayName)}’s latest</h2></div>
      ${theirs ? checkinSummary(theirs) : `<p class="small muted">Nothing shared yet. Switch local test profile to add the other person’s check-in.</p>`}
    </article>
    <div class="section-heading"><h2>Recent check-ins</h2><span class="micro muted">latest 8</span></div>
    <div class="timeline">${state.checkins.slice(-8).reverse().map(item => `<div class="timeline-item"><div class="timeline-dot">${escapeHTML(item.mood)}</div><div class="timeline-content"><h3>${escapeHTML(profileById(item.userId).displayName)} · ${new Date(item.createdAt).toLocaleDateString()}</h3><p>Energy ${item.energy}/5 · Social ${item.social}/5 · Needed ${escapeHTML(item.need)}</p></div></div>`).join("") || emptyState("No check-ins yet", "Your first one takes about ten seconds.")}</div>
  </section>`;
}

function checkinSummary(item) {
  return `<div class="three-grid"><div class="stat-card"><strong>${escapeHTML(item.mood)}</strong><span>Mood</span></div><div class="stat-card"><strong>${item.energy}/5</strong><span>Energy</span></div><div class="stat-card"><strong>${item.social}/5</strong><span>Social</span></div></div><p class="small" style="margin-bottom:0">Need: <strong>${escapeHTML(item.need)}</strong>${item.note ? ` · ${escapeHTML(item.note)}` : ""}</p>`;
}

function renderCanon() {
  setFab({ icon: "+", label: "Add canon", action: "add-canon" });
  mainView.innerHTML = `<section class="page">${subviewHeader("OUR CANON", "The official facts of us", "Comfort foods, sayings, obsessions, rules and silly truths.")}
    <div class="memory-list">${state.canon.map(item => `<div class="memory-item"><div class="memory-thumb">📖</div><div><h3>${escapeHTML(item.category)}</h3><p>${escapeHTML(item.text)}</p></div><button class="icon-button" data-action="delete-canon" data-id="${item.id}">×</button></div>`).join("") || emptyState("No canon yet", "Declare something official.")}</div>
    <article class="card card-lavender" style="margin-top:12px"><p class="eyebrow">LATER</p><h3>Challenge the canon</h3><p class="small muted">Once real pair sync is connected, either partner can challenge an entry and settle the new official answer together.</p></article>
  </section>`;
}

function renderTraditions() {
  setFab({ icon: "+", label: "Add tradition", action: "add-tradition" });
  mainView.innerHTML = `<section class="page">${subviewHeader("TRADITIONS", "The little things we keep doing", "Rituals become part of your relationship lore.")}
    <div class="memory-list">${state.traditions.map(item => `<div class="memory-item"><div class="memory-thumb">🎀</div><div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.cadence)} · ${item.count} times · since ${escapeHTML(formatShortDate(item.startDate))}</p></div><button class="icon-button" data-action="increment-tradition" data-id="${item.id}">+1</button></div>`).join("") || emptyState("No traditions yet", "Add something you hope becomes ‘our thing.’")}</div>
    <article class="card card-pink" style="margin-top:12px"><p class="eyebrow">ACCIDENTAL TRADITIONS · PREVIEW</p><p class="small">Later, Koi can notice repeated saved activities and gently ask: “This might be becoming a thing… make it a tradition?”</p></article>
  </section>`;
}

function renderThenNow() {
  setFab({ icon: "+", label: "Add comparison", action: "add-then-now" });
  mainView.innerHTML = `<section class="page">${subviewHeader("THEN VS NOW", "See how your answers grow", "Answer first. Only then look back.")}
    ${state.thenNow.map(item => `<article class="card card-duo"><p class="eyebrow">${escapeHTML(item.oldDate ? formatDate(item.oldDate) : "THEN")}</p><h2>${escapeHTML(item.prompt)}</h2>${item.newAnswer ? `<div class="answer-grid" style="margin-top:12px"><div class="answer-card is-you"><strong>Then</strong><p>${escapeHTML(item.oldAnswer)}</p></div><div class="answer-card is-partner"><strong>Now</strong><p>${escapeHTML(item.newAnswer)}</p></div></div>` : `<div class="answer-card is-locked" style="margin-top:12px"><div><div class="lock-icon">♡</div><p>Your old answer stays hidden until you answer again.</p><button class="button button-primary" data-action="answer-then-now" data-id="${item.id}">Answer again</button></div></div>`}</article>`).join("") || emptyState("Nothing to compare yet", "Save a prompt you want future-you to revisit.")}
  </section>`;
}

function renderYou() {
  const me = currentProfile();
  const partner = partnerProfile();
  const customOne = normalizeHexColor(state.settings.customColorOne, "#F3B8D0");
  const customTwo = normalizeHexColor(state.settings.customColorTwo, "#D7C4F2");
  const hasCustomWallpaper = Boolean(state.settings.customWallpaperPhoto);
  const customWallpaperOn = Boolean(hasCustomWallpaper && state.settings.customWallpaperEnabled);
  const overlay = state.settings.customWallpaperOverlay || "medium";
  const position = state.settings.customWallpaperPosition || "center";
  setFab();
  mainView.innerHTML = `
    <section class="page">
      <div class="page-header"><div><p class="eyebrow">PERSONALIZE</p><h1>You</h1><p>Make Koi truly yours — choose the colors and wallpaper that feel like you.</p></div><div class="avatar avatar-lg">${escapeHTML(me.avatar)}</div></div>

      <article class="card">
        <div class="partner-row" style="padding:0;border:0;background:none"><div class="avatar avatar-lg">${escapeHTML(me.avatar)}</div><div><strong style="font-size:16px">${escapeHTML(me.displayName)}</strong><small>Paired with ${escapeHTML(partner.displayName)} · anniversary ${escapeHTML(formatDate(state.pair.anniversary))}</small></div><button class="button button-ghost" data-action="edit-profile" style="min-height:36px;padding:7px 11px">Edit</button></div>
      </article>

      <div class="section-heading"><h2>Our colors</h2><span class="micro muted">pick any two</span></div>
      <div class="theme-pairs">
        ${Object.entries(THEME_PAIRS).map(([id, theme]) => `<button class="theme-pair ${state.settings.themePair === id ? "is-active" : ""}" data-action="set-theme" data-id="${id}"><div class="swatches"><span class="swatch" style="background:${theme.pink}"></span><span class="swatch" style="background:${theme.lavender}"></span></div><strong>${escapeHTML(theme.label)}</strong></button>`).join("")}
      </div>

      <article class="card custom-color-card ${state.settings.themePair === "custom" ? "is-active" : ""}" style="margin-top:10px">
        <div class="section-heading" style="margin:0 0 10px"><div><p class="eyebrow">CUSTOM COLORS</p><h3>Choose your exact pair</h3></div><div class="swatches"><span class="swatch" id="customColorPreviewOne" style="background:${customOne}"></span><span class="swatch" id="customColorPreviewTwo" style="background:${customTwo}"></span></div></div>
        <div class="custom-color-grid">
          <label class="custom-color-field"><span>Color 1</span><div><input id="customColorPickerOne" type="color" value="${customOne}" data-custom-color-picker="one"><input id="customColorHexOne" type="text" value="${customOne}" maxlength="7" inputmode="text" spellcheck="false" data-custom-color-hex="one" aria-label="Color 1 hex code"></div></label>
          <label class="custom-color-field"><span>Color 2</span><div><input id="customColorPickerTwo" type="color" value="${customTwo}" data-custom-color-picker="two"><input id="customColorHexTwo" type="text" value="${customTwo}" maxlength="7" inputmode="text" spellcheck="false" data-custom-color-hex="two" aria-label="Color 2 hex code"></div></label>
        </div>
        <button class="button button-primary button-block" data-action="apply-custom-theme" style="margin-top:12px">Use these colors</button>
      </article>

      <div class="section-heading"><h2>Wallpaper</h2><span class="micro muted">patterns + photo</span></div>
      <div class="wallpaper-grid wallpaper-grid-expanded">
        ${WALLPAPER_OPTIONS.map(item => `<button class="wallpaper-option ${!customWallpaperOn && state.settings.wallpaper === item.id ? "is-active" : ""}" data-action="set-wallpaper" data-id="${item.id}" aria-label="${escapeHTML(item.label)} wallpaper"><span class="wallpaper-tile wallpaper-${item.id}"></span><strong>${escapeHTML(item.label)}</strong></button>`).join("")}
      </div>

      <article class="card custom-wallpaper-card ${customWallpaperOn ? "is-active" : ""}" style="margin-top:12px">
        <div class="section-heading" style="margin:0 0 10px"><div><p class="eyebrow">CUSTOM WALLPAPER</p><h2>Your photo</h2></div><span class="pill ${customWallpaperOn ? "pill-pink" : "pill-lavender"}">${customWallpaperOn ? "On" : "Off"}</span></div>
        <div class="custom-wallpaper-preview ${hasCustomWallpaper ? "has-photo" : ""}">
          ${hasCustomWallpaper ? `<img src="${escapeHTML(state.settings.customWallpaperPhoto)}" alt="Custom wallpaper preview">` : `<div><span>♡</span><p>Choose a photo from this device.</p><small>Koi compresses it before saving.</small></div>`}
        </div>
        <label class="button button-secondary custom-wallpaper-file-button">${hasCustomWallpaper ? "Choose another photo" : "Choose Photo"}<input id="customWallpaperFile" type="file" accept="image/*" hidden></label>
        ${hasCustomWallpaper ? `
          <div class="setting-row compact-setting-row" style="margin-top:12px"><span class="setting-icon">♡</span><div><strong>Photo wallpaper</strong><small>Turn the saved photo background on or off.</small></div><label class="switch"><input type="checkbox" data-action="toggle-setting" data-key="customWallpaperEnabled" ${customWallpaperOn ? "checked" : ""}><span class="switch-slider"></span></label></div>
          <div class="wallpaper-control-group"><strong>Overlay strength</strong><div class="segmented-control">${["light","medium","strong"].map(value => `<button data-action="set-wallpaper-overlay" data-value="${value}" class="${overlay === value ? "is-active" : ""}">${value[0].toUpperCase() + value.slice(1)}</button>`).join("")}</div></div>
          <div class="wallpaper-control-group"><strong>Photo position</strong><div class="segmented-control">${["top","center","bottom"].map(value => `<button data-action="set-wallpaper-position" data-value="${value}" class="${position === value ? "is-active" : ""}">${value[0].toUpperCase() + value.slice(1)}</button>`).join("")}</div></div>
          <button class="button button-ghost button-block" data-action="remove-custom-wallpaper" style="margin-top:12px">Remove custom photo</button>
        ` : ""}
        <p class="micro muted" style="margin:10px 2px 0">When Koi Cloud is connected, your custom wallpaper is stored privately and syncs to your partner's phone. Offline/local mode still keeps it on this device.</p>
      </article>

      <div class="section-heading"><h2>Reminders</h2></div>
      <div class="setting-list">
        ${settingSwitch("Daily question", "A gentle reminder for your daily Koi question", "dailyReminder", state.settings.dailyReminder)}
        ${settingSwitch("Weekly check-in", "A little Sunday relationship pulse", "weeklyCheckin", state.settings.weeklyCheckin)}
        <button class="setting-row" data-action="request-notifications" style="width:100%;text-align:left;color:inherit"><span class="setting-icon">♢</span><div><strong>Browser notifications</strong><small>Ask this device for notification permission.</small></div><span>›</span></button>
      </div>

      <div class="section-heading"><h2>App & data</h2></div>
      <div class="setting-list">
        <button class="setting-row" data-action="install-app" style="width:100%;text-align:left;color:inherit"><span class="setting-icon">＋</span><div><strong>Install Koi</strong><small>Add this PWA to your home screen when supported.</small></div><span>›</span></button>
        <button class="setting-row" data-action="export-data" style="width:100%;text-align:left;color:inherit"><span class="setting-icon">⇩</span><div><strong>Export my Koi data</strong><small>Download a JSON backup of your local Koi settings and data.</small></div><span>›</span></button>
        <button class="setting-row" data-action="import-data" style="width:100%;text-align:left;color:inherit"><span class="setting-icon">⇧</span><div><strong>Import Koi backup</strong><small>Restore a compatible JSON file.</small></div><span>›</span></button>
        <button class="setting-row" data-action="reset-data" style="width:100%;text-align:left;color:inherit"><span class="setting-icon">×</span><div><strong>Reset local Koi</strong><small>Deletes Koi data saved on this device.</small></div><span>›</span></button>
      </div>
    </section>`;
}

function settingSwitch(title, subtitle, key, checked) {
  return `<div class="setting-row"><span class="setting-icon">♡</span><div><strong>${escapeHTML(title)}</strong><small>${escapeHTML(subtitle)}</small></div><label class="switch"><input type="checkbox" data-action="toggle-setting" data-key="${key}" ${checked ? "checked" : ""}><span class="switch-slider"></span></label></div>`;
}

function render() {
  applyTheme();
  updateNav();
  if (runtime.route === "us") renderUs();
  else if (runtime.route === "memories") renderMemories();
  else if (runtime.route === "extras") renderExtras();
  else if (runtime.route === "you") renderYou();
  else renderHome();
}

// ------------------------------
// Modal flows
// ------------------------------

function openAnswerQuestion() {
  const me = currentProfile();
  const question = dailyQuestion();
  const record = todayAnswerRecord();
  openModal({ eyebrow: "PRIVATE ANSWER", title: question.category, html: `
    <form id="answerQuestionForm" class="form-grid">
      <article class="card card-duo"><h3>${escapeHTML(question.text)}</h3><p class="small muted">${escapeHTML(me.displayName)}’s answer stays hidden until both people submit.</p></article>
      <div class="field"><label>Your answer</label><textarea name="answer" maxlength="800" required>${escapeHTML(record[me.id]?.text || "")}</textarea></div>
      <button class="button button-primary button-block" type="submit">Save privately 💌</button>
    </form>` });
  document.getElementById("answerQuestionForm").addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    record[me.id] = { text: String(data.get("answer") || "").trim(), submittedAt: Date.now() };
    saveState();
    closeModal();
    render();
    toast(bothAnswered(record) ? "Both answers unlocked 💗" : "Saved privately");
  });
}

function skipQuestion() {
  const key = todayKey();
  const current = dailyQuestion();
  const index = QUESTION_BANK.findIndex(item => item.id === current.id);
  const next = QUESTION_BANK[(index + 1) % QUESTION_BANK.length];
  state.dailyQuestionOverrides[key] = next.id;
  delete state.answers[key];
  saveState();
  render();
  toast("New question for today ✦");
}

function openPairMenu() {
  openModal({ eyebrow: "PAIR", title: "Just the two of us", html: `
    <article class="card card-duo">
      <div class="two-grid">
        ${state.profiles.map(profile => `<div class="stat-card"><div class="avatar avatar-lg">${escapeHTML(profile.avatar)}</div><strong style="font-size:14px;margin-top:5px">${escapeHTML(profile.displayName)}</strong><span>${profile.id === state.currentUserId ? "Current tester" : "Partner"}</span></div>`).join("")}
      </div>
    </article>
    <p class="eyebrow">LOCAL INVITE CODE</p>
    <div class="code-box">${escapeHTML(state.pair.inviteCode)}</div>
    <p class="small muted">Build 1 uses a local simulation. When Supabase is connected, this becomes a real one-time invite/link and the pair will be restricted to exactly two members.</p>
    <div class="profile-switch" style="margin-top:12px">${state.profiles.map(profile => `<button class="${state.currentUserId === profile.id ? "is-active" : ""}" data-action="switch-profile" data-id="${profile.id}">${escapeHTML(profile.avatar)} Test as ${escapeHTML(profile.displayName)}</button>`).join("")}</div>` });
}

function openNotifications() {
  const recent = [
    state.memories[0] ? `A memory is waiting in Our Museum: ${state.memories[0].title}` : null,
    state.traditions[0] ? `Tradition check: ${state.traditions[0].title}` : null,
    state.dateIdeas.find(item => !item.completed) ? "Your Date Jar has ideas waiting 💌" : null
  ].filter(Boolean);
  openModal({ eyebrow: "LITTLE NUDGES", title: "Notifications", html: recent.length ? `<div class="timeline">${recent.map(text => `<div class="timeline-item"><div class="timeline-dot">♡</div><div class="timeline-content"><p>${escapeHTML(text)}</p></div></div>`).join("")}</div>` : emptyState("All quiet", "Nothing needs your attention right now.") });
}

function openEditUs() {
  const relationshipMode = state.pair.relationshipMode || (state.pair.weddingAnniversary ? "married" : "dating");
  const datingAnniversary = state.pair.datingAnniversary || state.pair.anniversary || "";
  const weddingAnniversary = state.pair.weddingAnniversary || "";
  openModal({ eyebrow: "OUR DETAILS", title: "Edit our little us", html: `
    <form id="editUsForm" class="form-grid">
      <div class="field"><label>Relationship mode</label><select name="relationshipMode" id="editRelationshipMode"><option value="dating" ${relationshipMode === "dating" ? "selected" : ""}>Dating</option><option value="married" ${relationshipMode === "married" ? "selected" : ""}>Married 💍</option></select></div>
      <div class="field"><label>Dating anniversary / together since</label>${compactDatePickerHTML("editDating", datingAnniversary, { required: true })}</div>
      <div class="field" id="editWeddingWrap" ${relationshipMode === "married" ? "" : "hidden"}><label>Wedding anniversary</label>${compactDatePickerHTML("editWedding", weddingAnniversary, { required: false })}</div>
      <div class="field"><label>Current era</label><input name="currentEra" value="${escapeHTML(state.pair.currentEra)}" maxlength="80"></div>
      <div class="two-grid"><div class="field"><label>Comfort food</label><input name="comfortFood" value="${escapeHTML(state.pair.comfortFood)}"></div><div class="field"><label>Our song</label><input name="song" value="${escapeHTML(state.pair.song)}"></div></div>
      <div class="field"><label>Next date</label><input name="nextDate" type="date" value="${escapeHTML(state.pair.nextDate)}"></div>
      <div class="field"><label>Next date label</label><input name="nextDateLabel" value="${escapeHTML(state.pair.nextDateLabel)}"></div>
      <button class="button button-primary" type="submit">Save</button>
    </form>` });

  const modeSelect = document.getElementById("editRelationshipMode");
  const weddingWrap = document.getElementById("editWeddingWrap");
  modeSelect?.addEventListener("change", () => { weddingWrap.hidden = modeSelect.value !== "married"; });

  document.getElementById("editUsForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const mode = String(form.get("relationshipMode") || "dating");
      const dating = readCompactDate(form, "editDating", { required: true });
      const wedding = mode === "married" ? readCompactDate(form, "editWedding", { required: true }) : "";
      state.pair.relationshipMode = mode;
      state.pair.datingAnniversary = dating;
      state.pair.weddingAnniversary = wedding;
      state.pair.anniversary = dating;
      ["currentEra", "comfortFood", "song", "nextDate", "nextDateLabel"].forEach(key => state.pair[key] = String(form.get(key) || "").trim());

      if (window.KoiCloud?.runtime?.ready && window.KoiCloud?.pairs?.updateRelationship) {
        const payload = await window.KoiCloud.pairs.updateRelationship({
          relationshipMode: mode,
          datingAnniversary: dating,
          weddingAnniversary: wedding || null
        });
        if (payload?.pair) {
          state.pair.relationshipMode = payload.pair.relationship_mode || mode;
          state.pair.datingAnniversary = payload.pair.dating_anniversary || dating;
          state.pair.weddingAnniversary = payload.pair.wedding_anniversary || "";
          state.pair.anniversary = state.pair.datingAnniversary;
        }
      }

      saveState(); closeModal(); render(); toast("Our details updated 💗");
    } catch (error) {
      toast(error.message || "Could not save our details");
    }
  });
}

function openMemoryAddMenu() {
  openModal({ eyebrow: "ADD TO OUR STORY", title: "What are we saving?", html: `
    <div class="quick-grid">
      ${quickCard("📷", "Memory", "A shared moment or day", "add-memory")}
      ${quickCard("♡♡", "Two Sides", "One moment, two perspectives", "add-two-sides")}
      ${quickCard("📖", "Relationship Lore", "An inside joke or story", "add-lore")}
    </div>` });
}

function memoryFormHTML(item = {}, { twoSides = false } = {}) {
  return `<form id="memoryForm" class="form-grid">
    <div class="field"><label>Title</label><input name="title" required maxlength="100" value="${escapeHTML(item.title || "")}" placeholder="Coffee date"></div>
    <div class="two-grid"><div class="field"><label>Date</label><input name="date" type="date" value="${escapeHTML(item.date || todayKey())}"></div><div class="field"><label>Location</label><input name="location" maxlength="120" value="${escapeHTML(item.location || "")}" placeholder="Optional"></div></div>
    <div class="field"><label>${twoSides ? "Shared context" : "Note"}</label><textarea name="note" maxlength="900" placeholder="What happened?">${escapeHTML(item.note || "")}</textarea></div>
    <div class="two-grid"><div class="field"><label>Chapter</label><input name="chapter" maxlength="60" value="${escapeHTML(item.chapter || "Little Days")}"></div><div class="field"><label>Tags (comma separated)</label><input name="tags" value="${escapeHTML((item.tags || []).join(", "))}"></div></div>
    <div class="field"><label>Photo (optional, compressed locally)</label><input name="photo" type="file" accept="image/*"></div>
    ${twoSides ? `<div class="field"><label>Your private side</label><textarea name="side" required maxlength="900" placeholder="What do you remember?">${escapeHTML(item.sides?.[state.currentUserId]?.text || "")}</textarea></div>` : ""}
    <button class="button button-primary" type="submit">Save ${twoSides ? "my side" : "memory"}</button>
  </form>`;
}

function openAddMemory() {
  openModal({ eyebrow: "MEMORY", title: "Save this little day", html: memoryFormHTML() });
  bindMemoryForm({ type: "memory" });
}

function openAddTwoSides() {
  openModal({ eyebrow: "SAME MOMENT, TWO SIDES", title: "Start a shared moment", html: memoryFormHTML({}, { twoSides: true }) });
  bindMemoryForm({ type: "two-sides" });
}

function bindMemoryForm({ type, existingId = "" }) {
  document.getElementById("memoryForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = form.elements.photo?.files?.[0];
    let photo = existingId ? state.memories.find(item => item.id === existingId)?.photo || "" : "";
    if (file) {
      try { photo = await compressImage(file); }
      catch { toast("Photo could not be processed"); }
    }
    const tags = String(data.get("tags") || "").split(",").map(value => value.trim()).filter(Boolean).slice(0, 8);
    if (existingId) {
      const item = state.memories.find(entry => entry.id === existingId);
      if (!item) return;
      item.title = String(data.get("title") || "").trim();
      item.date = String(data.get("date") || "");
      item.location = String(data.get("location") || "").trim();
      item.note = String(data.get("note") || "").trim();
      item.chapter = String(data.get("chapter") || "Little Days").trim();
      item.tags = tags;
      item.photo = photo;
      if (type === "two-sides") {
        item.sides ||= {};
        item.sides[state.currentUserId] = { text: String(data.get("side") || "").trim(), submittedAt: Date.now() };
      }
    } else {
      const item = {
        id: uid("m"), type, title: String(data.get("title") || "").trim(), date: String(data.get("date") || ""), location: String(data.get("location") || "").trim(), note: String(data.get("note") || "").trim(), chapter: String(data.get("chapter") || "Little Days").trim(), tags, photo, icon: type === "two-sides" ? "♡♡" : "💗", createdAt: Date.now()
      };
      if (type === "two-sides") item.sides = { [state.currentUserId]: { text: String(data.get("side") || "").trim(), submittedAt: Date.now() } };
      state.memories.unshift(item);
    }
    saveState(); closeModal(); runtime.memoryTab = type === "two-sides" ? "two-sides" : "memories"; navigate("memories"); toast(type === "two-sides" ? "Your side was saved privately" : "Memory added to Our Museum");
  });
}

function openMemoryDetail(id) {
  const item = state.memories.find(entry => entry.id === id);
  if (!item) return;
  openModal({ eyebrow: "MEMORY", title: item.title, html: `
    ${memoryPhotoGallery(item, { maxHeight: 280 })}
    <p class="small muted">${escapeHTML(formatDate(item.date))}${item.location ? ` · ${escapeHTML(item.location)}` : ""}</p>
    <p style="line-height:1.6">${escapeHTML(item.note || "No note yet.")}</p>
    <div class="tags">${(item.tags || []).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}</div>
    <div class="button-row" style="margin-top:16px"><button class="button button-secondary" data-action="edit-memory" data-id="${item.id}">Edit</button><button class="button button-danger" data-action="delete-memory" data-id="${item.id}">Delete</button></div>` });
}

function openEditMemory(id) {
  const item = state.memories.find(entry => entry.id === id);
  if (!item) return;
  openModal({ eyebrow: "EDIT MEMORY", title: item.title, html: memoryFormHTML(item, { twoSides: item.type === "two-sides" }) });
  bindMemoryForm({ type: item.type, existingId: id });
}

function openTwoSides(id) {
  const item = state.memories.find(entry => entry.id === id && entry.type === "two-sides");
  if (!item) return;
  item.sides ||= {};
  const me = currentProfile();
  const partner = partnerProfile();
  const mine = item.sides[me.id];
  const theirs = item.sides[partner.id];
  const reveal = Boolean(mine?.text && theirs?.text);
  openModal({ eyebrow: "SAME MOMENT, TWO SIDES", title: item.title, html: `
    ${memoryPhotoGallery({ ...item, icon: item.icon || "♡♡" }, { maxHeight: 260 })}
    <p class="small muted">${escapeHTML(formatDate(item.date))}${item.location ? ` · ${escapeHTML(item.location)}` : ""}</p>
    ${reveal ? `<div class="answer-grid">${answerCard(me, mine, "is-you")}${answerCard(partner, theirs, "is-partner")}</div>` : `<div class="answer-grid"><div class="answer-card ${mine ? "is-you" : "is-locked"}">${mine ? `<strong>${escapeHTML(me.displayName)}</strong><p>Your side is safely tucked away until both submit.</p>` : `<div><div class="lock-icon">♡</div><p>You haven’t written your side yet.</p></div>`}</div><div class="answer-card is-locked"><div><div class="lock-icon">♡</div><p>${theirs ? `${escapeHTML(partner.displayName)} submitted privately.` : `${escapeHTML(partner.displayName)} hasn’t submitted yet.`}</p></div></div></div>`}
    <div class="button-row" style="margin-top:14px"><button class="button button-primary" data-action="edit-two-side" data-id="${item.id}">${mine ? "Edit my side" : "Add my side"}</button><button class="button button-secondary" data-action="edit-memory" data-id="${item.id}">Edit memory</button></div>` });
}

function editTwoSide(id) {
  const item = state.memories.find(entry => entry.id === id);
  if (!item) return;
  const existing = item.sides?.[state.currentUserId]?.text || "";
  openModal({ eyebrow: "PRIVATE SIDE", title: item.title, html: `<form id="sideForm" class="form-grid"><div class="field"><label>What do you remember?</label><textarea name="side" required maxlength="900">${escapeHTML(existing)}</textarea></div><p class="small muted">This stays locked until both people have a side.</p><button class="button button-primary" type="submit">Save my side</button></form>` });
  document.getElementById("sideForm").addEventListener("submit", event => {
    event.preventDefault(); const form = new FormData(event.currentTarget); item.sides ||= {}; item.sides[state.currentUserId] = { text: String(form.get("side") || "").trim(), submittedAt: Date.now() }; saveState(); closeModal(); render(); toast("Side saved privately");
  });
}

function loreFormHTML(item = {}) {
  return `<form id="loreForm" class="form-grid"><div class="two-grid"><div class="field"><label>Icon / emoji</label><input name="icon" maxlength="4" value="${escapeHTML(item.icon || "📖")}"></div><div class="field"><label>Title</label><input name="title" required maxlength="100" value="${escapeHTML(item.title || "")}" placeholder="The Chicken Incident"></div></div><div class="field"><label>Origin</label><textarea name="origin" required maxlength="1000">${escapeHTML(item.origin || "")}</textarea></div><div class="field"><label>What it means now</label><textarea name="meaning" required maxlength="1000">${escapeHTML(item.meaning || "")}</textarea></div><div class="field"><label>Tags</label><input name="tags" value="${escapeHTML((item.tags || []).join(", "))}" placeholder="Inside Joke, Food"></div><button class="button button-primary" type="submit">Save to our lore</button></form>`;
}

function openAddLore(existingId = "") {
  const item = existingId ? state.lore.find(entry => entry.id === existingId) : null;
  openModal({ eyebrow: "RELATIONSHIP LORE", title: item ? "Edit this legend" : "Archive an inside story", html: loreFormHTML(item || {}) });
  document.getElementById("loreForm").addEventListener("submit", event => {
    event.preventDefault(); const form = new FormData(event.currentTarget); const data = { icon: String(form.get("icon") || "📖").trim(), title: String(form.get("title") || "").trim(), origin: String(form.get("origin") || "").trim(), meaning: String(form.get("meaning") || "").trim(), tags: String(form.get("tags") || "").split(",").map(value => value.trim()).filter(Boolean).slice(0,8) };
    if (item) Object.assign(item, data); else state.lore.unshift({ id: uid("l"), ...data, createdAt: Date.now() });
    saveState(); closeModal(); runtime.memoryTab = "lore"; navigate("memories"); toast("Added to relationship lore 📖");
  });
}

function openLore(id) {
  const item = state.lore.find(entry => entry.id === id);
  if (!item) return;
  openModal({ eyebrow: "RELATIONSHIP LORE", title: item.title, html: `<article class="card lore-card card-duo"><div class="lore-icon">${escapeHTML(item.icon || "📖")}</div><h3>${escapeHTML(item.title)}</h3><div class="tags" style="justify-content:center">${(item.tags || []).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}</div><div class="lore-section"><strong>Origin</strong><p>${escapeHTML(item.origin)}</p></div><div class="lore-section"><strong>Current meaning</strong><p>${escapeHTML(item.meaning)}</p></div></article><div class="button-row"><button class="button button-secondary" data-action="edit-lore" data-id="${item.id}">Edit lore</button><button class="button button-danger" data-action="delete-lore" data-id="${item.id}">Delete</button></div>` });
}

function openExhibit(kind, id) {
  if (kind === "lore") return openLore(id);
  const item = state.memories.find(entry => entry.id === id);
  if (item?.type === "two-sides") return openTwoSides(id);
  return openMemoryDetail(id);
}

function openAddDateIdea() {
  openModal({ eyebrow: "DATE JAR", title: "Add an idea", html: `<form id="dateIdeaForm" class="form-grid"><div class="field"><label>Date idea</label><input name="title" required maxlength="120" placeholder="Pottery class + dessert"></div><div class="two-grid"><div class="field"><label>Category</label><select name="category"><option>Food</option><option>Out</option><option>At Home</option><option>Outdoor</option><option>Travel</option><option>Random</option></select></div><div class="field"><label>Budget</label><select name="budget"><option>Free</option><option>Cheap</option><option selected>Normal</option><option>Treat</option></select></div></div><button class="button button-primary" type="submit">Drop it in the jar 💌</button></form>` });
  document.getElementById("dateIdeaForm").addEventListener("submit", event => { event.preventDefault(); const form = new FormData(event.currentTarget); state.dateIdeas.unshift({ id: uid("d"), title: String(form.get("title") || "").trim(), category: String(form.get("category") || "Random"), budget: String(form.get("budget") || "Normal"), completed: false }); saveState(); closeModal(); render(); toast("Added to the Date Jar"); });
}

function pickDateIdea() {
  let pool = state.dateIdeas.filter(item => !item.completed);
  if (runtime.selectedDateFilter !== "All") pool = pool.filter(item => item.category === runtime.selectedDateFilter);
  const result = pool[Math.floor(Math.random() * pool.length)];
  const resultEl = document.getElementById("datePickResult");
  if (!result) { toast("No unfinished date ideas in this filter"); return; }
  resultEl.innerHTML = `<div class="date-result"><p class="eyebrow">KOI PICKED</p><h3>${escapeHTML(result.title)}</h3><p class="small muted">${escapeHTML(result.category)} · ${escapeHTML(result.budget)}</p><button class="button button-soft" data-action="toggle-date-complete" data-id="${result.id}">Mark as done ✓</button></div>`;
}

function openNewCheckin() {
  openModal({ eyebrow: "CHECK-IN", title: `How are you, ${currentProfile().displayName}?`, html: `<form id="checkinForm" class="form-grid"><div class="field"><label>Mood</label><div class="mood-grid">${["🥰","🙂","😐","😕","😴"].map((mood, index) => `<button class="mood-button ${index === 1 ? "is-active" : ""}" type="button" data-action="select-mood" data-value="${mood}">${mood}</button>`).join("")}</div><input type="hidden" name="mood" value="🙂"></div><div class="range-row"><label>Energy</label><input type="range" name="energy" min="1" max="5" value="3"><output>3</output></div><div class="range-row"><label>Social</label><input type="range" name="social" min="1" max="5" value="3"><output>3</output></div><div class="field"><label>What would help?</label><select name="need"><option>Nothing, I’m okay</option><option>A hug</option><option>Quality time</option><option>Space</option><option>Talk</option><option>Food 😂</option><option>Help with something</option></select></div><div class="field"><label>Optional note</label><input name="note" maxlength="140" placeholder="Tiny context for my person"></div><button class="button button-primary" type="submit">Share check-in</button></form>` });
  const form = document.getElementById("checkinForm");
  form.querySelectorAll('input[type="range"]').forEach(input => input.addEventListener("input", () => input.nextElementSibling.value = input.value));
  form.addEventListener("submit", event => { event.preventDefault(); const data = new FormData(event.currentTarget); state.checkins.push({ id: uid("ci"), userId: state.currentUserId, mood: String(data.get("mood") || "🙂"), energy: Number(data.get("energy") || 3), social: Number(data.get("social") || 3), need: String(data.get("need") || "Nothing, I’m okay"), note: String(data.get("note") || "").trim(), createdAt: Date.now() }); saveState(); closeModal(); render(); toast("Check-in shared 💗"); });
}

function openAddCanon() {
  openModal({ eyebrow: "OUR CANON", title: "Declare something official", html: `<form id="canonForm" class="form-grid"><div class="field"><label>Category</label><input name="category" required placeholder="Best ramen / Our song / House rule"></div><div class="field"><label>Official answer</label><input name="text" required maxlength="200"></div><button class="button button-primary" type="submit">Make it canon 📖</button></form>` });
  document.getElementById("canonForm").addEventListener("submit", event => { event.preventDefault(); const form = new FormData(event.currentTarget); state.canon.unshift({ id: uid("c"), category: String(form.get("category") || "").trim(), text: String(form.get("text") || "").trim(), status: "official" }); saveState(); closeModal(); render(); toast("Canon updated"); });
}

function openAddTradition() {
  openModal({ eyebrow: "TRADITIONS", title: "Make it our thing", html: `<form id="traditionForm" class="form-grid"><div class="field"><label>Tradition</label><input name="title" required maxlength="120" placeholder="Friday ramen"></div><div class="two-grid"><div class="field"><label>Cadence</label><select name="cadence"><option>Weekly</option><option>Monthly</option><option>Yearly</option><option>Whenever</option></select></div><div class="field"><label>Started</label><input name="startDate" type="date" value="${todayKey()}"></div></div><button class="button button-primary" type="submit">Start tradition 🎀</button></form>` });
  document.getElementById("traditionForm").addEventListener("submit", event => { event.preventDefault(); const form = new FormData(event.currentTarget); state.traditions.unshift({ id: uid("t"), title: String(form.get("title") || "").trim(), cadence: String(form.get("cadence") || "Whenever"), startDate: String(form.get("startDate") || todayKey()), count: 1 }); saveState(); closeModal(); render(); toast("New tradition started"); });
}

function openAddThenNow() {
  openModal({ eyebrow: "THEN VS NOW", title: "Save a question for future-you", html: `<form id="thenNowForm" class="form-grid"><div class="field"><label>Question</label><input name="prompt" required maxlength="220" placeholder="Where do we imagine living in five years?"></div><div class="field"><label>Your answer now</label><textarea name="oldAnswer" required maxlength="900"></textarea></div><button class="button button-primary" type="submit">Save for later</button></form>` });
  document.getElementById("thenNowForm").addEventListener("submit", event => { event.preventDefault(); const form = new FormData(event.currentTarget); state.thenNow.unshift({ id: uid("tn"), prompt: String(form.get("prompt") || "").trim(), oldDate: todayKey(), oldAnswer: String(form.get("oldAnswer") || "").trim(), newAnswer: "", completedAt: "" }); saveState(); closeModal(); render(); toast("Future Koi will ask again ✦"); });
}

function answerThenNow(id) {
  const item = state.thenNow.find(entry => entry.id === id);
  if (!item) return;
  openModal({ eyebrow: "ANSWER FIRST", title: item.prompt, html: `<form id="thenNowAnswerForm" class="form-grid"><p class="small muted">Your old answer is intentionally hidden until you submit.</p><div class="field"><label>What do you think now?</label><textarea name="answer" required maxlength="900"></textarea></div><button class="button button-primary" type="submit">Reveal then vs now</button></form>` });
  document.getElementById("thenNowAnswerForm").addEventListener("submit", event => { event.preventDefault(); const form = new FormData(event.currentTarget); item.newAnswer = String(form.get("answer") || "").trim(); item.completedAt = todayKey(); saveState(); closeModal(); render(); toast("Past you says hi 💗"); });
}

function openEditProfile() {
  const me = currentProfile();
  const partner = partnerProfile();
  const cloudReady = Boolean(window.KoiCloud?.runtime?.ready && window.KoiCloud?.pairs?.updateMyProfile);

  if (cloudReady) {
    openModal({ eyebrow: "YOUR PROFILE", title: "How you appear in Koi", html: `
      <form id="profileForm" class="form-grid">
        <div class="two-grid">
          <div class="field"><label>Your emoji</label><input name="myAvatar" maxlength="4" value="${escapeHTML(me.avatar)}"></div>
          <div class="field"><label>Your name</label><input name="myName" maxlength="40" value="${escapeHTML(me.displayName)}"></div>
        </div>
        <article class="card card-lavender"><p class="small muted"><strong>${escapeHTML(partner.displayName)}</strong> edits their own name and emoji from their phone. Their changes will sync here automatically.</p></article>
        <button class="button button-primary" type="submit">Save my profile</button>
      </form>` });

    document.getElementById("profileForm").addEventListener("submit", async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const nextName = String(form.get("myName") || "You").trim();
      const nextAvatar = String(form.get("myAvatar") || "🌷").trim();
      try {
        await window.KoiCloud.pairs.updateMyProfile({ displayName: nextName, avatar: nextAvatar });
        me.displayName = nextName;
        me.avatar = nextAvatar;
        saveState();
        closeModal();
        render();
        toast("Profile synced to both phones 💗");
      } catch (error) {
        toast(error.message || "Could not sync your profile");
      }
    });
    return;
  }

  openModal({ eyebrow: "PROFILES", title: "The two of you", html: `<form id="profileForm" class="form-grid"><div class="two-grid"><div class="field"><label>Your emoji</label><input name="myAvatar" maxlength="4" value="${escapeHTML(me.avatar)}"></div><div class="field"><label>Your name</label><input name="myName" maxlength="40" value="${escapeHTML(me.displayName)}"></div></div><div class="two-grid"><div class="field"><label>Partner emoji</label><input name="partnerAvatar" maxlength="4" value="${escapeHTML(partner.avatar)}"></div><div class="field"><label>Partner name</label><input name="partnerName" maxlength="40" value="${escapeHTML(partner.displayName)}"></div></div><button class="button button-primary" type="submit">Save profiles</button></form>` });
  document.getElementById("profileForm").addEventListener("submit", event => { event.preventDefault(); const form = new FormData(event.currentTarget); me.displayName = String(form.get("myName") || "You").trim(); me.avatar = String(form.get("myAvatar") || "🌷").trim(); partner.displayName = String(form.get("partnerName") || "Love").trim(); partner.avatar = String(form.get("partnerAvatar") || "☁️").trim(); saveState(); closeModal(); render(); toast("Profiles updated"); });
}

async function decodeImageForCompression(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close?.() };
    } catch (error) {
      console.warn("Koi image bitmap fallback", error);
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Could not decode this photo."));
      element.src = url;
    });
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => {} };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function compressImageToBlob(file, maxDimension = 1200, quality = 0.76) {
  const decoded = await decodeImageForCompression(file);
  let { width, height } = decoded;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Photo processing is not available on this device.");
  context.drawImage(decoded.source, 0, 0, width, height);
  decoded.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(result => result ? resolve(result) : reject(new Error("Could not compress this photo.")), "image/jpeg", quality);
  });
  canvas.width = 1;
  canvas.height = 1;
  return blob;
}

async function compressImage(file, maxDimension = 1200, quality = 0.76) {
  const blob = await compressImageToBlob(file, maxDimension, quality);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not prepare this photo."));
    reader.readAsDataURL(blob);
  });
}

window.compressImageToBlob = compressImageToBlob;

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `koi-backup-${todayKey()}.json`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 500);
  toast("Backup exported");
}

function importData() {
  const input = document.createElement("input"); input.type = "file"; input.accept = "application/json,.json";
  input.addEventListener("change", async () => {
    const file = input.files?.[0]; if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object") throw new Error("Invalid file");
      state = deepMerge(clone(DEFAULT_STATE), parsed); state.version = CURRENT_VERSION; saveState(); render(); toast("Koi backup restored");
    } catch { toast("That backup file could not be imported"); }
  });
  input.click();
}

function requestNotifications() {
  if (!("Notification" in window)) { toast("Notifications are not supported here"); return; }
  Notification.requestPermission().then(permission => { state.settings.notificationPermissionAsked = true; saveState(); toast(permission === "granted" ? "Notifications allowed ♡" : "Notification permission not granted"); });
}

async function installApp() {
  if (runtime.installPrompt) {
    runtime.installPrompt.prompt();
    const choice = await runtime.installPrompt.userChoice;
    if (choice.outcome === "accepted") toast("Koi added to your home screen 💗");
    runtime.installPrompt = null;
  } else {
    openModal({ eyebrow: "INSTALL KOI", title: "Add Koi to your home screen", html: `<article class="card card-duo"><h3>On iPhone</h3><p class="small">Open Koi in Safari → Share → <strong>Add to Home Screen</strong>.</p><h3 style="margin-top:16px">On supported browsers</h3><p class="small">Use the browser’s Install / Add to Home Screen option. Once installed, Koi opens like a standalone app.</p></article>` });
  }
}

// ------------------------------
// Event delegation
// ------------------------------

document.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;

  if (action === "go-us") navigate("us");
  else if (action === "answer-question") openAnswerQuestion();
  else if (action === "skip-question") skipQuestion();
  else if (action === "react-answer") { state.reactions[`${todayKey()}_${state.currentUserId}`] = button.dataset.value; saveState(); render(); }
  else if (action === "switch-profile") { state.currentUserId = button.dataset.id; saveState(); closeModal(); render(); toast(`Testing as ${currentProfile().displayName}`); }
  else if (action === "pair-menu") openPairMenu();
  else if (action === "edit-us") openEditUs();
  else if (action === "memory-tab") { runtime.memoryTab = button.dataset.tab; renderMemories(); }
  else if (action === "add-memory-menu") openMemoryAddMenu();
  else if (action === "add-memory") { closeModal(); openAddMemory(); }
  else if (action === "add-two-sides") { closeModal(); openAddTwoSides(); }
  else if (action === "add-lore") { closeModal(); openAddLore(); }
  else if (action === "open-memory") openMemoryDetail(button.dataset.id);
  else if (action === "open-two-sides") openTwoSides(button.dataset.id);
  else if (action === "open-lore") openLore(button.dataset.id);
  else if (action === "open-exhibit") openExhibit(button.dataset.kind, button.dataset.id);
  else if (action === "edit-memory") openEditMemory(button.dataset.id);
  else if (action === "edit-two-side") editTwoSide(button.dataset.id);
  else if (action === "delete-memory") { if (confirm("Delete this memory?")) { state.memories = state.memories.filter(item => item.id !== button.dataset.id); saveState(); closeModal(); render(); toast("Memory deleted"); } }
  else if (action === "edit-lore") openAddLore(button.dataset.id);
  else if (action === "delete-lore") { if (confirm("Delete this piece of lore?")) { state.lore = state.lore.filter(item => item.id !== button.dataset.id); saveState(); closeModal(); render(); toast("Lore deleted"); } }
  else if (action === "open-museum") { runtime.memoryTab = "museum"; navigate("memories"); }
  else if (action === "open-room") { runtime.route = "extras"; runtime.extrasView = "room"; location.hash = "extras"; render(); }
  else if (action === "open-date-jar") { runtime.route = "extras"; runtime.extrasView = "dateJar"; location.hash = "extras"; render(); }
  else if (action === "open-checkin") { runtime.route = "extras"; runtime.extrasView = "checkin"; location.hash = "extras"; render(); }
  else if (action === "open-canon") { runtime.route = "extras"; runtime.extrasView = "canon"; location.hash = "extras"; render(); }
  else if (action === "open-traditions") { runtime.route = "extras"; runtime.extrasView = "traditions"; location.hash = "extras"; render(); }
  else if (action === "open-then-now") { runtime.route = "extras"; runtime.extrasView = "thenNow"; location.hash = "extras"; render(); }
  else if (action === "extras-back") { runtime.extrasView = ""; render(); }
  else if (action === "toggle-decor") { const id = button.dataset.id; const set = new Set(state.room.activeDecor || []); set.has(id) ? set.delete(id) : set.add(id); state.room.activeDecor = [...set]; saveState(); render(); }
  else if (action === "add-date-idea") openAddDateIdea();
  else if (action === "pick-date") pickDateIdea();
  else if (action === "date-filter") { runtime.selectedDateFilter = button.dataset.value; render(); }
  else if (action === "toggle-date-complete") { const item = state.dateIdeas.find(entry => entry.id === button.dataset.id); if (item) item.completed = !item.completed; saveState(); render(); }
  else if (action === "new-checkin") openNewCheckin();
  else if (action === "select-mood") { button.closest(".mood-grid").querySelectorAll(".mood-button").forEach(item => item.classList.remove("is-active")); button.classList.add("is-active"); button.closest("form").elements.mood.value = button.dataset.value; }
  else if (action === "add-canon") openAddCanon();
  else if (action === "delete-canon") { state.canon = state.canon.filter(item => item.id !== button.dataset.id); saveState(); render(); }
  else if (action === "add-tradition") openAddTradition();
  else if (action === "increment-tradition") { const item = state.traditions.find(entry => entry.id === button.dataset.id); if (item) item.count += 1; saveState(); render(); toast("Tradition count +1 🎀"); }
  else if (action === "add-then-now") openAddThenNow();
  else if (action === "answer-then-now") answerThenNow(button.dataset.id);
  else if (action === "set-theme") { state.settings.themePair = button.dataset.id; saveState(); render(); toast("Colors updated ✦"); }
  else if (action === "apply-custom-theme") {
    const first = normalizeHexColor(document.getElementById("customColorHexOne")?.value || document.getElementById("customColorPickerOne")?.value, state.settings.customColorOne || "#F3B8D0");
    const second = normalizeHexColor(document.getElementById("customColorHexTwo")?.value || document.getElementById("customColorPickerTwo")?.value, state.settings.customColorTwo || "#D7C4F2");
    state.settings.customColorOne = first;
    state.settings.customColorTwo = second;
    state.settings.themePair = "custom";
    saveState(); render(); toast("Your custom colors are on 💗");
  }
  else if (action === "set-wallpaper") { state.settings.wallpaper = button.dataset.id; state.settings.customWallpaperEnabled = false; saveState(); render(); toast("Wallpaper updated"); }
  else if (action === "set-wallpaper-overlay") { state.settings.customWallpaperOverlay = button.dataset.value || "medium"; saveState(); render(); }
  else if (action === "set-wallpaper-position") { state.settings.customWallpaperPosition = button.dataset.value || "center"; saveState(); render(); }
  else if (action === "remove-custom-wallpaper") {
    state.settings.customWallpaperPhoto = "";
    state.settings.customWallpaperEnabled = false;
    saveState(); render(); toast("Custom wallpaper removed");
    if (window.KoiCloud?.runtime?.ready && window.KoiCloud?.sharedState?.removeWallpaper) {
      window.KoiCloud.sharedState.removeWallpaper().catch(error => console.warn("Could not remove cloud wallpaper", error));
    }
  }
  else if (action === "request-notifications") requestNotifications();
  else if (action === "install-app") installApp();
  else if (action === "export-data") exportData();
  else if (action === "import-data") importData();
  else if (action === "edit-profile") openEditProfile();
  else if (action === "reset-data") { if (confirm("Reset all Koi Build 1 data on this device?")) { localStorage.removeItem(STORAGE_KEY); state = clone(DEFAULT_STATE); state.onboardingComplete = false; saveState(); showOnboarding(); render(); } }
});

document.addEventListener("change", async event => {
  const wallpaperFile = event.target.closest("#customWallpaperFile");
  if (wallpaperFile) {
    const file = wallpaperFile.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("Please choose an image"); return; }
    try {
      if (window.KoiCloud?.runtime?.ready && window.KoiCloud?.sharedState?.uploadWallpaper) {
        const uploaded = await window.KoiCloud.sharedState.uploadWallpaper(file);
        state.settings.customWallpaperPhoto = uploaded?.signedUrl || state.settings.customWallpaperPhoto || "";
        state.settings.customWallpaperEnabled = true;
        saveState(); render(); toast("Wallpaper synced to both phones 💗");
      } else {
        const compressed = await compressImage(file, 1440, 0.72);
        state.settings.customWallpaperPhoto = compressed;
        state.settings.customWallpaperEnabled = true;
        saveState(); render(); toast("Custom wallpaper saved 💗");
      }
    } catch (error) {
      console.warn("Could not prepare wallpaper", error);
      toast(error.message || "That photo could not be used");
    }
    return;
  }

  const input = event.target.closest('[data-action="toggle-setting"]');
  if (!input) return;
  state.settings[input.dataset.key] = input.checked;
  saveState();
  if (input.dataset.key === "customWallpaperEnabled") render();
  toast("Preference saved");
});

document.addEventListener("input", event => {
  const picker = event.target.closest("[data-custom-color-picker]");
  const hex = event.target.closest("[data-custom-color-hex]");
  if (picker) {
    const which = picker.dataset.customColorPicker;
    const normalized = normalizeHexColor(picker.value, which === "one" ? "#F3B8D0" : "#D7C4F2");
    const hexInput = document.getElementById(which === "one" ? "customColorHexOne" : "customColorHexTwo");
    const preview = document.getElementById(which === "one" ? "customColorPreviewOne" : "customColorPreviewTwo");
    if (hexInput) hexInput.value = normalized;
    if (preview) preview.style.background = normalized;
    return;
  }
  if (hex) {
    const which = hex.dataset.customColorHex;
    const raw = String(hex.value || "").trim();
    const candidate = raw.startsWith("#") ? raw : `#${raw}`;
    if (!/^#[0-9A-Fa-f]{6}$/.test(candidate)) return;
    const normalized = candidate.toUpperCase();
    const colorPicker = document.getElementById(which === "one" ? "customColorPickerOne" : "customColorPickerTwo");
    const preview = document.getElementById(which === "one" ? "customColorPreviewOne" : "customColorPreviewTwo");
    if (colorPicker) colorPicker.value = normalized;
    if (preview) preview.style.background = normalized;
  }
});

document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => navigate(button.dataset.route)));
document.getElementById("closeModalBtn").addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", event => { if (event.target === modalBackdrop) closeModal(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && !modalBackdrop.hidden) closeModal(); });
document.getElementById("openPairMenuBtn").addEventListener("click", openPairMenu);
document.getElementById("openNotificationsBtn").addEventListener("click", openNotifications);

window.addEventListener("hashchange", () => {
  const route = location.hash.replace("#", "") || "home";
  if (["home", "us", "memories", "extras", "you"].includes(route)) { runtime.route = route; runtime.extrasView = ""; render(); }
});

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  runtime.installPrompt = event;
});

// ------------------------------
// Onboarding
// ------------------------------

const onboarding = document.getElementById("onboarding");
const onboardingStepEl = document.getElementById("onboardingStep");
const onboardingNextBtn = document.getElementById("onboardingNextBtn");
const onboardingBackBtn = document.getElementById("onboardingBackBtn");

function showOnboarding() {
  runtime.onboardingStep = 0;
  runtime.onboardingDraft = {
    myName: state.profiles[0].displayName === "You" ? "" : state.profiles[0].displayName,
    partnerName: state.profiles[1].displayName === "Love" ? "" : state.profiles[1].displayName,
    anniversary: state.pair.datingAnniversary || state.pair.anniversary || "",
    relationshipMode: state.pair.relationshipMode || "dating",
    datingAnniversary: state.pair.datingAnniversary || state.pair.anniversary || "",
    weddingAnniversary: state.pair.weddingAnniversary || "",
    myAvatar: state.profiles[0].avatar || "🌷",
    partnerAvatar: state.profiles[1].avatar || "☁️"
  };
  onboarding.hidden = false;
  renderOnboardingStep();
}

function renderOnboardingStep() {
  const step = runtime.onboardingStep;
  document.querySelectorAll(".onboarding-progress span").forEach((dot, index) => dot.classList.toggle("is-current", index === step));
  onboardingBackBtn.hidden = step === 0;
  onboardingNextBtn.textContent = step === 2 ? "Enter Koi 💗" : "Continue";

  if (step === 0) {
    onboardingStepEl.innerHTML = `<article class="card card-duo"><p class="eyebrow">A PRIVATE SPACE FOR TWO</p><h2>Keep the tiny things.</h2><p class="small muted">Daily questions, two-sided memories, relationship lore, your museum, your room, your date jar — all in one soft little place.</p></article>`;
  } else if (step === 1) {
    const mode = runtime.onboardingDraft.relationshipMode || "dating";
    onboardingStepEl.innerHTML = `<div class="form-grid"><div class="two-grid"><div class="field"><label>Your emoji</label><input id="obMyAvatar" maxlength="4" value="${escapeHTML(runtime.onboardingDraft.myAvatar)}"></div><div class="field"><label>Your name</label><input id="obMyName" maxlength="40" value="${escapeHTML(runtime.onboardingDraft.myName)}" placeholder="Your name"></div></div><div class="two-grid"><div class="field"><label>Their emoji</label><input id="obPartnerAvatar" maxlength="4" value="${escapeHTML(runtime.onboardingDraft.partnerAvatar)}"></div><div class="field"><label>Their name</label><input id="obPartnerName" maxlength="40" value="${escapeHTML(runtime.onboardingDraft.partnerName)}" placeholder="Partner name"></div></div><div class="field"><label>Relationship mode</label><select id="obRelationshipMode"><option value="dating" ${mode === "dating" ? "selected" : ""}>Dating</option><option value="married" ${mode === "married" ? "selected" : ""}>Married 💍</option></select></div><div class="field"><label>Dating anniversary / together since</label>${compactDatePickerHTML("obDating", runtime.onboardingDraft.datingAnniversary || runtime.onboardingDraft.anniversary, { required: true })}</div><div class="field" id="obWeddingWrap" ${mode === "married" ? "" : "hidden"}><label>Wedding anniversary</label>${compactDatePickerHTML("obWedding", runtime.onboardingDraft.weddingAnniversary || "")}</div></div>`;
    const obMode = document.getElementById("obRelationshipMode");
    const obWedding = document.getElementById("obWeddingWrap");
    obMode?.addEventListener("change", () => { obWedding.hidden = obMode.value !== "married"; });
  } else {
    onboardingStepEl.innerHTML = `<article class="card card-lavender"><p class="eyebrow">ALMOST HOME</p><h2>Your little space is ready.</h2><p class="small muted">You can change names, anniversaries, themes and other details anytime inside Koi.</p></article>`;
  }
}

function collectOnboardingStep() {
  if (runtime.onboardingStep !== 1) return true;
  runtime.onboardingDraft.myName = document.getElementById("obMyName").value.trim();
  runtime.onboardingDraft.partnerName = document.getElementById("obPartnerName").value.trim();
  runtime.onboardingDraft.myAvatar = document.getElementById("obMyAvatar").value.trim() || "🌷";
  runtime.onboardingDraft.partnerAvatar = document.getElementById("obPartnerAvatar").value.trim() || "☁️";
  runtime.onboardingDraft.relationshipMode = document.getElementById("obRelationshipMode")?.value || "dating";
  try {
    runtime.onboardingDraft.datingAnniversary = readCompactDate(document, "obDating", { required: true });
    runtime.onboardingDraft.weddingAnniversary = runtime.onboardingDraft.relationshipMode === "married" ? readCompactDate(document, "obWedding", { required: true }) : "";
    runtime.onboardingDraft.anniversary = runtime.onboardingDraft.datingAnniversary;
  } catch (error) {
    toast(error.message || "Choose your anniversary date");
    return false;
  }
  if (!runtime.onboardingDraft.myName || !runtime.onboardingDraft.partnerName) { toast("Add both names first"); return false; }
  return true;
}

onboardingNextBtn.addEventListener("click", async () => {
  if (!collectOnboardingStep()) return;
  if (runtime.onboardingStep < 2) { runtime.onboardingStep += 1; renderOnboardingStep(); return; }
  state.profiles[0].displayName = runtime.onboardingDraft.myName || "You";
  state.profiles[0].avatar = runtime.onboardingDraft.myAvatar || "🌷";
  state.profiles[1].displayName = runtime.onboardingDraft.partnerName || "Love";
  state.profiles[1].avatar = runtime.onboardingDraft.partnerAvatar || "☁️";
  state.pair.relationshipMode = runtime.onboardingDraft.relationshipMode || "dating";
  state.pair.datingAnniversary = runtime.onboardingDraft.datingAnniversary || runtime.onboardingDraft.anniversary || todayKey();
  state.pair.weddingAnniversary = state.pair.relationshipMode === "married" ? (runtime.onboardingDraft.weddingAnniversary || "") : "";
  state.pair.anniversary = state.pair.datingAnniversary;
  state.pair.inviteCode = state.pair.inviteCode || `KOI-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  state.onboardingComplete = true;

  try {
    if (window.KoiCloud?.runtime?.ready) {
      await window.KoiCloud.pairs?.updateMyProfile?.({ displayName: state.profiles[0].displayName, avatar: state.profiles[0].avatar });
      await window.KoiCloud.pairs?.updateRelationship?.({
        relationshipMode: state.pair.relationshipMode,
        datingAnniversary: state.pair.datingAnniversary,
        weddingAnniversary: state.pair.weddingAnniversary || null
      });
    }
  } catch (error) {
    console.warn("Koi cloud profile/settings sync will retry later", error);
  }

  saveState();
  onboarding.hidden = true;
  render();
  toast("Welcome to Koi 💗");
});

onboardingBackBtn.addEventListener("click", () => {
  collectOnboardingStep();
  runtime.onboardingStep = Math.max(0, runtime.onboardingStep - 1);
  renderOnboardingStep();
});

// ------------------------------
// PWA boot
// ------------------------------

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(error => console.warn("Service worker registration failed", error)));
}

applyTheme();
render();
if (!state.onboardingComplete) showOnboarding();


/* ---------------------------------------------------------
   APP-LIKE ZOOM LOCK
   Keeps Koi behaving like a standalone phone app:
   - blocks pinch-to-zoom
   - blocks double-tap zoom
   - preserves normal one-finger scrolling and tapping
   --------------------------------------------------------- */
function enableAppLikeZoomLock() {
  // Safari-specific pinch gestures (especially iOS Safari/PWA).
  ["gesturestart", "gesturechange", "gestureend"].forEach(type => {
    document.addEventListener(type, event => {
      event.preventDefault();
    }, { passive: false });
  });

  // Block multi-touch pinch while leaving one-finger scrolling alone.
  document.addEventListener("touchstart", event => {
    if (event.touches && event.touches.length > 1) {
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener("touchmove", event => {
    if (event.touches && event.touches.length > 1) {
      event.preventDefault();
    }
  }, { passive: false });

  // Block the browser's double-tap-to-zoom gesture.
  let lastTouchEnd = 0;
  document.addEventListener("touchend", event => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  // Also suppress browser zoom shortcuts when Koi is tested on desktop.
  document.addEventListener("wheel", event => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && ["+", "=", "-", "0"].includes(event.key)) {
      event.preventDefault();
    }
  });
}

enableAppLikeZoomLock();

/* =========================================================
   KOI BUILD 1.2 — ALL 14 LOCAL-FIRST FEATURE EXPANSION
   Adds:
   1) Daily Question History
   2) Question Packs + custom questions
   3) Little Things
   4) Date Jar 2.0
   5) Blind Date Builder
   6) I Bet You predictions
   7) Relationship Lore 2.0
   8) Our Canon challenges
   9) Accidental Traditions
   10) Then vs Now 2.0
   11) Relationship Eras
   12) Richer Our Museum
   13) Room progression
   14) Pink + lavender koi mascots
   ========================================================= */

(function enableKoiBuild12() {
  const DATA = window.KOI_DATA || {};
  const baseOpenExhibit = openExhibit;

  function featureDate(value) {
    if (!value) return "";
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function ensureFeatureState() {
    state.settings.questionPack ||= "all";
    state.settings.customColorOne ||= "#F3B8D0";
    state.settings.customColorTwo ||= "#D7C4F2";
    state.settings.wallpaper ||= "petals";
    state.settings.customWallpaperPhoto ||= "";
    state.settings.customWallpaperEnabled = Boolean(state.settings.customWallpaperPhoto && state.settings.customWallpaperEnabled);
    state.settings.customWallpaperOverlay ||= "medium";
    state.settings.customWallpaperPosition ||= "center";
    state.pair.relationshipMode ||= state.pair.weddingAnniversary ? "married" : "dating";
    state.pair.datingAnniversary ||= state.pair.anniversary || "";
    state.pair.weddingAnniversary ||= "";
    state.pair.anniversary = state.pair.datingAnniversary || state.pair.anniversary;
    state.customQuestions ||= [];
    state.littleThings ||= [];
    state.dateCompletions ||= [];
    state.blindDate ||= { preferences: { u1: null, u2: null }, match: null, updatedAt: null };
    state.predictions ||= [];
    state.eras ||= [{
      id: "era_current",
      title: state.pair.currentEra || "Our Current Era",
      emoji: "✨",
      startDate: state.pair.anniversary || todayKey(),
      endDate: "",
      description: "The chapter we are living right now.",
      active: true
    }];
    state.activeEraId ||= state.eras.find(item => item.active)?.id || state.eras[0]?.id || "";
    state.dismissedTraditionSuggestions ||= [];
    state.room ||= {};
    state.room.activeDecor ||= ["lights", "frame", "plant", "plush"];
    state.room.mascots ||= { pinkName: "Pink Koi", lavenderName: "Lavender Koi" };
    state.room.unlockedMoments ||= [];
    state.museum ||= { featuredIds: [] };

    state.dateIdeas = (state.dateIdeas || []).map(item => ({
      setting: "Anywhere",
      duration: "1–2 hours",
      location: "",
      rating: "",
      completedAt: "",
      timesDone: item.completed ? 1 : 0,
      ...item
    }));

    state.lore = (state.lore || []).map(item => ({
      category: "inside-joke",
      dateEstablished: "",
      photo: "",
      eraId: "",
      ...item
    }));

    state.canon = (state.canon || []).map(item => ({ challenge: null, ...item }));
    state.traditions = (state.traditions || []).map(item => ({ source: "manual", ...item }));
    state.thenNow = (state.thenNow || []).map(item => ({ revisitDate: "", ...item }));
    state.memories = (state.memories || []).map(item => ({ eraId: "", photos: item.photos || (item.photo ? [item.photo] : []), ...item }));

    if (!runtime.dateFilters) runtime.dateFilters = { category: "All", budget: "All", setting: "All" };
    if (!runtime.loreFilter) runtime.loreFilter = "All";
    if (!runtime.museumKindFilter) runtime.museumKindFilter = "All";
  }

  ensureFeatureState();
  state.version = Math.max(Number(state.version || 1), 2);
  saveState();

  // ---------- Shared feature helpers ----------

  function allQuestions() {
    const dataQuestions = Array.isArray(DATA.questions) ? DATA.questions : [];
    const custom = (state.customQuestions || []).map(item => ({ ...item, category: item.category || "Our Question", pack: "custom" }));
    return [...QUESTION_BANK.map(item => ({ ...item, pack: item.pack || "all" })), ...dataQuestions, ...custom];
  }

  function questionById(id) {
    return allQuestions().find(item => item.id === id) || QUESTION_BANK[0];
  }

  function activeQuestionPool() {
    const pack = state.settings.questionPack || "all";
    const questions = allQuestions();
    if (pack === "all") return questions;
    const filtered = questions.filter(item => item.pack === pack);
    return filtered.length ? filtered : questions;
  }

  dailyQuestion = function dailyQuestionBuild12() {
    const key = todayKey();
    const override = state.dailyQuestionOverrides[key];
    if (override) return questionById(override);
    const pool = activeQuestionPool();
    return pool[hashString(`${key}_${state.settings.questionPack || "all"}`) % pool.length] || QUESTION_BANK[0];
  };

  skipQuestion = function skipQuestionBuild12() {
    const key = todayKey();
    const current = dailyQuestion();
    const pool = activeQuestionPool();
    const index = Math.max(0, pool.findIndex(item => item.id === current.id));
    const next = pool[(index + 1) % pool.length] || pool[0];
    if (!next) return;
    state.dailyQuestionOverrides[key] = next.id;
    delete state.answers[key];
    saveState();
    render();
    toast("New question for today ✦");
  };

  function currentPack() {
    return (DATA.questionPacks || []).find(item => item.id === (state.settings.questionPack || "all")) || { id: "all", icon: "💗", label: "Everything" };
  }

  function answeredDays() {
    return Object.entries(state.answers || {})
      .filter(([, record]) => record?.questionId)
      .sort((a, b) => b[0].localeCompare(a[0]));
  }

  function monthlyLittleThings() {
    const groups = {};
    [...(state.littleThings || [])].sort((a, b) => (b.date || "").localeCompare(a.date || "")).forEach(item => {
      const key = (item.date || todayKey()).slice(0, 7);
      groups[key] ||= [];
      groups[key].push(item);
    });
    return groups;
  }

  function activeEra() {
    return state.eras.find(item => item.id === state.activeEraId) || state.eras.find(item => item.active) || state.eras[0];
  }

  function eraForDate(date) {
    if (!date) return activeEra();
    return state.eras.find(era => {
      const afterStart = !era.startDate || date >= era.startDate;
      const beforeEnd = !era.endDate || date <= era.endDate;
      return afterStart && beforeEnd;
    }) || activeEra();
  }

  function relationshipPoints() {
    const completeQuestionDays = answeredDays().filter(([, record]) => Boolean(record.u1?.text && record.u2?.text)).length;
    return (
      completeQuestionDays * 2 +
      state.memories.length * 2 +
      state.lore.length * 2 +
      state.littleThings.length +
      Math.min(state.checkins.length, 30) +
      state.traditions.length * 3 +
      state.dateCompletions.length * 2 +
      state.eras.length * 2
    );
  }

  roomLevel = function roomLevelBuild12() {
    return Math.max(1, Math.min(12, 1 + Math.floor(relationshipPoints() / 10)));
  };

  roomUnlockedDecor = function roomUnlockedDecorBuild12() {
    const unlocks = Array.isArray(DATA.roomUnlocks) ? DATA.roomUnlocks : [];
    return unlocks.filter(item => relationshipPoints() >= Number(item.points || 0)).map(item => item.id);
  };

  function nextRoomUnlock() {
    return (DATA.roomUnlocks || []).find(item => relationshipPoints() < Number(item.points || 0)) || null;
  }

  function renderKoiPair(message = "Two little koi, one little us.") {
    return `<div class="koi-pond-mini" aria-label="Koi mascots">
      <div class="koi-fish koi-pink"><span class="koi-eye"></span><span class="koi-tail"></span></div>
      <div class="koi-heart">💗</div>
      <div class="koi-fish koi-lavender"><span class="koi-eye"></span><span class="koi-tail"></span></div>
      <p>${escapeHTML(message)}</p>
    </div>`;
  }

  // ---------- 1 + 2: Daily Question History + Packs ----------

  function openQuestionPacks() {
    const packs = DATA.questionPacks || [];
    openModal({ eyebrow: "QUESTION PACKS", title: "What mood are we in?", html: `
      <div class="choice-grid">${packs.map(pack => `<button class="choice-card ${state.settings.questionPack === pack.id ? "is-active" : ""}" data-action="select-question-pack" data-id="${pack.id}"><span>${pack.icon}</span><strong>${escapeHTML(pack.label)}</strong><small>${escapeHTML(pack.description)}</small></button>`).join("")}</div>
      <button class="button button-secondary button-block" style="margin-top:12px" data-action="add-custom-question">Write our own question ✍️</button>
    ` });
  }

  function openAddCustomQuestion() {
    openModal({ eyebrow: "OUR QUESTIONS", title: "Write something only you would ask", html: `
      <form id="customQuestionForm" class="form-grid">
        <div class="field"><label>Question</label><textarea name="text" required maxlength="280" placeholder="What should future-us never forget about this season?"></textarea></div>
        <button class="button button-primary" type="submit">Add to Our Questions</button>
      </form>` });
    document.getElementById("customQuestionForm").addEventListener("submit", event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      state.customQuestions.unshift({ id: uid("cq"), pack: "custom", category: "Our Question", text: String(form.get("text") || "").trim(), createdAt: Date.now() });
      state.settings.questionPack = "custom";
      delete state.dailyQuestionOverrides[todayKey()];
      delete state.answers[todayKey()];
      saveState(); closeModal(); render(); toast("Added to Our Questions ✍️");
    });
  }

  function renderAnswerHistory() {
    setFab();
    const rows = answeredDays();
    mainView.innerHTML = `<section class="page">${subviewHeader("OUR ANSWERS", "Daily Question History", "The tiny conversations do not disappear after midnight.")}
      <article class="card card-duo"><div class="section-heading" style="margin:0"><div><p class="eyebrow">CURRENT PACK</p><h2>${escapeHTML(currentPack().icon)} ${escapeHTML(currentPack().label)}</h2></div><button data-action="open-question-packs">Change</button></div><p class="small muted">${state.customQuestions.length} custom question${state.customQuestions.length === 1 ? "" : "s"} saved.</p></article>
      ${rows.length ? `<div class="memory-list">${rows.map(([date, record]) => {
        const question = questionById(record.questionId);
        const unlocked = Boolean(record.u1?.text && record.u2?.text);
        return `<button class="memory-item" data-action="open-answer-history-detail" data-date="${date}" style="width:100%;text-align:left;color:inherit"><div class="memory-thumb">${unlocked ? "💗" : "🔒"}</div><div><h3>${escapeHTML(question.text)}</h3><p>${featureDate(date)} · ${escapeHTML(question.category || "Daily Question")}</p></div><span>›</span></button>`;
      }).join("")}</div>` : emptyState("No answer history yet", "Answer a daily question and it will appear here.")}
    </section>`;
  }

  function openAnswerHistoryDetail(date) {
    const record = state.answers?.[date];
    if (!record) return;
    const question = questionById(record.questionId);
    const unlocked = Boolean(record.u1?.text && record.u2?.text);
    openModal({ eyebrow: featureDate(date), title: question.text, html: unlocked ? `<div class="answer-grid">${answerCard(state.profiles[0], record.u1, "is-you")}${answerCard(state.profiles[1], record.u2, "is-partner")}</div>` : `<div class="answer-card is-locked"><div><div class="lock-icon">♡</div><strong>Still private</strong><p>Both people need to answer before this day unlocks.</p></div></div>` });
  }

  // ---------- 3: Little Things ----------

  function renderLittleThings() {
    setFab({ icon: "+", label: "Add little thing", action: "add-little-thing" });
    const groups = monthlyLittleThings();
    const monthKeys = Object.keys(groups).sort().reverse();
    const currentMonth = todayKey().slice(0, 7);
    mainView.innerHTML = `<section class="page">${subviewHeader("LITTLE THINGS", "The tiny things count", "Save the gestures that would otherwise disappear into an ordinary day.")}
      <article class="card card-pink"><p class="eyebrow">THIS MONTH</p><h2>${(groups[currentMonth] || []).length} little thing${(groups[currentMonth] || []).length === 1 ? "" : "s"} noticed 💗</h2><button class="button button-secondary" data-action="surprise-little-thing">Show me one at random</button></article>
      ${monthKeys.length ? monthKeys.map(key => `<div class="month-block"><div class="section-heading"><h2>${new Date(`${key}-01T12:00:00`).toLocaleDateString(undefined,{month:"long",year:"numeric"})}</h2><span class="micro muted">${groups[key].length} saved</span></div><div class="memory-list">${groups[key].map(item => `<div class="memory-item"><div class="memory-thumb">${item.category === "Funny" ? "😂" : "💗"}</div><div><h3>${escapeHTML(item.text)}</h3><p>${featureDate(item.date)} · ${escapeHTML(item.category || "Everyday")} · saved by ${escapeHTML(profileById(item.userId).displayName)}</p></div><button class="icon-button" data-action="delete-little-thing" data-id="${item.id}">×</button></div>`).join("")}</div></div>`).join("") : emptyState("No Little Things yet", "Notice something sweet, funny or thoughtful and save it here.")}
    </section>`;
  }

  function openAddLittleThing() {
    openModal({ eyebrow: "LITTLE THINGS", title: `What did ${partnerProfile().displayName} do?`, html: `<form id="littleThingForm" class="form-grid">
      <div class="field"><label>The little thing</label><textarea name="text" required maxlength="400" placeholder="Brought me coffee without me asking."></textarea></div>
      <div class="two-grid"><div class="field"><label>Date</label><input name="date" type="date" value="${todayKey()}"></div><div class="field"><label>Category</label><select name="category">${(DATA.littleThingCategories || ["Everyday"]).map(value => `<option>${escapeHTML(value)}</option>`).join("")}</select></div></div>
      <button class="button button-primary" type="submit">Keep this little thing 💗</button>
    </form>` });
    document.getElementById("littleThingForm").addEventListener("submit", event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      state.littleThings.unshift({ id: uid("lt"), text: String(form.get("text") || "").trim(), date: String(form.get("date") || todayKey()), category: String(form.get("category") || "Everyday"), userId: state.currentUserId, aboutUserId: partnerProfile().id, createdAt: Date.now() });
      saveState(); closeModal(); render(); toast("Little thing saved 💗");
    });
  }

  // ---------- 4: Date Jar 2.0 ----------

  function dateBudgetIndex(value) {
    const list = DATA.dateBudgets || ["Free", "Cheap", "Normal", "Treat"];
    const index = list.indexOf(value);
    return index < 0 ? 2 : index;
  }

  function dateMatchesFilters(item) {
    const filters = runtime.dateFilters || { category: "All", budget: "All", setting: "All" };
    if (filters.category !== "All" && item.category !== filters.category) return false;
    if (filters.budget !== "All" && item.budget !== filters.budget) return false;
    if (filters.setting !== "All" && item.setting !== filters.setting && item.setting !== "Anywhere") return false;
    return true;
  }

  renderDateJar = function renderDateJarBuild12() {
    setFab({ icon: "+", label: "Add date idea", action: "add-date-idea" });
    const filtered = state.dateIdeas.filter(dateMatchesFilters);
    const unfinished = state.dateIdeas.filter(item => !item.completed).length;
    mainView.innerHTML = `<section class="page">${subviewHeader("DATE JAR 2.0", "Pick our next little adventure", "Filter by mood, money and setting — then let Koi choose.")}
      <article class="card card-duo" style="text-align:center"><div class="jar"><div class="jar-hearts">${state.dateIdeas.slice(0,14).map((_,i)=>`<span>${i%2?"💜":"💗"}</span>`).join("")}</div></div><h2>${unfinished} ideas waiting</h2><button class="button button-primary" data-action="pick-date">Pick a date ✦</button><div id="datePickResult"></div></article>
      ${dateFilterRow("category", ["All", ...(DATA.dateCategories || [])])}
      ${dateFilterRow("budget", ["All", ...(DATA.dateBudgets || [])])}
      ${dateFilterRow("setting", ["All", ...(DATA.dateSettings || []).filter(value => value !== "Anywhere")])}
      <div class="memory-list">${filtered.map(item => `<div class="memory-item"><div class="memory-thumb">${item.completed ? (item.rating || "✓") : "💌"}</div><div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.category)} · ${escapeHTML(item.budget)} · ${escapeHTML(item.setting || "Anywhere")} · ${escapeHTML(item.duration || "1–2 hours")}${item.location ? ` · ${escapeHTML(item.location)}` : ""}</p></div><button class="icon-button" data-action="${item.completed ? "undo-date-v2" : "complete-date-v2"}" data-id="${item.id}">${item.completed ? "↺" : "✓"}</button></div>`).join("") || emptyState("No ideas match", "Try another filter or add a new date idea.")}</div>
    </section>`;
  };

  function dateFilterRow(field, values) {
    return `<div class="filter-scroll">${values.map(value => `<button class="filter-chip ${(runtime.dateFilters?.[field] || "All") === value ? "is-active" : ""}" data-action="date-filter-v2" data-field="${field}" data-value="${escapeHTML(value)}">${escapeHTML(value)}</button>`).join("")}</div>`;
  }

  openAddDateIdea = function openAddDateIdeaBuild12() {
    openModal({ eyebrow: "DATE JAR", title: "Add an idea", html: `<form id="dateIdeaForm" class="form-grid">
      <div class="field"><label>Date idea</label><input name="title" required maxlength="120" placeholder="Pottery class + dessert"></div>
      <div class="two-grid"><div class="field"><label>Category</label><select name="category">${(DATA.dateCategories || []).map(value=>`<option>${escapeHTML(value)}</option>`).join("")}</select></div><div class="field"><label>Budget</label><select name="budget">${(DATA.dateBudgets || []).map(value=>`<option ${value === "Normal" ? "selected" : ""}>${escapeHTML(value)}</option>`).join("")}</select></div></div>
      <div class="two-grid"><div class="field"><label>Setting</label><select name="setting">${(DATA.dateSettings || []).map(value=>`<option>${escapeHTML(value)}</option>`).join("")}</select></div><div class="field"><label>Time needed</label><select name="duration">${(DATA.dateDurations || []).map(value=>`<option>${escapeHTML(value)}</option>`).join("")}</select></div></div>
      <div class="field"><label>Location / note</label><input name="location" maxlength="140" placeholder="Optional"></div>
      <button class="button button-primary" type="submit">Drop it in the jar 💌</button>
    </form>` });
    document.getElementById("dateIdeaForm").addEventListener("submit", event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      state.dateIdeas.unshift({ id: uid("d"), title: String(form.get("title") || "").trim(), category: String(form.get("category") || "Random"), budget: String(form.get("budget") || "Normal"), setting: String(form.get("setting") || "Anywhere"), duration: String(form.get("duration") || "1–2 hours"), location: String(form.get("location") || "").trim(), completed: false, completedAt: "", rating: "", timesDone: 0 });
      saveState(); closeModal(); render(); toast("Added to the Date Jar");
    });
  };

  pickDateIdea = function pickDateIdeaBuild12() {
    const pool = state.dateIdeas.filter(item => !item.completed && dateMatchesFilters(item));
    const result = pool[Math.floor(Math.random() * pool.length)];
    const resultEl = document.getElementById("datePickResult");
    if (!result) { toast("No unfinished date ideas match these filters"); return; }
    if (resultEl) resultEl.innerHTML = `<div class="date-result"><p class="eyebrow">KOI PICKED</p><h3>${escapeHTML(result.title)}</h3><p class="small muted">${escapeHTML(result.category)} · ${escapeHTML(result.budget)} · ${escapeHTML(result.setting)} · ${escapeHTML(result.duration)}</p><button class="button button-soft" data-action="complete-date-v2" data-id="${result.id}">We did it ✓</button></div>`;
  };

  function completeDate(id) {
    const item = state.dateIdeas.find(entry => entry.id === id); if (!item) return;
    openModal({ eyebrow: "DATE COMPLETE", title: "How was it?", html: `<div class="choice-grid compact">${["💗 Loved it","🙂 Nice","😂 Chaotic","😅 Never again"].map(value => `<button class="choice-card" data-action="rate-date-v2" data-id="${id}" data-value="${value.split(" ")[0]}"><span>${value.split(" ")[0]}</span><strong>${escapeHTML(value.slice(value.indexOf(" ")+1))}</strong></button>`).join("")}</div>` });
  }

  function rateDate(id, rating) {
    const item = state.dateIdeas.find(entry => entry.id === id); if (!item) return;
    item.completed = true; item.completedAt = todayKey(); item.rating = rating; item.timesDone = Number(item.timesDone || 0) + 1;
    state.dateCompletions.push({ id: uid("dc"), ideaId: item.id, title: item.title, category: item.category, date: todayKey(), rating });
    saveState(); closeModal(); render(); toast("Date added to your story 💗");
  }

  // ---------- 5: Blind Date Builder ----------

  function computeBlindMatch() {
    const a = state.blindDate.preferences.u1;
    const b = state.blindDate.preferences.u2;
    if (!a || !b) return null;
    const budgets = DATA.dateBudgets || ["Free","Cheap","Normal","Treat"];
    const durations = DATA.dateDurations || ["30–60 min","1–2 hours","Half day","Full day"];
    const budget = budgets[Math.min(dateBudgetIndex(a.budget), dateBudgetIndex(b.budget))];
    const duration = durations[Math.min(Math.max(0,durations.indexOf(a.duration)), Math.max(0,durations.indexOf(b.duration)))];
    const setting = a.setting === b.setting ? a.setting : (a.setting === "Anywhere" ? b.setting : (b.setting === "Anywhere" ? a.setting : "Anywhere"));
    const category = a.category === b.category ? a.category : "Any";
    const mood = a.mood === b.mood ? a.mood : `${a.mood} + ${b.mood}`;
    const food = a.food === b.food ? a.food : "Flexible";
    const matches = state.dateIdeas.filter(item => !item.completed)
      .filter(item => dateBudgetIndex(item.budget) <= dateBudgetIndex(budget))
      .filter(item => setting === "Anywhere" || item.setting === setting || item.setting === "Anywhere")
      .filter(item => category === "Any" || item.category === category)
      .slice(0, 6).map(item => item.id);
    return { budget, duration, setting, category, mood, food, matches, createdAt: Date.now() };
  }

  function renderBlindDate() {
    setFab();
    const me = currentProfile(); const partner = partnerProfile();
    const mine = state.blindDate.preferences[me.id]; const theirs = state.blindDate.preferences[partner.id];
    const match = state.blindDate.match;
    mainView.innerHTML = `<section class="page">${subviewHeader("BLIND DATE BUILDER", "Meet in the middle", "Choose privately. Koi only reveals the overlap after both people submit.")}
      <article class="card card-duo"><div class="partner-status">${partnerStatusRow(me, Boolean(mine), true)}${partnerStatusRow(partner, Boolean(theirs), false)}</div><button class="button button-primary button-block" data-action="blind-date-preferences">${mine ? "Edit my private picks" : "Choose my preferences"}</button></article>
      ${match ? `<article class="card card-lavender match-card"><p class="eyebrow">YOUR DATE FORMULA</p><h2>${escapeHTML(match.mood)}</h2><div class="tags"><span class="tag">💸 ${escapeHTML(match.budget)}</span><span class="tag">⏰ ${escapeHTML(match.duration)}</span><span class="tag">🏠 ${escapeHTML(match.setting)}</span><span class="tag">🍽️ ${escapeHTML(match.food)}</span></div><div class="section-heading"><h2>Jar matches</h2></div>${match.matches.length ? `<div class="memory-list">${match.matches.map(id => { const item = state.dateIdeas.find(entry => entry.id === id); return item ? `<div class="memory-item"><div class="memory-thumb">💌</div><div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.budget)} · ${escapeHTML(item.setting)}</p></div></div>` : ""; }).join("")}</div>` : `<p class="small muted">No saved Date Jar idea matches perfectly yet — add one inspired by this formula.</p>`}<button class="button button-secondary button-block" style="margin-top:12px" data-action="reset-blind-date">Start a new blind match</button></article>` : `<article class="card card-pink"><p class="small muted">${mine && !theirs ? `Waiting for ${escapeHTML(partner.displayName)}. Switch profiles in Us to test the second private response.` : "Both private preference cards are needed before Koi reveals the overlap."}</p></article>`}
    </section>`;
  }

  function openBlindPreferences() {
    const current = state.blindDate.preferences[state.currentUserId] || {};
    openModal({ eyebrow: "PRIVATE PICKS", title: `${currentProfile().displayName}’s date mood`, html: `<form id="blindDateForm" class="form-grid">
      <div class="two-grid"><div class="field"><label>Mood</label><select name="mood">${(DATA.dateMoods || []).map(value=>`<option ${current.mood===value?"selected":""}>${escapeHTML(value)}</option>`).join("")}</select></div><div class="field"><label>Budget max</label><select name="budget">${(DATA.dateBudgets || []).map(value=>`<option ${current.budget===value?"selected":""}>${escapeHTML(value)}</option>`).join("")}</select></div></div>
      <div class="two-grid"><div class="field"><label>Setting</label><select name="setting">${(DATA.dateSettings || []).map(value=>`<option ${current.setting===value?"selected":""}>${escapeHTML(value)}</option>`).join("")}</select></div><div class="field"><label>Time</label><select name="duration">${(DATA.dateDurations || []).map(value=>`<option ${current.duration===value?"selected":""}>${escapeHTML(value)}</option>`).join("")}</select></div></div>
      <div class="two-grid"><div class="field"><label>Category</label><select name="category">${(DATA.dateCategories || []).map(value=>`<option ${current.category===value?"selected":""}>${escapeHTML(value)}</option>`).join("")}</select></div><div class="field"><label>Food involved?</label><select name="food">${["Yes","Maybe","No preference"].map(value=>`<option ${current.food===value?"selected":""}>${value}</option>`).join("")}</select></div></div>
      <button class="button button-primary" type="submit">Save privately</button>
    </form>` });
    document.getElementById("blindDateForm").addEventListener("submit", event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      state.blindDate.preferences[state.currentUserId] = Object.fromEntries(["mood","budget","setting","duration","category","food"].map(key => [key, String(form.get(key) || "")]));
      state.blindDate.updatedAt = Date.now();
      state.blindDate.match = computeBlindMatch();
      saveState(); closeModal(); render(); toast(state.blindDate.match ? "Your overlap unlocked 💗" : "Saved privately");
    });
  }

  // ---------- 6: I Bet You ----------

  function predictionStats() {
    const resolved = state.predictions.filter(item => item.actual);
    const matches = resolved.filter(item => item.guess === item.actual).length;
    return { resolved: resolved.length, matches, percent: resolved.length ? Math.round(matches / resolved.length * 100) : 0 };
  }

  function renderPredictions() {
    setFab();
    const stats = predictionStats();
    const openRound = [...state.predictions].reverse().find(item => !item.actual);
    mainView.innerHTML = `<section class="page">${subviewHeader("I BET YOU", "How well can you predict your person?", "A playful mind-reader game, not a relationship score.")}
      <div class="stat-grid"><div class="stat-card"><strong>${stats.matches}</strong><span>Exact reads</span></div><div class="stat-card"><strong>${stats.resolved}</strong><span>Rounds</span></div><div class="stat-card"><strong>${stats.percent}%</strong><span>Mind-reader rate</span></div></div>
      ${openRound ? renderOpenPrediction(openRound) : `<article class="card card-duo" style="text-align:center">${renderKoiPair("Ready to test your mind-reading powers?")}<button class="button button-primary" data-action="new-prediction">Start a round 🔮</button></article>`}
      <div class="section-heading"><h2>Past rounds</h2></div><div class="memory-list">${state.predictions.filter(item=>item.actual).slice().reverse().slice(0,10).map(item => `<div class="memory-item"><div class="memory-thumb">${item.guess===item.actual?"✨":"👀"}</div><div><h3>${escapeHTML(item.prompt)}</h3><p>Guessed ${escapeHTML(item.guess)} · Answer was ${escapeHTML(item.actual)}</p></div></div>`).join("") || `<p class="small muted">No completed rounds yet.</p>`}</div>
    </section>`;
  }

  function renderOpenPrediction(round) {
    const target = profileById(round.targetUserId); const predictor = profileById(round.predictorUserId);
    if (state.currentUserId === round.targetUserId) {
      return `<article class="card card-pink"><p class="eyebrow">${escapeHTML(predictor.displayName)} MADE A PREDICTION</p><h2>${escapeHTML(round.prompt)}</h2><p class="small muted">Choose your real answer. Their guess stays hidden until you answer.</p><div class="choice-grid compact">${round.options.map(value => `<button class="choice-card" data-action="prediction-answer" data-id="${round.id}" data-value="${escapeHTML(value)}"><strong>${escapeHTML(value)}</strong></button>`).join("")}</div></article>`;
    }
    return `<article class="card card-lavender" style="text-align:center"><p class="eyebrow">WAITING FOR ${escapeHTML(target.displayName).toUpperCase()}</p><h2>${escapeHTML(round.prompt)}</h2><div class="answer-card is-locked"><div><div class="lock-icon">🔮</div><p>Your guess is sealed until they answer.</p></div></div></article>`;
  }

  function openNewPrediction() {
    const prompts = DATA.predictionPrompts || [];
    const prompt = prompts[state.predictions.length % Math.max(1, prompts.length)];
    if (!prompt) { toast("No prediction prompts found in data.js"); return; }
    openModal({ eyebrow: "I BET YOU", title: prompt.prompt, html: `<form id="predictionForm" class="form-grid"><p class="small muted">Predict what ${escapeHTML(partnerProfile().displayName)} will choose.</p><div class="choice-grid compact">${prompt.options.map((value,index)=>`<label class="radio-card"><input type="radio" name="guess" value="${escapeHTML(value)}" ${index===0?"required":""}><span>${escapeHTML(value)}</span></label>`).join("")}</div><button class="button button-primary" type="submit">Lock my prediction 🔮</button></form>` });
    document.getElementById("predictionForm").addEventListener("submit", event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      state.predictions.push({ id: uid("pr"), promptId: prompt.id, prompt: prompt.prompt, options: prompt.options, predictorUserId: state.currentUserId, targetUserId: partnerProfile().id, guess: String(form.get("guess") || ""), actual: "", createdAt: Date.now() });
      saveState(); closeModal(); render(); toast("Prediction locked 🔮");
    });
  }

  // ---------- 7: Relationship Lore 2.0 ----------

  renderLoreList = function renderLoreListBuild12() {
    const categories = [{ id: "All", label: "All", icon: "📖" }, ...(DATA.loreCategories || [])];
    const items = runtime.loreFilter === "All" ? state.lore : state.lore.filter(item => item.category === runtime.loreFilter);
    return `<article class="card card-duo"><div class="section-heading" style="margin:0"><div><p class="eyebrow">THE LORE BOOK</p><h2>${state.lore.length} legends archived</h2></div><button data-action="random-lore">Random Lore</button></div></article><div class="filter-scroll">${categories.map(cat => `<button class="filter-chip ${runtime.loreFilter===cat.id?"is-active":""}" data-action="lore-filter" data-value="${cat.id}">${cat.icon} ${escapeHTML(cat.label)}</button>`).join("")}</div>${items.length ? `<div class="memory-list">${items.map(item => { const cat=(DATA.loreCategories||[]).find(c=>c.id===item.category); return `<button class="memory-item" data-action="open-lore" data-id="${item.id}" style="width:100%;text-align:left;color:inherit"><div class="memory-thumb">${item.photo?`<img src="${item.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:15px">`:escapeHTML(item.icon || cat?.icon || "📖")}</div><div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(cat?.label || "Relationship Lore")}${item.dateEstablished?` · since ${featureDate(item.dateEstablished)}`:""}</p><div class="tags" style="margin-top:6px">${(item.tags||[]).slice(0,2).map(tag=>`<span class="tag">${escapeHTML(tag)}</span>`).join("")}</div></div><span>›</span></button>`; }).join("")}</div>` : emptyState("No lore in this category", "Add a story, quote, food incident or chaotic moment.")}`;
  };

  openAddLore = function openAddLoreBuild12(existingId = "") {
    const item = state.lore.find(entry => entry.id === existingId) || {};
    openModal({ eyebrow: "RELATIONSHIP LORE", title: existingId ? "Edit the legend" : "Archive a legend", html: `<form id="loreForm" class="form-grid">
      <div class="two-grid"><div class="field"><label>Icon</label><input name="icon" maxlength="4" value="${escapeHTML(item.icon || "📖")}"></div><div class="field"><label>Category</label><select name="category">${(DATA.loreCategories || []).map(cat=>`<option value="${cat.id}" ${item.category===cat.id?"selected":""}>${cat.icon} ${escapeHTML(cat.label)}</option>`).join("")}</select></div></div>
      <div class="field"><label>Title</label><input name="title" required maxlength="100" value="${escapeHTML(item.title || "")}" placeholder="The Chicken Incident"></div>
      <div class="field"><label>Origin</label><textarea name="origin" required maxlength="1000">${escapeHTML(item.origin || "")}</textarea></div>
      <div class="field"><label>What it means now</label><textarea name="meaning" required maxlength="800">${escapeHTML(item.meaning || "")}</textarea></div>
      <div class="two-grid"><div class="field"><label>Lore established</label><input name="dateEstablished" type="date" value="${escapeHTML(item.dateEstablished || "")}"></div><div class="field"><label>Era</label><select name="eraId"><option value="">Auto / Current</option>${state.eras.map(era=>`<option value="${era.id}" ${item.eraId===era.id?"selected":""}>${escapeHTML(era.emoji)} ${escapeHTML(era.title)}</option>`).join("")}</select></div></div>
      <div class="field"><label>Tags</label><input name="tags" value="${escapeHTML((item.tags || []).join(", "))}" placeholder="Food, Tokyo, Inside Joke"></div>
      <div class="field"><label>Photo (optional)</label><input name="photo" type="file" accept="image/*"></div>
      <button class="button button-primary" type="submit">${existingId ? "Save changes" : "Add to The Lore Book"}</button>
    </form>` });
    document.getElementById("loreForm").addEventListener("submit", async event => {
      event.preventDefault(); const formEl=event.currentTarget; const form=new FormData(formEl); const file=formEl.elements.photo?.files?.[0]; let photo=item.photo || "";
      if (file) { try { photo=await compressImage(file); } catch { toast("Photo could not be processed"); } }
      const payload={ title:String(form.get("title")||"").trim(), origin:String(form.get("origin")||"").trim(), meaning:String(form.get("meaning")||"").trim(), category:String(form.get("category")||"inside-joke"), dateEstablished:String(form.get("dateEstablished")||""), eraId:String(form.get("eraId")||""), tags:String(form.get("tags")||"").split(",").map(v=>v.trim()).filter(Boolean).slice(0,8), icon:String(form.get("icon")||"📖").trim()||"📖", photo };
      if (existingId) Object.assign(item,payload); else state.lore.unshift({ id:uid("l"), ...payload, createdAt:Date.now() });
      saveState(); closeModal(); runtime.memoryTab="lore"; navigate("memories"); toast("Lore archived 📖");
    });
  };

  openLore = function openLoreBuild12(id) {
    const item=state.lore.find(entry=>entry.id===id); if(!item)return; const cat=(DATA.loreCategories||[]).find(c=>c.id===item.category); const era=state.eras.find(e=>e.id===item.eraId);
    openModal({ eyebrow: `${cat?.icon || "📖"} ${cat?.label || "RELATIONSHIP LORE"}`, title:item.title, html:`${item.photo?`<img src="${item.photo}" alt="" style="width:100%;max-height:260px;object-fit:cover;border-radius:20px;margin-bottom:12px">`:""}<article class="card card-pink"><p class="eyebrow">ORIGIN${item.dateEstablished?` · ${featureDate(item.dateEstablished)}`:""}</p><p>${escapeHTML(item.origin)}</p></article><article class="card card-lavender"><p class="eyebrow">CURRENT MEANING</p><p>${escapeHTML(item.meaning)}</p></article>${era?`<span class="pill pill-lavender">${escapeHTML(era.emoji)} ${escapeHTML(era.title)}</span>`:""}<div class="tags" style="margin-top:10px">${(item.tags||[]).map(tag=>`<span class="tag">${escapeHTML(tag)}</span>`).join("")}</div><div class="two-grid" style="margin-top:14px"><button class="button button-secondary" data-action="edit-lore" data-id="${item.id}">Edit</button><button class="button button-ghost" data-action="delete-lore" data-id="${item.id}">Delete</button></div>` });
  };

  // ---------- 8: Our Canon challenges ----------

  renderCanon = function renderCanonBuild12() {
    setFab({ icon: "+", label: "Add canon", action: "add-canon" });
    mainView.innerHTML = `<section class="page">${subviewHeader("OUR CANON", "The official facts of us", "Favorites, sayings, rules, current obsessions — and the occasional challenge.")}
      <div class="memory-list">${state.canon.map(item => `<div class="memory-item canon-item"><div class="memory-thumb">${item.challenge ? "👀" : "📖"}</div><div><h3>${escapeHTML(item.category)}</h3><p>${escapeHTML(item.text)}</p>${item.challenge?`<div class="challenge-box"><small>Challenged by ${escapeHTML(profileById(item.challenge.by).displayName)}</small><strong>Proposed: ${escapeHTML(item.challenge.proposed)}</strong></div>`:""}</div><div class="stack-actions">${item.challenge ? (item.challenge.by !== state.currentUserId ? `<button class="tiny-button" data-action="resolve-canon-accept" data-id="${item.id}">Accept</button><button class="tiny-button" data-action="resolve-canon-keep" data-id="${item.id}">Keep</button>` : `<span class="micro muted">Waiting</span>`) : `<button class="tiny-button" data-action="challenge-canon" data-id="${item.id}">Challenge</button>`}<button class="icon-button" data-action="delete-canon" data-id="${item.id}">×</button></div></div>`).join("") || emptyState("No canon yet", "Declare something official.")}</div>
    </section>`;
  };

  function openCanonChallenge(id) {
    const item=state.canon.find(entry=>entry.id===id); if(!item)return;
    openModal({ eyebrow:"CHALLENGE THE CANON", title:item.category, html:`<form id="canonChallengeForm" class="form-grid"><article class="card card-lavender"><strong>Current:</strong><p>${escapeHTML(item.text)}</p></article><div class="field"><label>Your proposed new answer</label><input name="proposed" required maxlength="200"></div><button class="button button-primary" type="submit">Issue challenge 👀</button></form>` });
    document.getElementById("canonChallengeForm").addEventListener("submit",event=>{event.preventDefault();const form=new FormData(event.currentTarget);item.challenge={by:state.currentUserId,proposed:String(form.get("proposed")||"").trim(),createdAt:Date.now()};saveState();closeModal();render();toast("Canon challenged 👀");});
  }

  // ---------- 9: Accidental Traditions ----------

  function traditionSuggestions() {
    const dismissed=new Set(state.dismissedTraditionSuggestions || []); const existing=new Set(state.traditions.map(item=>normalizeText(item.title))); const suggestions=[];
    const completedGroups={}; state.dateCompletions.forEach(item=>{const key=normalizeText(item.title); if(!key)return; completedGroups[key] ||= {title:item.title,count:0}; completedGroups[key].count+=1;});
    Object.entries(completedGroups).forEach(([key,group])=>{const id=`date:${key}`;if(group.count>=2&&!dismissed.has(id)&&!existing.has(key))suggestions.push({id,title:group.title,count:group.count,reason:`You have done this date ${group.count} times.`});});
    const tagCounts={}; state.memories.forEach(item=>(item.tags||[]).forEach(tag=>{const key=normalizeText(tag);if(!key)return;tagCounts[key] ||= {label:tag,count:0};tagCounts[key].count+=1;}));
    Object.entries(tagCounts).forEach(([key,group])=>{const title=`${group.label} days`;const id=`tag:${key}`;if(group.count>=3&&!dismissed.has(id)&&!existing.has(normalizeText(title)))suggestions.push({id,title,count:group.count,reason:`${group.count} memories share the “${group.label}” tag.`});});
    const places={}; state.memories.forEach(item=>{const key=normalizeText(item.location);if(!key)return;places[key] ||= {label:item.location,count:0};places[key].count+=1;});
    Object.entries(places).forEach(([key,group])=>{const title=`${group.label} dates`;const id=`place:${key}`;if(group.count>=3&&!dismissed.has(id)&&!existing.has(normalizeText(title)))suggestions.push({id,title,count:group.count,reason:`You have saved ${group.count} memories at ${group.label}.`});});
    return suggestions.slice(0,6);
  }

  renderTraditions = function renderTraditionsBuild12() {
    setFab({ icon: "+", label: "Add tradition", action: "add-tradition" }); const suggestions=traditionSuggestions();
    mainView.innerHTML=`<section class="page">${subviewHeader("TRADITIONS", "The little things we keep doing", "Koi can now notice repeated activities and suggest when something might be becoming ‘our thing.’")}
      ${suggestions.length?`<article class="card card-duo"><p class="eyebrow">THIS MIGHT BE BECOMING A THING…</p>${suggestions.map(item=>`<div class="suggestion-row"><div><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.reason)}</small></div><div><button class="tiny-button" data-action="adopt-tradition" data-id="${escapeHTML(item.id)}">Make tradition</button><button class="tiny-button" data-action="dismiss-tradition-suggestion" data-id="${escapeHTML(item.id)}">Not yet</button></div></div>`).join("")}</article>`:""}
      <div class="memory-list">${state.traditions.map(item=>`<div class="memory-item"><div class="memory-thumb">🎀</div><div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.cadence)} · ${item.count} times · since ${escapeHTML(formatShortDate(item.startDate))}${item.source==="suggested"?" · discovered by Koi":""}</p></div><button class="icon-button" data-action="increment-tradition" data-id="${item.id}">+1</button></div>`).join("") || emptyState("No traditions yet","Add something you hope becomes ‘our thing.’")}</div>
    </section>`;
  };

  // ---------- 10: Then vs Now 2.0 ----------

  openAddThenNow = function openAddThenNowBuild12() {
    const future=new Date();future.setMonth(future.getMonth()+6);const revisit=future.toLocaleDateString("en-CA");
    openModal({eyebrow:"THEN VS NOW",title:"Save a question for future-you",html:`<form id="thenNowForm" class="form-grid"><div class="field"><label>Question</label><input name="prompt" required maxlength="220" placeholder="Where do we imagine living in five years?"></div><div class="field"><label>Your answer now</label><textarea name="oldAnswer" required maxlength="900"></textarea></div><div class="field"><label>Ask me again on</label><input name="revisitDate" type="date" value="${revisit}"></div><button class="button button-primary" type="submit">Save for later</button></form>`});
    document.getElementById("thenNowForm").addEventListener("submit",event=>{event.preventDefault();const form=new FormData(event.currentTarget);state.thenNow.unshift({id:uid("tn"),prompt:String(form.get("prompt")||"").trim(),oldDate:todayKey(),oldAnswer:String(form.get("oldAnswer")||"").trim(),revisitDate:String(form.get("revisitDate")||""),newAnswer:"",completedAt:""});saveState();closeModal();render();toast("Future Koi will ask again ✦");});
  };

  renderThenNow = function renderThenNowBuild12() {
    setFab({icon:"+",label:"Add comparison",action:"add-then-now"});
    mainView.innerHTML=`<section class="page">${subviewHeader("THEN VS NOW","See how your answers grow","Your earlier answer stays hidden until you answer again.")}${state.thenNow.map(item=>{const due=!item.revisitDate||item.revisitDate<=todayKey();return `<article class="card card-duo"><div class="section-heading" style="margin:0 0 8px"><p class="eyebrow">THEN · ${escapeHTML(featureDate(item.oldDate))}</p><span class="pill ${due?"pill-pink":"pill-lavender"}">${item.newAnswer?"Compared":due?"Ready":"Revisit "+featureDate(item.revisitDate)}</span></div><h2>${escapeHTML(item.prompt)}</h2>${item.newAnswer?`<div class="answer-grid" style="margin-top:12px"><div class="answer-card is-you"><strong>Then</strong><p>${escapeHTML(item.oldAnswer)}</p></div><div class="answer-card is-partner"><strong>Now</strong><p>${escapeHTML(item.newAnswer)}</p></div></div><button class="button button-secondary button-block" style="margin-top:10px" data-action="revisit-then-now" data-id="${item.id}">Make this the new “then”</button>`:`<div class="answer-card is-locked" style="margin-top:12px"><div><div class="lock-icon">♡</div><p>Your old answer is still hidden.</p><button class="button button-primary" data-action="answer-then-now" data-id="${item.id}">Answer again</button></div></div>`}</article>`;}).join("") || emptyState("Nothing to compare yet","Save a prompt you want future-you to revisit.")}</section>`;
  };

  // ---------- 11: Relationship Eras ----------

  function renderEras() {
    setFab({icon:"+",label:"Add era",action:"add-era"});
    const active=activeEra();
    mainView.innerHTML=`<section class="page">${subviewHeader("OUR ERAS","Versions of us","Name the chapters yourselves — serious, sentimental or completely ridiculous.")}
      ${active?`<article class="card card-duo"><p class="eyebrow">CURRENT ERA</p><h2>${escapeHTML(active.emoji)} ${escapeHTML(active.title)}</h2><p class="small muted">${escapeHTML(active.description||"")}</p></article>`:""}
      <div class="era-grid">${state.eras.slice().sort((a,b)=>(b.startDate||"").localeCompare(a.startDate||"")).map(era=>{const count=state.memories.filter(item=>item.eraId===era.id || (!item.eraId && eraForDate(item.date)?.id===era.id)).length;return `<article class="era-card ${era.id===state.activeEraId?"is-active":""}"><div class="era-emoji">${escapeHTML(era.emoji||"✨")}</div><div><h3>${escapeHTML(era.title)}</h3><p>${escapeHTML(featureDate(era.startDate))}${era.endDate?` – ${escapeHTML(featureDate(era.endDate))}`:" – now"}</p><small>${count} memories · ${escapeHTML(era.description||"")}</small></div><div class="stack-actions">${era.id!==state.activeEraId?`<button class="tiny-button" data-action="set-active-era" data-id="${era.id}">Make current</button>`:`<span class="pill pill-pink">Current</span>`}<button class="tiny-button" data-action="edit-era" data-id="${era.id}">Edit</button></div></article>`;}).join("")}</div>
    </section>`;
  }

  function openEraForm(id="") {
    const era=state.eras.find(item=>item.id===id)||{};
    openModal({eyebrow:"RELATIONSHIP ERA",title:id?"Edit this chapter":"Name this chapter",html:`<form id="eraForm" class="form-grid"><div class="two-grid"><div class="field"><label>Emoji</label><input name="emoji" maxlength="4" value="${escapeHTML(era.emoji||"✨")}"></div><div class="field"><label>Era name</label><input name="title" required maxlength="80" value="${escapeHTML(era.title||"")}" placeholder="Japan Brainrot Era"></div></div><div class="two-grid"><div class="field"><label>Started</label><input name="startDate" type="date" value="${escapeHTML(era.startDate||todayKey())}"></div><div class="field"><label>Ended (optional)</label><input name="endDate" type="date" value="${escapeHTML(era.endDate||"")}"></div></div><div class="field"><label>What was this era?</label><textarea name="description" maxlength="400">${escapeHTML(era.description||"")}</textarea></div><button class="button button-primary" type="submit">Save era</button></form>`});
    document.getElementById("eraForm").addEventListener("submit",event=>{event.preventDefault();const form=new FormData(event.currentTarget);const payload={emoji:String(form.get("emoji")||"✨").trim()||"✨",title:String(form.get("title")||"").trim(),startDate:String(form.get("startDate")||""),endDate:String(form.get("endDate")||""),description:String(form.get("description")||"").trim()};if(id)Object.assign(era,payload);else state.eras.unshift({id:uid("era"),...payload,active:false});saveState();closeModal();render();toast("Era saved ✨");});
  }

  memoryFormHTML = function memoryFormHTMLBuild12(item = {}, { twoSides = false } = {}) {
    const selectedEra=item.eraId || activeEra()?.id || "";
    return `<form id="memoryForm" class="form-grid"><div class="field"><label>Title</label><input name="title" required maxlength="100" value="${escapeHTML(item.title||"")}" placeholder="Coffee date"></div><div class="two-grid"><div class="field"><label>Date</label><input name="date" type="date" value="${escapeHTML(item.date||todayKey())}"></div><div class="field"><label>Location</label><input name="location" maxlength="120" value="${escapeHTML(item.location||"")}" placeholder="Optional"></div></div><div class="field"><label>${twoSides?"Shared context":"Note"}</label><textarea name="note" maxlength="900">${escapeHTML(item.note||"")}</textarea></div><div class="two-grid"><div class="field"><label>Era</label><select name="eraId"><option value="">Auto by date</option>${state.eras.map(era=>`<option value="${era.id}" ${selectedEra===era.id?"selected":""}>${escapeHTML(era.emoji)} ${escapeHTML(era.title)}</option>`).join("")}</select></div><div class="field"><label>Chapter / shelf</label><input name="chapter" maxlength="60" value="${escapeHTML(item.chapter||"Little Days")}"></div></div><div class="field"><label>Tags</label><input name="tags" value="${escapeHTML((item.tags||[]).join(", "))}"></div><div class="field"><label>Photos</label><input name="photos" type="file" accept="image/*" multiple><small>${memoryPhotos(item).length ? `${memoryPhotos(item).length} saved photo${memoryPhotos(item).length === 1 ? "" : "s"}. Select more to add them.` : "Select one or multiple photos. In Koi Cloud, compressed private copies sync to both phones."}</small></div>${twoSides?`<div class="field"><label>Your private side</label><textarea name="side" required maxlength="900">${escapeHTML(item.sides?.[state.currentUserId]?.text||"")}</textarea></div>`:""}<button class="button button-primary" type="submit">Save ${twoSides?"my side":"memory"}</button></form>`;
  };

  bindMemoryForm = function bindMemoryFormBuild12({ type, existingId = "" }) {
    document.getElementById("memoryForm").addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      const files = Array.from(form.elements.photos?.files || []);
      const tags = String(data.get("tags") || "").split(",").map(value => value.trim()).filter(Boolean).slice(0, 8);
      const payload = {
        type,
        title: String(data.get("title") || "").trim(),
        date: String(data.get("date") || ""),
        location: String(data.get("location") || "").trim(),
        note: String(data.get("note") || "").trim(),
        chapter: String(data.get("chapter") || "Little Days").trim(),
        eraId: String(data.get("eraId") || ""),
        tags,
        sideText: type === "two-sides" ? String(data.get("side") || "").trim() : ""
      };

      const cloudMemories = window.KoiCloud?.runtime?.ready && window.KoiCloud?.memories;
      if (cloudMemories) {
        const submitButton = form.querySelector('button[type="submit"]');
        const oldText = submitButton?.textContent;
        if (submitButton) { submitButton.disabled = true; submitButton.textContent = files.length ? "Saving photos…" : "Saving…"; }
        try {
          if (existingId) await window.KoiCloud.memories.update(window.KoiCloud.runtime.pair.id, existingId, payload, files);
          else await window.KoiCloud.memories.create(window.KoiCloud.runtime.pair.id, payload, files);
          closeModal();
          await window.KoiCloud.refreshMemories?.({ quiet: true });
          runtime.memoryTab = type === "two-sides" ? "two-sides" : "memories";
          navigate("memories");
          toast(files.length ? `Saved ${files.length} photo${files.length === 1 ? "" : "s"} to Koi Cloud 💗` : (type === "two-sides" ? "Your side was saved privately" : "Memory saved to both phones 💗"));
          return;
        } catch (error) {
          if (submitButton) { submitButton.disabled = false; submitButton.textContent = oldText || "Save"; }
          toast(error.message || "Could not save this memory");
          return;
        }
      }

      // Local-only fallback: keep one compressed cover photo so old offline demo mode still works.
      const firstFile = files[0];
      let photo = existingId ? state.memories.find(item => item.id === existingId)?.photo || "" : "";
      if (firstFile) {
        try { photo = await compressImage(firstFile); }
        catch { toast("Photo could not be processed"); }
      }
      const localPayload = { ...payload, photo, photos: photo ? [photo] : [] };
      delete localPayload.sideText;
      if (existingId) {
        const item = state.memories.find(entry => entry.id === existingId);
        if (!item) return;
        Object.assign(item, localPayload);
        if (type === "two-sides") {
          item.sides ||= {};
          item.sides[state.currentUserId] = { text: payload.sideText, submittedAt: Date.now() };
        }
      } else {
        const item = { id: uid("m"), ...localPayload, type, icon: type === "two-sides" ? "♡♡" : "💗", createdAt: Date.now() };
        if (type === "two-sides") item.sides = { [state.currentUserId]: { text: payload.sideText, submittedAt: Date.now() } };
        state.memories.unshift(item);
      }
      saveState(); closeModal(); runtime.memoryTab = type === "two-sides" ? "two-sides" : "memories"; navigate("memories");
      toast(type === "two-sides" ? "Your side was saved privately" : "Memory added to Our Museum");
    });
  };

  // ---------- 12: Richer Our Museum ----------

  renderMuseum = function renderMuseumBuild12() {
    const filter=runtime.museumKindFilter || "All";
    const exhibits=[];
    state.memories.forEach(item=>exhibits.push({kind:"memory",id:item.id,title:item.title,date:item.date,eraId:item.eraId,chapter:item.chapter,photo:primaryMemoryPhoto(item),icon:item.icon||"💗",subtitle:item.type==="two-sides"?"Same Moment, Two Sides":item.location||item.chapter||"Memory"}));
    state.lore.forEach(item=>exhibits.push({kind:"lore",id:item.id,title:item.title,date:item.dateEstablished,eraId:item.eraId,chapter:"The Lore Book",photo:item.photo,icon:item.icon||"📖",subtitle:"Relationship Lore"}));
    state.littleThings.forEach(item=>exhibits.push({kind:"little",id:item.id,title:item.text,date:item.date,eraId:"",chapter:"Little Things",photo:"",icon:"💗",subtitle:`Little Thing · ${item.category||"Everyday"}`}));
    const visible=filter==="All"?exhibits:exhibits.filter(item=>filter==="Memories"?item.kind==="memory":filter==="Lore"?item.kind==="lore":item.kind==="little");
    const grouped={}; visible.forEach(item=>{const era=state.eras.find(e=>e.id===item.eraId)||eraForDate(item.date);const key=era?.id||"ungrouped";grouped[key] ||= {era,items:[]};grouped[key].items.push(item);});
    return `<article class="card card-lavender"><p class="eyebrow">OUR MUSEUM</p><h2>Your relationship, curated like it mattered — because it did.</h2><p class="small muted">Memories, Lore and Little Things become exhibits automatically.</p></article><div class="filter-scroll">${["All","Memories","Lore","Little Things"].map(value=>`<button class="filter-chip ${filter===value?"is-active":""}" data-action="museum-filter" data-value="${value}">${value}</button>`).join("")}</div>${Object.values(grouped).map(group=>`<section class="museum-section"><div class="museum-section-title"><div><p class="eyebrow">${group.era?escapeHTML(featureDate(group.era.startDate)):"MISCELLANEOUS"}</p><h2>${group.era?`${escapeHTML(group.era.emoji)} ${escapeHTML(group.era.title)}`:"Other Exhibits"}</h2></div><span class="pill pill-lavender">${group.items.length} exhibits</span></div><div class="museum-grid">${group.items.sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(item=>`<button class="exhibit" data-action="open-exhibit" data-kind="${item.kind}" data-id="${item.id}"><div class="frame">${item.photo?`<img src="${item.photo}" alt="">`:escapeHTML(item.icon)}</div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.subtitle)}</p></button>`).join("")}</div></section>`).join("") || emptyState("Your museum is waiting","Save a memory, lore entry or Little Thing to create your first exhibit.")}`;
  };

  openExhibit = function openExhibitBuild12(kind,id) {
    if(kind==="little"){const item=state.littleThings.find(entry=>entry.id===id);if(!item)return;openModal({eyebrow:"LITTLE THING",title:featureDate(item.date),html:`<article class="card card-pink"><h2>${escapeHTML(item.text)}</h2><p class="small muted">${escapeHTML(item.category||"Everyday")} · saved by ${escapeHTML(profileById(item.userId).displayName)}</p></article>`});return;}
    baseOpenExhibit(kind,id);
  };

  // ---------- 13 + 14: Room progression + Koi mascots ----------

  renderRoom = function renderRoomBuild12() {
    setFab(); const points=relationshipPoints(); const active=new Set(state.room.activeDecor||[]); const unlocked=new Set(roomUnlockedDecor()); const next=nextRoomUnlock(); const unlocks=DATA.roomUnlocks||[]; const month=new Date().getMonth(); const seasonal=month===11?"🎄 Holiday glow":month>=2&&month<=4?"🌸 Spring petals":month>=5&&month<=7?"🌿 Summer light":"🍁 Cozy season";
    mainView.innerHTML=`<section class="page">${subviewHeader("OUR COZY CORNER","Our Room","Every question, memory, date and tiny ritual helps this space grow.",`<span class="pill pill-lavender">Lv. ${roomLevel()}</span>`)}
      <article class="card card-duo"><div class="section-heading" style="margin:0"><div><p class="eyebrow">COZY PROGRESS</p><h2>${points} Koi points</h2></div><span class="pill pill-pink">${seasonal}</span></div><div class="progress-bar" style="margin-top:10px"><span style="width:${next?Math.min(100,points/Number(next.points||1)*100):100}%"></span></div><p class="small muted">${next?`${Math.max(0,next.points-points)} points until ${next.icon} ${escapeHTML(next.label)}.`:"Everything in Build 1.2 is unlocked ✨"}</p></article>
      <div class="room-scene room-scene-v2">${active.has("lights")?`<div class="room-wall-lights">✦ · ✧ · ✦ · ✧ · ✦</div>`:""}${active.has("frame")?`<div class="room-frame">${escapeHTML(state.profiles[0].displayName)} & ${escapeHTML(state.profiles[1].displayName)}<br>our little us</div>`:""}${active.has("moonlamp")?`<div class="moon-lamp">🌙</div>`:""}<div class="room-shelf"></div><div class="room-items"><span>${active.has("books")?"📚":""}</span><span>${active.has("camera")?"📷":""}</span><span>${active.has("plant")?"🪴":""}</span><span>${active.has("souvenir")?"🎟️":""}</span></div><div class="room-floor-items"><span>${active.has("heart")?"💗":""}</span><span>${active.has("plush")?"🧸":""}</span></div>${active.has("pond")?`<div class="room-pond">${renderKoiPair("")}</div>`:`<div class="room-mascot-floating">${renderKoiPair("")}</div>`}</div>
      <article class="card card-pink"><div class="section-heading" style="margin:0"><div><p class="eyebrow">YOUR KOI</p><h2>${escapeHTML(state.room.mascots.pinkName)} + ${escapeHTML(state.room.mascots.lavenderName)}</h2></div><button data-action="edit-mascots">Name them</button></div><p class="small muted">The pink and lavender koi are Koi’s little mascots. They react to milestones and live in your shared room.</p></article>
      <div class="section-heading"><h2>Decor & unlocks</h2><span class="micro muted">tap unlocked items</span></div><div class="decor-grid">${unlocks.map(item=>`<button class="decor-button ${active.has(item.id)?"is-active":""}" data-action="toggle-decor" data-id="${item.id}" ${unlocked.has(item.id)?"":"disabled"}>${item.icon}<br>${escapeHTML(item.label)}${unlocked.has(item.id)?"":` · ${item.points} pts 🔒`}</button>`).join("")}</div>
    </section>`;
  };

  function openMascotNames() {
    openModal({eyebrow:"KOI MASCOTS",title:"Name your two little koi",html:`<form id="mascotForm" class="form-grid"><div class="two-grid"><div class="field"><label>Pink koi</label><input name="pinkName" maxlength="30" value="${escapeHTML(state.room.mascots.pinkName)}"></div><div class="field"><label>Lavender koi</label><input name="lavenderName" maxlength="30" value="${escapeHTML(state.room.mascots.lavenderName)}"></div></div>${renderKoiPair("They stay pink + lavender, just like your Koi motif.")}<button class="button button-primary" type="submit">Save names</button></form>`});
    document.getElementById("mascotForm").addEventListener("submit",event=>{event.preventDefault();const form=new FormData(event.currentTarget);state.room.mascots.pinkName=String(form.get("pinkName")||"Pink Koi").trim();state.room.mascots.lavenderName=String(form.get("lavenderName")||"Lavender Koi").trim();saveState();closeModal();render();toast("Your koi have names 🐟💗");});
  }

  // ---------- Home + Extras + Museum integrations ----------

  renderHome = function renderHomeBuild12() {
    const me=currentProfile(); const partner=partnerProfile(); const question=dailyQuestion(); const record=todayAnswerRecord(); const mine=record[me.id]; const partnerAnswer=record[partner.id]; const reveal=bothAnswered(record); const days=daysBetween(state.pair.anniversary); const lastCheckin=[...state.checkins].reverse().find(item=>item.userId===partner.id); const pack=currentPack(); const latestLittle=state.littleThings[0];
    setFab();
    mainView.innerHTML=`<section class="page"><div class="page-header"><div><p class="eyebrow">TODAY · ${escapeHTML(formatShortDate(todayKey()))}</p><h1>Good ${greeting()}, ${escapeHTML(me.displayName)} 💗</h1><p>One tiny ritual for your little us.</p></div><span class="pill pill-lavender">♡ ${days} days</span></div>
      <article class="card card-duo hero-question"><div class="question-meta"><button class="pill pill-pink interactive-pill" data-action="open-question-packs">${escapeHTML(pack.icon)} ${escapeHTML(pack.label)} ▾</button><span class="pill pill-lavender">${escapeHTML(question.category)}</span></div><h2 class="question-text">${escapeHTML(question.text)}</h2><div class="partner-status">${partnerStatusRow(me,Boolean(mine),true)}${partnerStatusRow(partner,Boolean(partnerAnswer),false)}</div>${reveal?`<div class="answer-grid">${answerCard(me,record[me.id],"is-you")}${answerCard(partner,record[partner.id],"is-partner")}</div><div class="reaction-row">${["💗","🥹","😂","🫶","👀"].map(emoji=>`<button class="reaction-button ${state.reactions[`${todayKey()}_${me.id}`]===emoji?"is-active":""}" data-action="react-answer" data-value="${emoji}">${emoji}</button>`).join("")}</div>`:`<button class="button button-primary button-block" data-action="answer-question">${mine?"Edit my private answer":"Answer privately"} 💌</button><button class="button button-ghost button-block" style="margin-top:8px" data-action="skip-question">Skip this question</button><p class="small muted" style="text-align:center;margin:10px 0 0">Both answers unlock together.</p>`}<div class="inline-actions"><button data-action="open-answer-history">Past answers</button><button data-action="open-question-packs">Question packs</button></div></article>
      <article class="card card-pink mascot-home-card">${renderKoiPair(reveal?"Both koi are doing a tiny victory lap — today’s answers unlocked.":mine?`Your koi is waiting for ${partner.displayName}.`:"Your two little koi are waiting for today’s ritual.")}</article>
      ${lastCheckin?`<article class="card card-lavender"><div class="section-heading" style="margin:0 0 8px"><h2>${escapeHTML(partner.displayName)}’s latest check-in</h2><button data-action="open-checkin">Check in</button></div>${checkinSummary(lastCheckin)}</article>`:""}
      ${latestLittle?`<article class="card"><div class="section-heading" style="margin:0"><div><p class="eyebrow">LATEST LITTLE THING</p><h3>${escapeHTML(latestLittle.text)}</h3></div><button data-action="open-little-things">See all</button></div></article>`:""}
      <div class="section-heading"><h2>Quick access</h2><span class="micro muted">your little world</span></div><div class="quick-grid">${quickCard("💗","Little Things",`${state.littleThings.length} noticed`,"open-little-things")}${quickCard("💌","Date Jar",`${state.dateIdeas.filter(item=>!item.completed).length} ideas waiting`,"open-date-jar")}${quickCard("🛋️","Our Room",`Cozy level ${roomLevel()}`,"open-room")}${quickCard("🏛️","Our Museum",`${state.memories.length+state.lore.length+state.littleThings.length} exhibits`,"open-museum")}${quickCard("📖","Our Answers",`${answeredDays().length} days archived`,"open-answer-history")}${quickCard("☺️","Check-in","Mood, energy & what you need","open-checkin")}</div>
    </section>`;
  };

  renderExtras = function renderExtrasBuild12() {
    if(runtime.extrasView==="room")return renderRoom();
    if(runtime.extrasView==="dateJar")return renderDateJar();
    if(runtime.extrasView==="checkin")return renderCheckin();
    if(runtime.extrasView==="canon")return renderCanon();
    if(runtime.extrasView==="traditions")return renderTraditions();
    if(runtime.extrasView==="thenNow")return renderThenNow();
    if(runtime.extrasView==="answers")return renderAnswerHistory();
    if(runtime.extrasView==="littleThings")return renderLittleThings();
    if(runtime.extrasView==="blindDate")return renderBlindDate();
    if(runtime.extrasView==="predictions")return renderPredictions();
    if(runtime.extrasView==="eras")return renderEras();
    setFab();
    mainView.innerHTML=`<section class="page"><div class="page-header"><div><p class="eyebrow">A LITTLE MAGIC</p><h1>Extras ✦</h1><p>The playful, sentimental and slightly weird parts of Koi.</p></div></div><div class="quick-grid">${quickCard("📖","Our Answers",`${answeredDays().length} archived days`,"open-answer-history")}${quickCard("💗","Little Things",`${state.littleThings.length} tiny moments`,"open-little-things")}${quickCard("💌","Date Jar 2.0",`${state.dateIdeas.length} ideas`,"open-date-jar")}${quickCard("🎲","Blind Date Builder","Match private preferences","open-blind-date")}${quickCard("🔮","I Bet You",`${predictionStats().resolved} rounds`,"open-predictions")}${quickCard("🛋️","Our Room",`Level ${roomLevel()}`,"open-room")}${quickCard("☺️","Check-ins",`${state.checkins.length} saved`,"open-checkin")}${quickCard("📖","Our Canon",`${state.canon.length} official things`,"open-canon")}${quickCard("🎀","Traditions",`${state.traditions.length} rituals`,"open-traditions")}${quickCard("📷","Then vs Now","Past you vs current you","open-then-now")}${quickCard("✨","Our Eras",`${state.eras.length} chapters`,"open-eras")}${quickCard("🏛️","Our Museum","Everything becomes an exhibit","open-museum")}</div><article class="card card-duo" style="margin-top:12px"><p class="eyebrow">KOI BUILD 1.2</p><h2>All fourteen feature concepts are now wired locally.</h2><p class="small muted">The next major architecture step is real authentication + two-person cloud sync. Until then, profile switching remains the safe local test mode.</p></article></section>`;
  };

  // ---------- Event layer for new actions ----------

  document.addEventListener("click", event => {
    const button=event.target.closest("[data-action]"); if(!button)return; const action=button.dataset.action;
    const openExtra=view=>{runtime.route="extras";runtime.extrasView=view;location.hash="extras";render();};

    if(action==="open-question-packs")openQuestionPacks();
    else if(action==="select-question-pack"){state.settings.questionPack=button.dataset.id;delete state.dailyQuestionOverrides[todayKey()];delete state.answers[todayKey()];saveState();closeModal();render();toast(`Question pack: ${currentPack().label}`);}
    else if(action==="add-custom-question"){closeModal();openAddCustomQuestion();}
    else if(action==="open-answer-history")openExtra("answers");
    else if(action==="open-answer-history-detail")openAnswerHistoryDetail(button.dataset.date);
    else if(action==="open-little-things")openExtra("littleThings");
    else if(action==="add-little-thing")openAddLittleThing();
    else if(action==="delete-little-thing"){state.littleThings=state.littleThings.filter(item=>item.id!==button.dataset.id);saveState();render();}
    else if(action==="surprise-little-thing"){const item=state.littleThings[Math.floor(Math.random()*state.littleThings.length)];if(!item){toast("Save a Little Thing first");return;}openModal({eyebrow:"A LITTLE THING",title:featureDate(item.date),html:`<article class="card card-pink"><h2>${escapeHTML(item.text)}</h2><p class="small muted">${escapeHTML(item.category||"Everyday")}</p></article>`});}
    else if(action==="date-filter-v2"){runtime.dateFilters[button.dataset.field]=button.dataset.value;render();}
    else if(action==="complete-date-v2")completeDate(button.dataset.id);
    else if(action==="rate-date-v2")rateDate(button.dataset.id,button.dataset.value);
    else if(action==="undo-date-v2"){const item=state.dateIdeas.find(entry=>entry.id===button.dataset.id);if(item){item.completed=false;item.completedAt="";item.rating="";}saveState();render();}
    else if(action==="open-blind-date")openExtra("blindDate");
    else if(action==="blind-date-preferences")openBlindPreferences();
    else if(action==="reset-blind-date"){state.blindDate={preferences:{u1:null,u2:null},match:null,updatedAt:null};saveState();render();}
    else if(action==="open-predictions")openExtra("predictions");
    else if(action==="new-prediction")openNewPrediction();
    else if(action==="prediction-answer"){const round=state.predictions.find(item=>item.id===button.dataset.id);if(round&&round.targetUserId===state.currentUserId){round.actual=button.dataset.value;round.resolvedAt=Date.now();saveState();render();toast(round.actual===round.guess?"Mind reader! ✨":"Not this time 👀");}}
    else if(action==="lore-filter"){runtime.loreFilter=button.dataset.value;renderMemories();}
    else if(action==="random-lore"){const item=state.lore[Math.floor(Math.random()*state.lore.length)];if(item)openLore(item.id);else toast("Add some Lore first");}
    else if(action==="challenge-canon")openCanonChallenge(button.dataset.id);
    else if(action==="resolve-canon-accept"){const item=state.canon.find(entry=>entry.id===button.dataset.id);if(item?.challenge){item.text=item.challenge.proposed;item.challenge=null;saveState();render();toast("New canon accepted 📖");}}
    else if(action==="resolve-canon-keep"){const item=state.canon.find(entry=>entry.id===button.dataset.id);if(item){item.challenge=null;saveState();render();toast("Original canon stays");}}
    else if(action==="adopt-tradition"){const suggestion=traditionSuggestions().find(item=>item.id===button.dataset.id);if(suggestion){state.traditions.unshift({id:uid("t"),title:suggestion.title,cadence:"Whenever",startDate:todayKey(),count:suggestion.count||1,source:"suggested"});state.dismissedTraditionSuggestions.push(suggestion.id);saveState();render();toast("Koi made it official 🎀");}}
    else if(action==="dismiss-tradition-suggestion"){state.dismissedTraditionSuggestions.push(button.dataset.id);saveState();render();}
    else if(action==="revisit-then-now"){const item=state.thenNow.find(entry=>entry.id===button.dataset.id);if(item?.newAnswer){item.oldAnswer=item.newAnswer;item.oldDate=item.completedAt||todayKey();item.newAnswer="";item.completedAt="";const d=new Date();d.setMonth(d.getMonth()+6);item.revisitDate=d.toLocaleDateString("en-CA");saveState();render();toast("Saved for another future-you ✦");}}
    else if(action==="open-eras")openExtra("eras");
    else if(action==="add-era")openEraForm();
    else if(action==="edit-era")openEraForm(button.dataset.id);
    else if(action==="set-active-era"){state.eras.forEach(era=>era.active=era.id===button.dataset.id);state.activeEraId=button.dataset.id;const era=activeEra();if(era)state.pair.currentEra=era.title;saveState();render();toast("Current era updated ✨");}
    else if(action==="museum-filter"){runtime.museumKindFilter=button.dataset.value;renderMemories();}
    else if(action==="edit-mascots")openMascotNames();
  });

  // Refresh once after the feature layer has migrated local state.
  render();
})();
