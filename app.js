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
const CURRENT_VERSION = 1;

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
    inviteCode: "KOI-LOVE",
    currentEra: "Golden Everyday Era",
    comfortFood: "Ramen",
    song: "Our favorite song",
    nextDate: "",
    nextDateLabel: "Dinner + something fun"
  },
  settings: {
    themePair: "wedding",
    wallpaper: "petals",
    dailyReminder: true,
    weeklyCheckin: true,
    notificationPermissionAsked: false
  },
  dailyQuestionOverrides: {},
  answers: {},
  reactions: {},
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

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  applyTheme();
}

function applyTheme() {
  const theme = THEME_PAIRS[state.settings.themePair] || THEME_PAIRS.wedding;
  const root = document.documentElement;
  root.style.setProperty("--pink", theme.pink);
  root.style.setProperty("--pink-deep", theme.pinkDeep);
  root.style.setProperty("--pink-soft", theme.pinkSoft);
  root.style.setProperty("--lavender", theme.lavender);
  root.style.setProperty("--lavender-deep", theme.lavenderDeep);
  root.style.setProperty("--lavender-soft", theme.lavenderSoft);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.pink);
  appShell.dataset.wallpaper = state.settings.wallpaper || "petals";
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
  const days = daysBetween(state.pair.anniversary);
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
  return `<button class="memory-item" data-action="${action}" data-id="${item.id}" style="width:100%;text-align:left;color:inherit"><div class="memory-thumb">${item.photo ? `<img src="${item.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:15px">` : escapeHTML(item.icon || "💗")}</div><div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(formatDate(item.date))}${item.location ? ` · ${escapeHTML(item.location)}` : ""}</p><div class="tags" style="margin-top:6px">${(item.tags || []).slice(0, 2).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}</div></div><span>›</span></button>`;
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
  setFab();
  mainView.innerHTML = `
    <section class="page">
      <div class="page-header"><div><p class="eyebrow">PERSONALIZE</p><h1>You</h1><p>Make Koi truly yours — but always pink + lavender.</p></div><div class="avatar avatar-lg">${escapeHTML(me.avatar)}</div></div>

      <article class="card">
        <div class="partner-row" style="padding:0;border:0;background:none"><div class="avatar avatar-lg">${escapeHTML(me.avatar)}</div><div><strong style="font-size:16px">${escapeHTML(me.displayName)}</strong><small>Paired with ${escapeHTML(partner.displayName)} · anniversary ${escapeHTML(formatDate(state.pair.anniversary))}</small></div><button class="button button-ghost" data-action="edit-profile" style="min-height:36px;padding:7px 11px">Edit</button></div>
      </article>

      <div class="section-heading"><h2>Our colors</h2><span class="micro muted">two colors, always</span></div>
      <div class="theme-pairs">
        ${Object.entries(THEME_PAIRS).map(([id, theme]) => `<button class="theme-pair ${state.settings.themePair === id ? "is-active" : ""}" data-action="set-theme" data-id="${id}"><div class="swatches"><span class="swatch" style="background:${theme.pink}"></span><span class="swatch" style="background:${theme.lavender}"></span></div><strong>${escapeHTML(theme.label)}</strong></button>`).join("")}
      </div>

      <div class="section-heading"><h2>Wallpaper</h2><span class="micro muted">pink + lavender</span></div>
      <div class="wallpaper-grid">
        ${["petals", "clouds", "ribbon"].map(id => `<button class="wallpaper-tile wallpaper-${id} ${state.settings.wallpaper === id ? "is-active" : ""}" data-action="set-wallpaper" data-id="${id}" aria-label="${id} wallpaper"></button>`).join("")}
      </div>

      <div class="section-heading"><h2>Reminders</h2></div>
      <div class="setting-list">
        ${settingSwitch("Daily question", "A gentle reminder for your daily Koi question", "dailyReminder", state.settings.dailyReminder)}
        ${settingSwitch("Weekly check-in", "A little Sunday relationship pulse", "weeklyCheckin", state.settings.weeklyCheckin)}
        <button class="setting-row" data-action="request-notifications" style="width:100%;text-align:left;color:inherit"><span class="setting-icon">♢</span><div><strong>Browser notifications</strong><small>Ask this device for notification permission.</small></div><span>›</span></button>
      </div>

      <div class="section-heading"><h2>App & data</h2></div>
      <div class="setting-list">
        <button class="setting-row" data-action="install-app" style="width:100%;text-align:left;color:inherit"><span class="setting-icon">＋</span><div><strong>Install Koi</strong><small>Add this PWA to your home screen when supported.</small></div><span>›</span></button>
        <button class="setting-row" data-action="export-data" style="width:100%;text-align:left;color:inherit"><span class="setting-icon">⇩</span><div><strong>Export my Koi data</strong><small>Download a JSON backup of Build 1.</small></div><span>›</span></button>
        <button class="setting-row" data-action="import-data" style="width:100%;text-align:left;color:inherit"><span class="setting-icon">⇧</span><div><strong>Import Koi backup</strong><small>Restore a compatible JSON file.</small></div><span>›</span></button>
        <button class="setting-row" data-action="reset-data" style="width:100%;text-align:left;color:inherit"><span class="setting-icon">×</span><div><strong>Reset local Build 1</strong><small>Deletes Koi data saved on this device.</small></div><span>›</span></button>
      </div>

      <article class="card card-lavender" style="margin-top:14px"><p class="eyebrow">PRIVACY IN BUILD 1</p><h3>Local-only prototype</h3><p class="small muted">Nothing is sent to a backend in this version. A real two-person app will need authentication, pair-level authorization, database sync and secure media storage before release.</p></article>
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
  openModal({ eyebrow: "OUR DETAILS", title: "Edit our little us", html: `
    <form id="editUsForm" class="form-grid">
      <div class="field"><label>Anniversary / start date</label><input name="anniversary" type="date" value="${escapeHTML(state.pair.anniversary)}"></div>
      <div class="field"><label>Current era</label><input name="currentEra" value="${escapeHTML(state.pair.currentEra)}" maxlength="80"></div>
      <div class="two-grid"><div class="field"><label>Comfort food</label><input name="comfortFood" value="${escapeHTML(state.pair.comfortFood)}"></div><div class="field"><label>Our song</label><input name="song" value="${escapeHTML(state.pair.song)}"></div></div>
      <div class="field"><label>Next date</label><input name="nextDate" type="date" value="${escapeHTML(state.pair.nextDate)}"></div>
      <div class="field"><label>Next date label</label><input name="nextDateLabel" value="${escapeHTML(state.pair.nextDateLabel)}"></div>
      <button class="button button-primary" type="submit">Save</button>
    </form>` });
  document.getElementById("editUsForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    ["anniversary", "currentEra", "comfortFood", "song", "nextDate", "nextDateLabel"].forEach(key => state.pair[key] = String(form.get(key) || "").trim());
    saveState(); closeModal(); render(); toast("Our details updated");
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
    ${item.photo ? `<img src="${item.photo}" alt="" style="width:100%;max-height:280px;object-fit:cover;border-radius:20px;margin-bottom:12px">` : `<div class="frame" style="margin-bottom:12px">${escapeHTML(item.icon || "💗")}</div>`}
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
    ${item.photo ? `<img src="${item.photo}" alt="" style="width:100%;max-height:260px;object-fit:cover;border-radius:20px;margin-bottom:12px">` : `<div class="frame" style="margin-bottom:12px">${escapeHTML(item.icon || "♡♡")}</div>`}
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
  openModal({ eyebrow: "PROFILES", title: "The two of you", html: `<form id="profileForm" class="form-grid"><div class="two-grid"><div class="field"><label>Your emoji</label><input name="myAvatar" maxlength="4" value="${escapeHTML(me.avatar)}"></div><div class="field"><label>Your name</label><input name="myName" maxlength="40" value="${escapeHTML(me.displayName)}"></div></div><div class="two-grid"><div class="field"><label>Partner emoji</label><input name="partnerAvatar" maxlength="4" value="${escapeHTML(partner.avatar)}"></div><div class="field"><label>Partner name</label><input name="partnerName" maxlength="40" value="${escapeHTML(partner.displayName)}"></div></div><button class="button button-primary" type="submit">Save profiles</button></form>` });
  document.getElementById("profileForm").addEventListener("submit", event => { event.preventDefault(); const form = new FormData(event.currentTarget); me.displayName = String(form.get("myName") || "You").trim(); me.avatar = String(form.get("myAvatar") || "🌷").trim(); partner.displayName = String(form.get("partnerName") || "Love").trim(); partner.avatar = String(form.get("partnerAvatar") || "☁️").trim(); saveState(); closeModal(); render(); toast("Profiles updated"); });
}

async function compressImage(file, maxDimension = 1200, quality = 0.76) {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  width = Math.round(width * scale); height = Math.round(height * scale);
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d"); context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", quality);
}

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
  else if (action === "set-theme") { state.settings.themePair = button.dataset.id; saveState(); render(); }
  else if (action === "set-wallpaper") { state.settings.wallpaper = button.dataset.id; saveState(); render(); }
  else if (action === "request-notifications") requestNotifications();
  else if (action === "install-app") installApp();
  else if (action === "export-data") exportData();
  else if (action === "import-data") importData();
  else if (action === "edit-profile") openEditProfile();
  else if (action === "reset-data") { if (confirm("Reset all Koi Build 1 data on this device?")) { localStorage.removeItem(STORAGE_KEY); state = clone(DEFAULT_STATE); state.onboardingComplete = false; saveState(); showOnboarding(); render(); } }
});

document.addEventListener("change", event => {
  const input = event.target.closest('[data-action="toggle-setting"]');
  if (!input) return;
  state.settings[input.dataset.key] = input.checked;
  saveState();
  toast("Preference saved");
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
    anniversary: state.pair.anniversary || "",
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
    onboardingStepEl.innerHTML = `<article class="card card-duo"><p class="eyebrow">A PRIVATE SPACE FOR TWO</p><h2>Keep the tiny things.</h2><p class="small muted">Daily questions, two-sided memories, relationship lore, your museum, your room, your date jar — all in one soft little place.</p></article><div class="tags"><span class="tag">Local-first Build 1</span><span class="tag">Pink + lavender</span><span class="tag">Offline PWA</span></div>`;
  } else if (step === 1) {
    onboardingStepEl.innerHTML = `<div class="form-grid"><div class="two-grid"><div class="field"><label>Your emoji</label><input id="obMyAvatar" maxlength="4" value="${escapeHTML(runtime.onboardingDraft.myAvatar)}"></div><div class="field"><label>Your name</label><input id="obMyName" maxlength="40" value="${escapeHTML(runtime.onboardingDraft.myName)}" placeholder="Your name"></div></div><div class="two-grid"><div class="field"><label>Their emoji</label><input id="obPartnerAvatar" maxlength="4" value="${escapeHTML(runtime.onboardingDraft.partnerAvatar)}"></div><div class="field"><label>Their name</label><input id="obPartnerName" maxlength="40" value="${escapeHTML(runtime.onboardingDraft.partnerName)}" placeholder="Partner name"></div></div><div class="field"><label>Your anniversary / relationship start date</label><input id="obAnniversary" type="date" value="${escapeHTML(runtime.onboardingDraft.anniversary)}"></div></div>`;
  } else {
    onboardingStepEl.innerHTML = `<article class="card card-lavender"><p class="eyebrow">BUILD 1 NOTE</p><h2>Both people can be tested on this device.</h2><p class="small muted">Use the profile switch inside the <strong>Us</strong> tab to act as either partner. That lets you test locked answers and Two Sides before real cloud sync is connected.</p></article><article class="card card-pink"><p class="small">Your data stays in this browser’s local storage for now. Use <strong>You → Export my Koi data</strong> for backups.</p></article>`;
  }
}

function collectOnboardingStep() {
  if (runtime.onboardingStep !== 1) return true;
  runtime.onboardingDraft.myName = document.getElementById("obMyName").value.trim();
  runtime.onboardingDraft.partnerName = document.getElementById("obPartnerName").value.trim();
  runtime.onboardingDraft.myAvatar = document.getElementById("obMyAvatar").value.trim() || "🌷";
  runtime.onboardingDraft.partnerAvatar = document.getElementById("obPartnerAvatar").value.trim() || "☁️";
  runtime.onboardingDraft.anniversary = document.getElementById("obAnniversary").value;
  if (!runtime.onboardingDraft.myName || !runtime.onboardingDraft.partnerName) { toast("Add both names first"); return false; }
  return true;
}

onboardingNextBtn.addEventListener("click", () => {
  if (!collectOnboardingStep()) return;
  if (runtime.onboardingStep < 2) { runtime.onboardingStep += 1; renderOnboardingStep(); return; }
  state.profiles[0].displayName = runtime.onboardingDraft.myName || "You";
  state.profiles[0].avatar = runtime.onboardingDraft.myAvatar || "🌷";
  state.profiles[1].displayName = runtime.onboardingDraft.partnerName || "Love";
  state.profiles[1].avatar = runtime.onboardingDraft.partnerAvatar || "☁️";
  state.pair.anniversary = runtime.onboardingDraft.anniversary || todayKey();
  state.pair.inviteCode = `KOI-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  state.onboardingComplete = true;
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