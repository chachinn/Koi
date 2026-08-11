/*
  Koi 💗 — Step 24: Koi World
  A broad two-person expansion built on Koi's pair-scoped cloud feature store.
  Shared rows sync through Supabase; private/scheduled/round rows are redacted by RPC.
*/
(() => {
  "use strict";

  if (typeof state === "undefined" || typeof runtime === "undefined") return;
  state.worldItems ||= [];
  runtime.worldView ||= "";

  const legacyRenderExtras = renderExtras;
  const legacyRenderHome = renderHome;
  const legacyRenderRoom = renderRoom;
  const legacyNavigate = navigate;
  navigate = function navigateKoiWorld(route) {
    if (route === "extras") runtime.worldView = "";
    return legacyNavigate(route);
  };
  let doodleCanvas = null;
  let doodleContext = null;

  const THIS_OR_THAT = [
    ["Cozy night in", "Dressed-up night out"],
    ["Beach", "Mountains"],
    ["Sweet", "Salty"],
    ["Morning date", "Late-night date"],
    ["Plan everything", "Be spontaneous"],
    ["City trip", "Nature escape"],
    ["Movie marathon", "Game night"],
    ["Fancy dinner", "Street food crawl"]
  ];

  const LIKELY_TO = [
    "forget where they put their phone",
    "cry during a movie",
    "plan a surprise date",
    "buy snacks we did not need",
    "fall asleep first",
    "take 40 photos of the same thing",
    "say 'I'm not hungry' then steal fries",
    "suggest a spontaneous trip"
  ];

  const BINGO_TASKS = [
    "Take a photo together", "Try a new food", "Give a random compliment",
    "Have a no-phone hour", "Do a tiny favor", "Watch something together",
    "Plan a future date", "Share a favorite memory", "Make each other laugh"
  ];

  const SIMPLE = {
    loveNotes: {
      key: "love_note", visibility: "pair", icon: "💌", eyebrow: "CONNECT", title: "Love Notes",
      description: "Little messages intentionally sent to your person.",
      button: "Write a love note",
      fields: [
        { name: "title", label: "Title", placeholder: "For you, just because" },
        { name: "message", label: "Note", type: "textarea", required: true, placeholder: "Write something soft..." }
      ]
    },
    openWhen: {
      key: "open_when", visibility: "pair", icon: "✉️", eyebrow: "CONNECT", title: "Open When…",
      description: "Letters for the exact moment your person needs them.",
      button: "Add an Open When",
      fields: [
        { name: "title", label: "Open when…", required: true, placeholder: "you miss me" },
        { name: "message", label: "Letter", type: "textarea", required: true }
      ]
    },
    thingsLove: {
      key: "things_i_love", visibility: "pair", icon: "💗", eyebrow: "CONNECT", title: "Things I Love About You",
      description: "A growing collection of the tiny and huge reasons.",
      button: "Add one thing",
      fields: [{ name: "message", label: "I love…", type: "textarea", required: true, placeholder: "the way you..." }]
    },
    reasonsChosen: {
      key: "reasons_chosen", visibility: "pair", icon: "🫶", eyebrow: "CONNECT", title: "Reasons I Chose You",
      description: "The deeper reasons your person is your person.",
      button: "Add a reason",
      fields: [{ name: "message", label: "Reason", type: "textarea", required: true }]
    },
    timeline: {
      key: "timeline", icon: "🕰️", eyebrow: "OUR STORY", title: "Relationship Timeline",
      description: "Milestones and chapters in one chronological story.",
      button: "Add milestone",
      sort: "date",
      fields: [
        { name: "title", label: "Milestone", required: true, placeholder: "First trip together" },
        { name: "date", label: "Date", type: "date", required: true },
        { name: "note", label: "Tiny note", type: "textarea" }
      ]
    },
    firsts: {
      key: "our_firsts", icon: "🌱", eyebrow: "OUR STORY", title: "Our Firsts",
      description: "First date, first trip, first home — whatever matters to you.",
      button: "Add a first",
      sort: "date",
      fields: [
        { name: "title", label: "Our first…", required: true, placeholder: "concert together" },
        { name: "date", label: "Date", type: "date" },
        { name: "note", label: "What do you remember?", type: "textarea" }
      ]
    },
    bucket: {
      key: "bucket_list", icon: "✨", eyebrow: "TOGETHER", title: "Things We Want To Do",
      description: "A shared bucket list for dates, travel, life, and ridiculous ideas.",
      button: "Add to our list",
      fields: [
        { name: "title", label: "Thing to do", required: true, placeholder: "See the northern lights" },
        { name: "category", label: "Category", type: "select", options: ["Date", "Travel", "Food", "Life", "Silly", "Someday"] },
        { name: "status", label: "Status", type: "select", options: ["Want to do", "Planning", "Done"] }
      ]
    },
    places: {
      key: "places_to_go", icon: "📍", eyebrow: "TOGETHER", title: "Places We Want To Go",
      description: "Restaurants, cafés, cities, parks, and tiny places worth remembering.",
      button: "Save a place",
      fields: [
        { name: "title", label: "Place", required: true, placeholder: "A café in Kamakura" },
        { name: "location", label: "Where", placeholder: "Kamakura, Japan" },
        { name: "note", label: "Why we saved it", type: "textarea" }
      ]
    },
    watch: {
      key: "watch_together", icon: "🎬", eyebrow: "TOGETHER", title: "Watch Together",
      description: "Movies, anime, series, and the things you swear you'll finish someday.",
      button: "Add something",
      fields: [
        { name: "title", label: "Title", required: true },
        { name: "status", label: "Status", type: "select", options: ["Want to watch", "Watching", "Finished", "Dropped 😂"] },
        { name: "rating", label: "Our rating", placeholder: "9/10" }
      ]
    },
    eat: {
      key: "eat_together", icon: "🍜", eyebrow: "TOGETHER", title: "Eat Together",
      description: "Food and restaurants you want to try together.",
      button: "Add food/place",
      fields: [
        { name: "title", label: "Food or restaurant", required: true },
        { name: "location", label: "Where" },
        { name: "note", label: "Notes", type: "textarea" }
      ]
    },
    giftHints: {
      key: "gift_hint", visibility: "pair", icon: "🎁", eyebrow: "TOGETHER", title: "Gift Hints",
      description: "A low-pressure 'if you're ever wondering what I like' list.",
      button: "Add a hint",
      ownerOnlyView: true,
      fields: [
        { name: "title", label: "Thing I would love", required: true },
        { name: "details", label: "Size / color / details", type: "textarea" }
      ]
    },
    tripTogether: {
      key: "mini_trip", icon: "✈️", eyebrow: "TOGETHER", title: "Trip Together",
      description: "A light couples trip board without rebuilding your full travel planner.",
      button: "Add a trip",
      sort: "startDate",
      fields: [
        { name: "title", label: "Destination", required: true, placeholder: "Tokyo" },
        { name: "startDate", label: "Start", type: "date", futureAllowed: true },
        { name: "endDate", label: "End", type: "date", futureAllowed: true },
        { name: "note", label: "Plan / ideas", type: "textarea" }
      ]
    },
    favorites: {
      key: "favorite", visibility: "pair", icon: "⭐", eyebrow: "KNOW ME", title: "Favorites",
      description: "Useful things your person should never have to guess.",
      button: "Add a favorite",
      fields: [
        { name: "category", label: "Category", type: "select", options: ["Food", "Snack", "Drink", "Color", "Flower", "Restaurant", "Character", "Perfume", "Clothing", "Shoe size", "Other"] },
        { name: "value", label: "Favorite / detail", required: true }
      ]
    },
    obsessions: {
      key: "obsession", visibility: "pair", icon: "✨", eyebrow: "KNOW ME", title: "Current Obsessions",
      description: "The temporary stuff you're currently very normal about. Probably.",
      button: "Add obsession",
      fields: [
        { name: "category", label: "Category", type: "select", options: ["Song", "Food", "Game", "Show", "Anime", "Hobby", "Place", "Other"] },
        { name: "value", label: "Current obsession", required: true }
      ]
    }
  };

  function cloud() { return window.KoiCloud || null; }
  function cloudReady() { return Boolean(cloud()?.runtime?.ready && cloud()?.world); }
  function myOwnerId() { return cloud()?.runtime?.session?.user?.id || `local:${state.currentUserId}`; }
  function partnerOwnerId() {
    const me = myOwnerId();
    const member = (cloud()?.runtime?.members || []).find(item => item.user_id !== me);
    return member?.user_id || `local:${partnerProfile().id}`;
  }
  function ownerName(ownerId) {
    const member = (cloud()?.runtime?.members || []).find(item => item.user_id === ownerId);
    if (member) return member.display_name || "Partner";
    if (ownerId === myOwnerId()) return currentProfile().displayName;
    if (ownerId === partnerOwnerId()) return partnerProfile().displayName;
    return "Partner";
  }
  function ownerAvatar(ownerId) {
    const member = (cloud()?.runtime?.members || []).find(item => item.user_id === ownerId);
    if (member) return member.avatar || "💗";
    if (ownerId === myOwnerId()) return currentProfile().avatar;
    return partnerProfile().avatar;
  }
  function worldRows(key) { return (state.worldItems || []).filter(item => item.feature_key === key); }
  function rowTime(row) { return new Date(row.created_at || row.updated_at || Date.now()).getTime(); }
  function latestRow(key, predicate = () => true) {
    return worldRows(key).filter(predicate).sort((a, b) => rowTime(b) - rowTime(a))[0] || null;
  }
  function dateText(value) {
    if (!value) return "";
    const raw = String(value).slice(0, 10);
    return formatDate(raw);
  }
  function monthKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
  function todayMonthDay() { return todayKey().slice(5); }
  function makeLocalId() { return `local_world_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

  function worldDatePickerHTML(prefix, value = "", { required = false, futureYears = 15, pastYears = 80 } = {}) {
    const [year = "", month = "", day = ""] = String(value || "").slice(0, 10).split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const nowYear = new Date().getFullYear();
    const req = required ? "required" : "";
    const monthOptions = months.map((label, index) => { const val=String(index+1).padStart(2,"0"); return `<option value="${val}" ${month===val?"selected":""}>${label}</option>`; }).join("");
    const dayOptions = Array.from({length:31},(_,i)=>{const val=String(i+1).padStart(2,"0");return `<option value="${val}" ${day===val?"selected":""}>${i+1}</option>`;}).join("");
    const years = Array.from({length:pastYears+futureYears+1},(_,i)=>nowYear+futureYears-i);
    const yearOptions = years.map(val=>`<option value="${val}" ${String(val)===year?"selected":""}>${val}</option>`).join("");
    return `<div class="compact-date-picker world-date-picker"><select name="${prefix}Month" ${req}><option value="">Month</option>${monthOptions}</select><select name="${prefix}Day" ${req}><option value="">Day</option>${dayOptions}</select><select name="${prefix}Year" ${req}><option value="">Year</option>${yearOptions}</select></div>`;
  }

  function readWorldDate(data, prefix, { required = false, allowFuture = true } = {}) {
    const month=String(data.get(`${prefix}Month`)||""); const day=String(data.get(`${prefix}Day`)||""); const year=String(data.get(`${prefix}Year`)||"");
    if(!month&&!day&&!year&&!required)return "";
    if(!month||!day||!year)throw new Error("Choose the month, day, and year.");
    const iso=`${year}-${month}-${day}`; const date=new Date(`${iso}T12:00:00`);
    if(Number.isNaN(date.getTime())||date.getFullYear()!==Number(year)||date.getMonth()+1!==Number(month)||date.getDate()!==Number(day))throw new Error("That date is not valid.");
    if(!allowFuture&&date>new Date())throw new Error("That date cannot be in the future.");
    return iso;
  }

  async function refreshWorld() {
    if (cloudReady() && cloud()?.refreshWorld) await cloud().refreshWorld({ quiet: true });
    else render();
  }

  async function worldSave(options) {
    if (cloudReady()) {
      const id = await cloud().world.save(options);
      await refreshWorld();
      return id;
    }

    const ownerId = myOwnerId();
    const visibility = options.visibility || "shared";
    let existing = options.id ? state.worldItems.find(row => row.id === options.id) : null;
    if (!existing && options.slotKey) {
      existing = state.worldItems.find(row => row.feature_key === options.featureKey && row.slot_key === options.slotKey && (visibility === "shared" || row.owner_id === ownerId));
    }
    if (existing) {
      Object.assign(existing, {
        title: options.title || "",
        payload: clone(options.payload || {}),
        visibility,
        reveal_at: options.revealAt || null,
        slot_key: options.slotKey || null,
        updated_at: new Date().toISOString()
      });
      saveState(); render(); return existing.id;
    }
    const id = makeLocalId();
    state.worldItems.unshift({
      id, pair_id: state.pair.pairId, feature_key: options.featureKey, slot_key: options.slotKey || null,
      owner_id: ownerId, recipient_id: options.recipientId || null, title: options.title || "",
      payload: clone(options.payload || {}), visibility, reveal_at: options.revealAt || null,
      locked: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    });
    saveState(); render(); return id;
  }

  async function worldRemove(id) {
    if (cloudReady()) {
      await cloud().world.remove(id);
      await refreshWorld();
      return;
    }
    state.worldItems = state.worldItems.filter(row => row.id !== id);
    saveState(); render();
  }

  function worldBackButton() {
    return `<button class="button button-ghost" data-world-action="back" style="min-height:36px;padding:7px 12px;margin-bottom:12px">← Extras</button>`;
  }

  function worldHeader(eyebrow, title, copy, extra = "") {
    return `<div class="page-header"><div><p class="eyebrow">${escapeHTML(eyebrow)}</p><h1>${escapeHTML(title)}</h1><p>${escapeHTML(copy)}</p></div>${extra}</div>${worldBackButton()}`;
  }

  function featureTile(icon, title, copy, view) {
    return `<button class="world-feature-card" type="button" data-world-view="${escapeHTML(view)}"><span class="world-feature-icon">${icon}</span><span><strong>${escapeHTML(title)}</strong><small>${escapeHTML(copy)}</small></span><b>›</b></button>`;
  }

  function actionTile(icon, title, copy, action) {
    return `<button class="world-feature-card" type="button" data-action="${escapeHTML(action)}"><span class="world-feature-icon">${icon}</span><span><strong>${escapeHTML(title)}</strong><small>${escapeHTML(copy)}</small></span><b>›</b></button>`;
  }

  function category(title, subtitle, cards, open = false) {
    return `<details class="world-category" ${open ? "open" : ""}><summary><span><strong>${escapeHTML(title)}</strong><small>${escapeHTML(subtitle)}</small></span><b>⌄</b></summary><div class="world-feature-list">${cards.join("")}</div></details>`;
  }

  function worldCategoryDefinitions() {
    return {
      daily: {
        icon: "💗", title: "Daily Us", subtitle: "The things you can open every day",
        cards: [
          actionTile("📖", "Daily Questions", "Your private daily ritual", "open-answer-history"),
          actionTile("💗", "Little Things", "Notice the tiny things", "open-little-things"),
          actionTile("☺️", "Check-ins", "Mood, energy, and what you need", "open-checkin"),
          featureTile("💭", "Thinking of You", "Send a one-tap heart", "thinking"),
          featureTile("☺️", "Mood Bubble", "Share how you're doing", "mood"),
          featureTile("📷", "Daily Photo", "One photo each, side by side", "dailyPhoto"),
          featureTile("✍️", "One-Line Today", "A one-sentence daily diary", "oneLine"),
          featureTile("💌", "Love Notes", "A mailbox just for you two", "loveNotes"),
          featureTile("🫙", "Compliment Jar", "Collect sweet little notes", "compliments"),
          featureTile("✉️", "Open When…", "Letters for specific moments", "openWhen"),
          featureTile("💗", "Things I Love About You", "Keep adding reasons", "thingsLove"),
          featureTile("🫶", "Reasons I Chose You", "The deeper list", "reasonsChosen")
        ]
      },
      play: {
        icon: "🎮", title: "Play Together", subtitle: "Games, guesses, and silly little rituals",
        cards: [
          featureTile("↔️", "This or That", "Choose separately, reveal together", "thisOrThat"),
          featureTile("👀", "Who's More Likely To…", "Vote, then compare", "likelyTo"),
          featureTile("🧠", "Who Knows Who Better?", "Guess your person's answer", "whoKnows"),
          featureTile("▦", "Couple Bingo", "A shared monthly 3×3", "bingo"),
          featureTile("🎨", "Draw for Me", "Send a tiny doodle", "draw"),
          actionTile("🔮", "I Bet You", "Your prediction game", "open-predictions"),
          actionTile("🎲", "Blind Date Builder", "Match private preferences", "open-blind-date")
        ]
      },
      story: {
        icon: "📖", title: "Our Story", subtitle: "Memories, milestones, and your relationship archive",
        cards: [
          featureTile("🕰️", "Relationship Timeline", "Milestones in order", "timeline"),
          featureTile("🌱", "Our Firsts", "First dates, trips, homes, everything", "firsts"),
          featureTile("🔒", "Time Capsules", "Lock something for future-you", "timeCapsules"),
          featureTile("🔮", "Future Us", "Answer now, revisit later", "futureUs"),
          featureTile("📅", "On This Day", "See old memories from today's date", "onThisDay"),
          featureTile("🌙", "Monthly Koi Recap", "A tiny recap of your month", "monthlyRecap"),
          featureTile("🎧", "Relationship Wrapped", "Your year in Koi", "wrapped"),
          featureTile("📍", "Memory Map", "Your memories grouped by place", "memoryMap"),
          featureTile("🖼️", "Photo Collections", "Make little albums", "collections"),
          featureTile("🎞️", "Photo of Us", "Resurface a forgotten photo", "photoOfUs"),
          actionTile("📖", "Relationship Lore", "The legends of your relationship", "open-museum"),
          actionTile("✨", "Our Eras", "Name your chapters", "open-eras"),
          actionTile("🎀", "Traditions", "The rituals that became yours", "open-traditions"),
          actionTile("📷", "Then vs Now", "See how answers change", "open-then-now")
        ]
      },
      together: {
        icon: "🍓", title: "Together", subtitle: "Shared lists, dates, food, shows, and plans",
        cards: [
          featureTile("✨", "Things We Want To Do", "Your shared bucket list", "bucket"),
          featureTile("📍", "Places We Want To Go", "Save cafés, cities, and tiny spots", "places"),
          featureTile("🎬", "Watch Together", "Movies, anime, shows", "watch"),
          featureTile("🍜", "Eat Together", "Foods and restaurants to try", "eat"),
          featureTile("🎁", "Gift Hints", "Make gift-giving easier", "giftHints"),
          featureTile("✈️", "Trip Together", "A lightweight couples trip board", "tripTogether"),
          actionTile("💌", "Date Jar", "Pick something to do together", "open-date-jar")
        ]
      },
      know: {
        icon: "🫧", title: "Know Me", subtitle: "The useful manual for loving each other well",
        cards: [
          featureTile("📘", "My Manual", "What helps, what doesn't, what I need", "manual"),
          featureTile("⭐", "Favorites", "Food, flowers, sizes, everything", "favorites"),
          featureTile("✨", "Current Obsessions", "What you're into right now", "obsessions")
        ]
      },
      future: {
        icon: "🌙", title: "Private & Future", subtitle: "Distance, surprises, secrets, and later",
        cards: [
          featureTile("⏳", "Next Time We See Each Other", "A reunion countdown", "nextSee"),
          featureTile("🕓", "Our Time Zones", "Keep both local times together", "timezones"),
          featureTile("🔐", "Secret Memory", "Lock a memory until a date", "secretMemory"),
          featureTile("📝", "Private Draft", "Write it before you're ready to send", "privateDraft"),
          featureTile("🎁", "Surprise Mode", "Plan something without spoilers", "surprise")
        ]
      },
      world: {
        icon: "🏠", title: "Our World", subtitle: "Your shared room, museum, and little Koi life",
        cards: [
          actionTile("🛋️", "Our Room", "Decor, koi, and Koi Hearts", "open-room"),
          actionTile("🏛️", "Our Museum", "Everything becomes an exhibit", "open-museum")
        ]
      }
    };
  }

  function worldCategoryButton(key, config) {
    return `<button class="world-category-tile" type="button" data-world-category="${escapeHTML(key)}">
      <span class="world-category-tile-icon">${config.icon}</span>
      <span class="world-category-tile-copy"><strong>${escapeHTML(config.title)}</strong><small>${escapeHTML(config.subtitle)}</small></span>
      <span class="world-category-count">${config.cards.length}</span>
    </button>`;
  }

  function renderWorldCategory(key) {
    const config = worldCategoryDefinitions()[key];
    if (!config) return renderWorldLanding();
    setFab();
    mainView.innerHTML = `<section class="page world-page world-category-page">
      ${worldHeader("KOI WORLD", `${config.icon} ${config.title}`, config.subtitle)}
      <div class="world-feature-list world-category-feature-list">${config.cards.join("")}</div>
    </section>`;
  }

  function renderWorldLanding() {
    setFab();
    const categories = worldCategoryDefinitions();
    mainView.innerHTML = `<section class="page world-page world-landing-clean">
      <div class="page-header world-clean-header"><div><p class="eyebrow">YOUR LITTLE WORLD</p><h1>Koi World ✦</h1><p>Everything you two do together, without making you hunt through one giant list.</p></div></div>

      <article class="card card-duo world-today-clean">
        <div class="section-heading" style="margin:0"><div><p class="eyebrow">QUICK ACCESS</p><h2>What do you feel like doing?</h2></div></div>
        <div class="world-quick-grid">
          <button type="button" data-world-view="thinking"><span>💗</span><strong>Thinking of You</strong></button>
          <button type="button" data-world-view="mood"><span>☺️</span><strong>Mood</strong></button>
          <button type="button" data-action="open-date-jar"><span>💌</span><strong>Date Jar</strong></button>
          <button type="button" data-world-view="photoOfUs"><span>🎞️</span><strong>Photo of Us</strong></button>
        </div>
      </article>

      <div class="world-section-label"><div><p class="eyebrow">EXPLORE</p><h2>Choose a space</h2></div><small>${Object.values(categories).reduce((sum, item) => sum + item.cards.length, 0)} features</small></div>
      <div class="world-category-grid">${Object.entries(categories).map(([key, config]) => worldCategoryButton(key, config)).join("")}</div>
    </section>`;
  }

  function setWorldView(view) {
    runtime.route = "extras";
    runtime.extrasView = "";
    runtime.worldView = view;
    location.hash = "extras";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderOwnerChip(row) {
    return `<span class="world-owner"><span>${escapeHTML(ownerAvatar(row.owner_id))}</span>${escapeHTML(ownerName(row.owner_id))}</span>`;
  }

  function simpleValue(payload, config) {
    const preferred = config.fields.find(field => field.type === "textarea")?.name || config.fields[0]?.name;
    return payload?.[preferred] || payload?.title || "";
  }

  function fieldHTML(field, value = "") {
    const required = field.required ? "required" : "";
    if (field.type === "textarea") return `<div class="field"><label>${escapeHTML(field.label)}</label><textarea name="${field.name}" ${required} maxlength="1800" placeholder="${escapeHTML(field.placeholder || "")}">${escapeHTML(value || "")}</textarea></div>`;
    if (field.type === "date") return `<div class="field"><label>${escapeHTML(field.label)}</label>${worldDatePickerHTML(`world_${field.name}`, value, { required: field.required, futureYears: field.futureAllowed ? 15 : 0 })}</div>`;
    if (field.type === "select") return `<div class="field"><label>${escapeHTML(field.label)}</label><select name="${field.name}" ${required}>${(field.options || []).map(option => `<option ${String(value) === option ? "selected" : ""}>${escapeHTML(option)}</option>`).join("")}</select></div>`;
    return `<div class="field"><label>${escapeHTML(field.label)}</label><input name="${field.name}" ${required} maxlength="240" value="${escapeHTML(value || "")}" placeholder="${escapeHTML(field.placeholder || "")}"></div>`;
  }

  function openSimpleForm(view, row = null) {
    const config = SIMPLE[view];
    if (!config) return;
    const payload = row?.payload || {};
    openModal({ eyebrow: config.eyebrow, title: row ? `Edit ${config.title}` : config.button, html: `<form id="worldSimpleForm" class="form-grid" data-view="${escapeHTML(view)}" data-id="${escapeHTML(row?.id || "")}">${config.fields.map(field => fieldHTML(field, payload[field.name])).join("")}<button class="button button-primary" type="submit">${row ? "Save changes" : config.button}</button></form>` });
  }

  function renderSimple(view) {
    const config = SIMPLE[view];
    if (!config) return renderWorldLanding();
    let rows = worldRows(config.key);
    if (config.sort) rows = rows.slice().sort((a, b) => String(a.payload?.[config.sort] || "").localeCompare(String(b.payload?.[config.sort] || "")));
    setFab({ icon: "+", label: config.button, action: "world-simple-add" });
    mainView.innerHTML = `<section class="page world-page">${worldHeader(config.eyebrow, `${config.icon} ${config.title}`, config.description, `<span class="pill pill-lavender">${rows.length}</span>`)}
      <div class="world-stack">${rows.map(row => {
        const payload = row.payload || {};
        const title = payload.title || row.title || simpleValue(payload, config);
        const meta = config.fields.filter(field => field.name !== "title" && field.type !== "textarea" && payload[field.name]).map(field => payload[field.name]).join(" · ");
        const body = config.fields.filter(field => field.type === "textarea" && payload[field.name]).map(field => `<p>${escapeHTML(payload[field.name])}</p>`).join("");
        return `<article class="card world-item-card"><div class="section-heading" style="margin:0"><div>${renderOwnerChip(row)}<h3>${escapeHTML(title || config.title)}</h3>${meta ? `<small class="muted">${escapeHTML(meta)}</small>` : ""}</div>${row.owner_id===myOwnerId()||row.visibility==="shared"?`<button class="tiny-button" data-world-action="edit-simple" data-view="${escapeHTML(view)}" data-id="${row.id}">Edit</button>`:""}</div>${body}<div class="world-item-footer"><small>${escapeHTML(dateText(row.created_at))}</small>${row.owner_id===myOwnerId()||row.visibility==="shared"?`<button class="world-delete" data-world-action="delete" data-id="${row.id}">Delete</button>`:""}</div></article>`;
      }).join("") || emptyState(`No ${config.title.toLowerCase()} yet`, config.description)}</div>
    </section>`;
  }

  function renderThinking() {
    const rows = worldRows("thinking").slice(0, 30);
    const partnerPings = rows.filter(row => row.owner_id === partnerOwnerId()).length;
    setFab();
    mainView.innerHTML = `<section class="page world-page">${worldHeader("CONNECT", "💭 Thinking of You", "No message required. Just a tiny heart across two phones.", `<span class="pill pill-pink">${partnerPings} from them</span>`)}
      <button class="thinking-button" data-world-action="send-thinking"><span>💗</span><strong>Thinking of you</strong><small>Tap to send a tiny ping</small></button>
      <div class="world-stack" style="margin-top:14px">${rows.map(row => `<article class="card world-ping">${renderOwnerChip(row)}<strong>sent a little 💗</strong><small>${new Date(row.created_at).toLocaleString()}</small></article>`).join("") || emptyState("No heart pings yet", "The first one takes exactly one tap.")}</div>
    </section>`;
  }

  function renderMood() {
    const moods = worldRows("mood").filter(row => String(row.slot_key || "").startsWith("current:"));
    const mine = moods.find(row => row.owner_id === myOwnerId());
    const theirs = moods.find(row => row.owner_id === partnerOwnerId());
    setFab();
    mainView.innerHTML = `<section class="page world-page">${worldHeader("CONNECT", "☺️ Mood Bubble", "A tiny current-status bubble for your person.")}
      <div class="answer-grid">${[mine, theirs].map((row, index) => `<article class="answer-card ${index === 0 ? "is-you" : "is-partner"}"><strong>${index === 0 ? "You" : escapeHTML(partnerProfile().displayName)}</strong><div class="mood-big">${escapeHTML(row?.payload?.emoji || "○")}</div><p>${escapeHTML(row?.payload?.note || (row ? "Mood shared" : "No mood yet"))}</p>${row ? `<small>${new Date(row.updated_at || row.created_at).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</small>` : ""}</article>`).join("")}</div>
      <article class="card"><p class="eyebrow">HOW ARE YOU?</p><div class="world-mood-row">${["🥰","😊","😴","😭","😤","🫠"].map(emoji => `<button data-world-action="set-mood" data-value="${emoji}">${emoji}</button>`).join("")}</div><div class="field" style="margin-top:12px"><label>Optional tiny note</label><input id="worldMoodNote" maxlength="120" value="${escapeHTML(mine?.payload?.note || "")}" placeholder="Long day, but okay 💗"></div></article>
    </section>`;
  }

  function renderOneLine() {
    const rows = worldRows("one_line").filter(row => String(row.slot_key || "").startsWith(`${todayKey()}:`));
    const mine = rows.find(row => row.owner_id === myOwnerId());
    const theirs = rows.find(row => row.owner_id === partnerOwnerId());
    setFab();
    mainView.innerHTML = `<section class="page world-page">${worldHeader("CONNECT", "✍️ One-Line Today", "One sentence each. A whole relationship diary over time.", `<span class="pill pill-lavender">${formatShortDate(todayKey())}</span>`)}
      <div class="answer-grid">${[mine, theirs].map((row, index) => `<article class="answer-card ${index === 0 ? "is-you" : "is-partner"}"><strong>${index === 0 ? "You" : escapeHTML(partnerProfile().displayName)}</strong><p>${escapeHTML(row?.payload?.text || "Waiting for today's line…")}</p></article>`).join("")}</div>
      <article class="card"><form id="oneLineForm" class="form-grid"><div class="field"><label>Your line today</label><input name="text" required maxlength="180" value="${escapeHTML(mine?.payload?.text || "")}" placeholder="Today felt like..."></div><button class="button button-primary" type="submit">Save today's line</button></form></article>
      <div class="section-heading"><h2>Recent days</h2></div><div class="world-stack">${worldRows("one_line").filter(row => !String(row.slot_key || "").startsWith(`${todayKey()}:`)).slice(0, 20).map(row => `<article class="card world-item-card"><div>${renderOwnerChip(row)}<strong>${escapeHTML(row.payload?.text || "")}</strong></div><small>${escapeHTML(String(row.slot_key || "").split(":")[0])}</small></article>`).join("") || `<p class="small muted">Your one-line diary starts today.</p>`}</div>
    </section>`;
  }

  function dailyPhotoRows() {
    return (state.memories || []).filter(item => (item.tags || []).includes("Daily Photo") && item.date === todayKey());
  }

  function renderDailyPhoto() {
    const rows = dailyPhotoRows();
    const meCloud = myOwnerId();
    const mine = rows.find(item => item.createdByCloudId === meCloud) || rows.find(item => item.createdByLocalId === state.currentUserId);
    const partner = rows.find(item => item !== mine);
    setFab();
    const photoCard = (item, label) => `<article class="daily-photo-slot"><div class="daily-photo-frame">${item?.photo ? `<img src="${escapeHTML(item.photo)}" alt="${escapeHTML(label)} daily photo">` : `<span>📷</span>`}</div><strong>${escapeHTML(label)}</strong><p>${escapeHTML(item?.note || (item ? "" : "Waiting for a photo…"))}</p></article>`;
    mainView.innerHTML = `<section class="page world-page">${worldHeader("CONNECT", "📷 Daily Photo", "One photo each. Two little windows into the same day.", `<span class="pill pill-pink">${formatShortDate(todayKey())}</span>`)}
      <div class="daily-photo-grid">${photoCard(mine, "You")}${photoCard(partner, partnerProfile().displayName)}</div>
      ${mine ? `<article class="card card-pink"><strong>Your photo is in 💗</strong><p class="small muted">Your person can add theirs from their phone.</p></article>` : `<article class="card"><form id="dailyPhotoForm" class="form-grid"><div class="field"><label>Today's photo</label><input type="file" name="photo" accept="image/*" required></div><div class="field"><label>Caption</label><input name="caption" maxlength="160" placeholder="Tiny context..."></div><button class="button button-primary" type="submit">Add today's photo</button></form></article>`}
    </section>`;
  }

  function renderCompliments() {
    const rows = worldRows("compliment");
    const partnerRows = rows.filter(row => row.owner_id === partnerOwnerId());
    setFab({ icon: "+", label: "Add compliment", action: "world-add-compliment" });
    mainView.innerHTML = `<section class="page world-page">${worldHeader("CONNECT", "🫙 Compliment Jar", "Drop compliments in whenever they occur to you.", `<span class="pill pill-pink">${rows.length} inside</span>`)}
      <button class="jar-button" data-world-action="pick-compliment"><span>🫙</span><strong>Pick one for me</strong><small>${partnerRows.length ? "Reveal a random compliment from your person" : "Your person's compliments will appear here"}</small></button>
      <div id="complimentReveal"></div>
      <div class="world-stack" style="margin-top:14px">${rows.filter(row => row.owner_id === myOwnerId()).map(row => `<article class="card world-item-card"><div>${renderOwnerChip(row)}<p>${escapeHTML(row.payload?.message || "")}</p></div><button class="world-delete" data-world-action="delete" data-id="${row.id}">Delete</button></article>`).join("") || `<p class="small muted">Compliments you add stay visible here. Your person's jar stays a surprise until you draw one.</p>`}</div>
    </section>`;
  }

  function onThisDayMemories() {
    const md = todayMonthDay();
    return (state.memories || []).filter(item => item.date && item.date.slice(5) === md && item.date !== todayKey()).sort((a,b) => String(b.date).localeCompare(String(a.date)));
  }

  function renderOnThisDay() {
    const rows = onThisDayMemories();
    setFab();
    mainView.innerHTML = `<section class="page world-page">${worldHeader("OUR STORY", "📅 On This Day", "Koi resurfaces things that happened on this date in earlier years.")}
      <div class="world-stack">${rows.map(item => `<article class="card on-this-day-card">${item.photo ? `<img src="${escapeHTML(item.photo)}" alt="">` : `<div class="memory-thumb">${escapeHTML(item.icon || "💗")}</div>`}<div><p class="eyebrow">${escapeHTML(item.date.slice(0,4))}</p><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.note || item.location || "")}</p></div></article>`).join("") || emptyState("Nothing from this date yet", "Once Koi has more years of memories, this becomes quietly magical.")}</div>
    </section>`;
  }

  function renderPhotoOfUs() {
    const rows = (state.memories || []).filter(item => item.photo);
    const item = rows.length ? rows[Math.floor(Math.random() * rows.length)] : null;
    setFab();
    mainView.innerHTML = `<section class="page world-page">${worldHeader("OUR STORY", "🎞️ Photo of Us", "A random photo Koi thinks deserves another look.")}
      ${item ? `<article class="card photo-resurface"><img src="${escapeHTML(item.photo)}" alt=""><p class="eyebrow">${escapeHTML(dateText(item.date))}</p><h2>${escapeHTML(item.title)}</h2><p>${escapeHTML(item.note || item.location || "")}</p><button class="button button-secondary button-block" data-world-action="reshuffle-photo">Show me another</button></article>` : emptyState("No cloud photos yet", "Add photos to Memories and Koi will resurface them here.")}
    </section>`;
  }

  function renderMemoryMap() {
    const grouped = {};
    (state.memories || []).filter(item => item.location).forEach(item => { grouped[item.location] ||= []; grouped[item.location].push(item); });
    const groups = Object.entries(grouped).sort((a,b) => b[1].length - a[1].length);
    setFab();
    mainView.innerHTML = `<section class="page world-page">${worldHeader("OUR STORY", "📍 Memory Map", "A place-based view of everywhere your story has happened.", `<span class="pill pill-lavender">${groups.length} places</span>`)}
      <div class="memory-map-board">${groups.map(([place, items], index) => `<article class="memory-pin-card" style="--pin-shift:${(index % 3) - 1}"><span class="memory-pin">📍</span><div><h3>${escapeHTML(place)}</h3><p>${items.length} ${items.length === 1 ? "memory" : "memories"}</p><div class="mini-photo-row">${items.filter(item => item.photo).slice(0,3).map(item => `<img src="${escapeHTML(item.photo)}" alt="">`).join("")}</div></div></article>`).join("") || emptyState("Your map is empty", "Add a location to Memories and the pins will begin appearing.")}</div>
    </section>`;
  }

  function openCollectionForm(row = null) {
    const selected = new Set(row?.payload?.memoryIds || []);
    openModal({ eyebrow: "PHOTO COLLECTIONS", title: row ? "Edit album" : "Make an album", html: `<form id="collectionForm" class="form-grid" data-id="${escapeHTML(row?.id || "")}"><div class="field"><label>Album name</label><input name="title" required maxlength="100" value="${escapeHTML(row?.title || row?.payload?.title || "")}" placeholder="Japan together"></div><div class="field"><label>Choose memories</label><div class="memory-check-list">${(state.memories || []).map(item => `<label><input type="checkbox" name="memoryIds" value="${item.id}" ${selected.has(item.id) ? "checked" : ""}><span>${item.photo ? `<img src="${escapeHTML(item.photo)}" alt="">` : `<b>${escapeHTML(item.icon || "💗")}</b>`}<em>${escapeHTML(item.title)}</em></span></label>`).join("") || `<p class="small muted">Add a memory first.</p>`}</div></div><button class="button button-primary" type="submit">Save album</button></form>` });
  }

  function renderCollections() {
    const rows = worldRows("photo_collection");
    setFab({ icon: "+", label: "New album", action: "world-new-collection" });
    mainView.innerHTML = `<section class="page world-page">${worldHeader("OUR STORY", "🖼️ Photo Collections", "Turn memories into little albums.", `<span class="pill pill-lavender">${rows.length} albums</span>`)}
      <div class="collection-grid">${rows.map(row => {
        const ids = row.payload?.memoryIds || [];
        const memories = (state.memories || []).filter(item => ids.includes(item.id));
        const cover = memories.find(item => item.photo)?.photo;
        return `<article class="collection-card"><button class="collection-cover" data-world-action="open-collection" data-id="${row.id}">${cover ? `<img src="${escapeHTML(cover)}" alt="">` : `<span>🖼️</span>`}</button><div><h3>${escapeHTML(row.title || "Album")}</h3><p>${memories.length} memories</p><div class="inline-actions"><button data-world-action="edit-collection" data-id="${row.id}">Edit</button><button data-world-action="delete" data-id="${row.id}">Delete</button></div></div></article>`;
      }).join("") || emptyState("No albums yet", "Group favorite memories into little collections.")}</div>
    </section>`;
  }

  function openCollection(row) {
    const ids = row?.payload?.memoryIds || [];
    const memories = (state.memories || []).filter(item => ids.includes(item.id));
    openModal({ eyebrow: "PHOTO COLLECTION", title: row?.title || "Album", html: `<div class="museum-grid">${memories.map(item => `<button class="exhibit" data-action="open-exhibit" data-kind="memory" data-id="${item.id}"><div class="frame">${item.photo ? `<img src="${escapeHTML(item.photo)}" alt="">` : escapeHTML(item.icon || "💗")}</div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(dateText(item.date))}</p></button>`).join("") || `<p class="small muted">This album is empty.</p>`}</div>` });
  }

  function renderMonthlyRecap() {
    const key = monthKey();
    const memories = (state.memories || []).filter(item => String(item.date || "").startsWith(key));
    const little = (state.littleThings || []).filter(item => String(item.date || "").startsWith(key));
    const world = (state.worldItems || []).filter(row => String(row.created_at || "").startsWith(key));
    const datesDone = (state.dateCompletions || []).filter(item => String(item.completedAt || item.date || "").startsWith(key));
    const photoCount = memories.reduce((sum, item) => sum + memoryPhotos(item).length, 0);
    const monthName = new Date().toLocaleDateString(undefined, { month:"long", year:"numeric" });
    setFab();
    mainView.innerHTML = `<section class="page world-page">${worldHeader("OUR STORY", `🌙 Our ${monthName}`, "A tiny automatic recap from what you saved in Koi.")}
      <article class="card recap-card"><div class="recap-number"><strong>${memories.length}</strong><span>memories</span></div><div class="recap-number"><strong>${little.length}</strong><span>little things</span></div><div class="recap-number"><strong>${photoCount}</strong><span>photos</span></div><div class="recap-number"><strong>${datesDone.length}</strong><span>dates done</span></div></article>
      <article class="card card-duo"><p class="eyebrow">THIS MONTH IN KOI</p><h2>${world.length} tiny interactions</h2><p>${worldRows("thinking").filter(row => String(row.created_at || "").startsWith(key)).length} “thinking of you” pings · ${worldRows("love_note").filter(row => String(row.created_at || "").startsWith(key)).length} love notes · ${worldRows("one_line").filter(row => String(row.slot_key || "").startsWith(key)).length} one-line entries.</p></article>
      ${memories[0] ? `<article class="card"><p class="eyebrow">LATEST MEMORY</p><h2>${escapeHTML(memories[0].title)}</h2><p>${escapeHTML(memories[0].note || memories[0].location || "")}</p></article>` : ""}
    </section>`;
  }

  function renderWrapped() {
    const year = String(new Date().getFullYear());
    const memories = (state.memories || []).filter(item => String(item.date || "").startsWith(year));
    const little = (state.littleThings || []).filter(item => String(item.date || "").startsWith(year));
    const world = (state.worldItems || []).filter(row => String(row.created_at || "").startsWith(year));
    const places = {};
    memories.forEach(item => { if (item.location) places[item.location] = (places[item.location] || 0) + 1; });
    const topPlace = Object.entries(places).sort((a,b) => b[1]-a[1])[0];
    const moodCounts = {};
    worldRows("mood_history").forEach(row => { const e=row.payload?.emoji; if(e) moodCounts[e]=(moodCounts[e]||0)+1; });
    const topMood = Object.entries(moodCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || "💗";
    setFab();
    mainView.innerHTML = `<section class="page world-page wrapped-page">${worldHeader("OUR STORY", `🎧 ${year} Relationship Wrapped`, "Your year, according to the little things you kept.")}
      <article class="wrapped-hero"><span>KOI WRAPPED</span><strong>${year}</strong><p>${escapeHTML(state.profiles[0].displayName)} + ${escapeHTML(state.profiles[1].displayName)}</p></article>
      <div class="wrapped-grid"><article><strong>${memories.length}</strong><span>memories</span></article><article><strong>${little.length}</strong><span>little things</span></article><article><strong>${world.length}</strong><span>Koi interactions</span></article><article><strong>${topMood}</strong><span>mood of the era</span></article></div>
      <article class="card card-pink"><p class="eyebrow">MOST REMEMBERED PLACE</p><h2>${escapeHTML(topPlace?.[0] || "Still waiting for more adventures")}</h2><p>${topPlace ? `${topPlace[1]} memories happened here.` : "Add locations to Memories to unlock this."}</p></article>
      <article class="card card-lavender"><p class="eyebrow">THE YEAR IN ONE LINE</p><h2>${memories.length + little.length + world.length} pieces of your little us were kept.</h2></article>
    </section>`;
  }

  function scheduledConfig(view) {
    return {
      timeCapsules: { key:"time_capsule", eyebrow:"OUR STORY", icon:"🔒", title:"Time Capsules", description:"Write something now and lock it until a future date.", button:"Make a time capsule", teaser:"A time capsule is waiting 💗", label:"Message to future-us" },
      secretMemory: { key:"secret_memory", eyebrow:"AWAY & FUTURE", icon:"🔐", title:"Secret Memory", description:"Keep a memory sealed until the date feels right.", button:"Lock a secret memory", teaser:"A secret memory is waiting 🔐", label:"The memory" },
      surprise: { key:"surprise", eyebrow:"AWAY & FUTURE", icon:"🎁", title:"Surprise Mode", description:"Plan something without giving away the details.", button:"Plan a surprise", teaser:"Your person planned something 💗", label:"The surprise plan" }
    }[view];
  }

  function openScheduledForm(view) {
    const cfg = scheduledConfig(view); if (!cfg) return;
    openModal({ eyebrow: cfg.eyebrow, title: cfg.button, html: `<form id="scheduledForm" class="form-grid" data-view="${view}"><div class="field"><label>Title</label><input name="title" required maxlength="120" placeholder="For our next anniversary"></div><div class="field"><label>${escapeHTML(cfg.label)}</label><textarea name="message" required maxlength="2400"></textarea></div>${view === "surprise" ? `<div class="field"><label>Teaser your person can see now</label><input name="teaser" maxlength="160" placeholder="I planned something for us 💗"></div>` : ""}<div class="field"><label>Reveal date</label>${worldDatePickerHTML("worldReveal", "", { required:true, futureYears:20, pastYears:0 })}</div><button class="button button-primary" type="submit">Lock it 🔒</button></form>` });
  }

  function renderScheduled(view) {
    const cfg = scheduledConfig(view); if (!cfg) return;
    const rows = worldRows(cfg.key);
    setFab({ icon:"+", label:cfg.button, action:"world-scheduled-add" });
    mainView.innerHTML = `<section class="page world-page">${worldHeader(cfg.eyebrow, `${cfg.icon} ${cfg.title}`, cfg.description, `<span class="pill pill-lavender">${rows.length}</span>`)}
      <div class="world-stack">${rows.map(row => `<article class="card ${row.locked ? "locked-world-card" : "world-item-card"}"><div class="section-heading" style="margin:0"><div>${renderOwnerChip(row)}<h3>${escapeHTML(row.title || cfg.title)}</h3></div><span class="pill ${row.locked ? "pill-lavender" : "pill-pink"}">${row.locked ? "Locked" : "Open"}</span></div>${row.locked ? `<div class="locked-world-message">🔒<p>${escapeHTML(row.payload?.teaser || cfg.teaser)}</p><small>Opens ${escapeHTML(dateText(row.reveal_at))}</small></div>` : `<p>${escapeHTML(row.payload?.message || "")}</p><small>${row.reveal_at ? `Reveal date: ${escapeHTML(dateText(row.reveal_at))}` : ""}</small>`}${row.owner_id === myOwnerId() ? `<div class="world-item-footer"><span></span><button class="world-delete" data-world-action="delete" data-id="${row.id}">Delete</button></div>` : ""}</article>`).join("") || emptyState(`No ${cfg.title.toLowerCase()} yet`, cfg.description)}</div>
    </section>`;
  }

  function renderPrivateDraft() {
    const rows = worldRows("private_draft").filter(row => row.owner_id === myOwnerId());
    setFab({ icon:"+", label:"New draft", action:"world-new-draft" });
    mainView.innerHTML = `<section class="page world-page">${worldHeader("AWAY & FUTURE", "📝 Private Draft", "Write something before you're ready to send. Only your account can read these.", `<span class="pill pill-lavender">${rows.length}</span>`)}
      <div class="world-stack">${rows.map(row => `<article class="card world-item-card"><h3>${escapeHTML(row.title || "Untitled draft")}</h3><p>${escapeHTML(row.payload?.message || "")}</p><div class="world-item-footer"><small>Only you</small><button class="world-delete" data-world-action="delete" data-id="${row.id}">Delete</button></div></article>`).join("") || emptyState("No drafts", "A private place to write before you hit send.")}</div>
    </section>`;
  }

  function renderManual() {
    const rows = worldRows("manual").filter(row => String(row.slot_key || "").startsWith("profile:"));
    const mine = rows.find(row => row.owner_id === myOwnerId());
    const theirs = rows.find(row => row.owner_id === partnerOwnerId());
    const card = (row, fallbackName) => `<article class="card manual-card"><div class="section-heading" style="margin:0"><h2>${escapeHTML(row ? ownerName(row.owner_id) : fallbackName)}'s manual</h2>${row?.owner_id === myOwnerId() ? `<button class="tiny-button" data-world-action="edit-manual">Edit</button>` : ""}</div>${row ? `<dl><dt>When I'm stressed</dt><dd>${escapeHTML(row.payload?.stressed || "—")}</dd><dt>What helps</dt><dd>${escapeHTML(row.payload?.helps || "—")}</dd><dt>What doesn't help</dt><dd>${escapeHTML(row.payload?.notHelpful || "—")}</dd><dt>What makes me feel loved</dt><dd>${escapeHTML(row.payload?.loved || "—")}</dd><dt>Comfort thing</dt><dd>${escapeHTML(row.payload?.comfort || "—")}</dd></dl>` : `<p class="small muted">Not filled out yet.</p>`}</article>`;
    setFab();
    mainView.innerHTML = `<section class="page world-page">${worldHeader("KNOW ME", "📘 My Manual", "A practical cheat sheet for loving each other well.")}<div class="world-stack">${card(mine,"You")}${card(theirs,partnerProfile().displayName)}</div>${mine ? "" : `<button class="button button-primary button-block" data-world-action="edit-manual">Write my manual</button>`}</section>`;
  }

  function openManualForm() {
    const mine = worldRows("manual").find(row => row.owner_id === myOwnerId() && String(row.slot_key || "").startsWith("profile:"));
    const p = mine?.payload || {};
    openModal({ eyebrow:"MY MANUAL", title:"How to love me well", html:`<form id="manualForm" class="form-grid"><div class="field"><label>When I'm stressed…</label><textarea name="stressed" maxlength="700">${escapeHTML(p.stressed || "")}</textarea></div><div class="field"><label>What helps me</label><textarea name="helps" maxlength="700">${escapeHTML(p.helps || "")}</textarea></div><div class="field"><label>What doesn't help</label><textarea name="notHelpful" maxlength="700">${escapeHTML(p.notHelpful || "")}</textarea></div><div class="field"><label>What makes me feel loved</label><textarea name="loved" maxlength="700">${escapeHTML(p.loved || "")}</textarea></div><div class="field"><label>My comfort thing</label><input name="comfort" maxlength="180" value="${escapeHTML(p.comfort || "")}"></div><button class="button button-primary" type="submit">Save my manual</button></form>` });
  }

  function renderNextSee() {
    const row = latestRow("next_see", row => row.slot_key === "current");
    const date = row?.payload?.date || "";
    const now = new Date();
    const target = date ? new Date(`${date}T12:00:00`) : null;
    const diff = target ? Math.max(0, target - now) : 0;
    const days = target ? Math.floor(diff/86400000) : 0;
    const hours = target ? Math.floor((diff%86400000)/3600000) : 0;
    setFab();
    mainView.innerHTML = `<section class="page world-page">${worldHeader("AWAY & FUTURE", "⏳ Next Time We See Each Other", "A little countdown for days you have to be apart.")}
      ${date ? `<article class="countdown-card"><span>UNTIL WE'RE TOGETHER</span><strong>${days}</strong><b>days</b><p>${hours} hours · ${escapeHTML(dateText(date))}</p></article>` : `<article class="card card-lavender"><h2>No countdown right now 💗</h2><p>Set one whenever one of you is away.</p></article>`}
      <article class="card"><form id="nextSeeForm" class="form-grid"><div class="field"><label>Next time we see each other</label>${worldDatePickerHTML("worldNextSee", date, { futureYears:10, pastYears:0 })}</div><div class="field"><label>Little label</label><input name="label" maxlength="120" value="${escapeHTML(row?.payload?.label || "")}" placeholder="Home again 💗"></div><button class="button button-primary" type="submit">Save countdown</button></form></article>
    </section>`;
  }

  function offsetTime(offset) {
    const value = Number(offset || 0);
    const utc = Date.now() + new Date().getTimezoneOffset() * 60000;
    return new Date(utc + value * 3600000).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
  }

  function renderTimezones() {
    const rows = worldRows("timezone").filter(row => String(row.slot_key || "").startsWith("profile:"));
    const mine = rows.find(row => row.owner_id === myOwnerId());
    const theirs = rows.find(row => row.owner_id === partnerOwnerId());
    const zoneCard = (row, name) => `<article class="timezone-card"><span>${escapeHTML(row?.payload?.city || name)}</span><strong>${escapeHTML(offsetTime(row?.payload?.offset || 0))}</strong><small>UTC${Number(row?.payload?.offset || 0) >= 0 ? "+" : ""}${escapeHTML(row?.payload?.offset ?? 0)}</small></article>`;
    setFab();
    mainView.innerHTML = `<section class="page world-page">${worldHeader("AWAY & FUTURE", "🕓 Our Time Zones", "Useful when one of you travels.")}<div class="timezone-grid">${zoneCard(mine,"You")}${zoneCard(theirs,partnerProfile().displayName)}</div><article class="card"><form id="timezoneForm" class="form-grid"><div class="field"><label>Your current city</label><input name="city" required maxlength="100" value="${escapeHTML(mine?.payload?.city || "")}" placeholder="Iloilo"></div><div class="field"><label>Your UTC offset</label><select name="offset">${Array.from({length:27},(_,i)=>i-12).map(value => `<option value="${value}" ${Number(mine?.payload?.offset ?? 8)===value?"selected":""}>UTC${value>=0?"+":""}${value}</option>`).join("")}</select></div><button class="button button-primary" type="submit">Update my time zone</button></form></article></section>`;
  }

  function latestRound(key) { return worldRows(key).sort((a,b) => rowTime(b)-rowTime(a))[0] || null; }
  function roundAnswers(key, roundId) { return worldRows(key).filter(row => row.slot_key === roundId); }

  function renderThisOrThat() {
    const round = latestRound("round_this_or_that");
    const answers = round ? roundAnswers("answer_this_or_that", round.id) : [];
    const mine = answers.find(row => row.owner_id === myOwnerId());
    const both = answers.filter(row => !row.locked && row.payload?.answer).length >= 2;
    const options = round?.payload?.options || [];
    setFab({ icon:"+", label:"New round", action:"world-new-this-or-that" });
    mainView.innerHTML = `<section class="page world-page">${worldHeader("PLAY", "↔️ This or That", "Choose separately. Your choices reveal when both answer.")}
      ${round ? `<article class="card card-duo game-card"><p class="eyebrow">THIS OR THAT</p><h2>${escapeHTML(options[0] || "Option A")} <span>or</span> ${escapeHTML(options[1] || "Option B")}</h2>${both ? `<div class="answer-grid">${answers.filter(a=>a.payload?.answer).map(row => `<div class="answer-card ${row.owner_id===myOwnerId()?"is-you":"is-partner"}"><strong>${escapeHTML(ownerName(row.owner_id))}</strong><p>${escapeHTML(row.payload.answer)}</p></div>`).join("")}</div>` : mine ? `<div class="locked-world-message">♡<p>Your answer is tucked away.</p><small>${answers.some(row=>row.owner_id!==myOwnerId()) ? "Your person answered too — refreshing reveal…" : "Waiting for your person."}</small></div>` : `<div class="game-options">${options.map(option => `<button data-world-action="answer-this-or-that" data-round="${round.id}" data-value="${escapeHTML(option)}">${escapeHTML(option)}</button>`).join("")}</div>`}</article>` : emptyState("No round yet", "Start one and Koi will keep both choices private until both answer.")}
    </section>`;
  }

  function renderLikelyTo() {
    const round = latestRound("round_likely_to");
    const answers = round ? roundAnswers("answer_likely_to", round.id) : [];
    const mine = answers.find(row => row.owner_id === myOwnerId());
    const both = answers.filter(row => !row.locked && row.payload?.answer).length >= 2;
    setFab({ icon:"+", label:"New round", action:"world-new-likely" });
    mainView.innerHTML = `<section class="page world-page">${worldHeader("PLAY", "👀 Who's More Likely To…", "Vote privately, then see whether you agree.")}
      ${round ? `<article class="card card-duo game-card"><p class="eyebrow">WHO'S MORE LIKELY TO</p><h2>${escapeHTML(round.payload?.prompt || "...")}?</h2>${both ? `<div class="answer-grid">${answers.filter(a=>a.payload?.answer).map(row => `<div class="answer-card ${row.owner_id===myOwnerId()?"is-you":"is-partner"}"><strong>${escapeHTML(ownerName(row.owner_id))}</strong><p>voted ${escapeHTML(ownerName(row.payload.answer))}</p></div>`).join("")}</div>` : mine ? `<div class="locked-world-message">♡<p>Vote saved privately.</p><small>Waiting for the other vote.</small></div>` : `<div class="game-options"><button data-world-action="answer-likely" data-round="${round.id}" data-value="${escapeHTML(myOwnerId())}">${escapeHTML(currentProfile().displayName)}</button><button data-world-action="answer-likely" data-round="${round.id}" data-value="${escapeHTML(partnerOwnerId())}">${escapeHTML(partnerProfile().displayName)}</button></div>`}</article>` : emptyState("No vote yet", "Start a round to settle an extremely important question.")}
    </section>`;
  }

  function renderWhoKnows() {
    const round = latestRound("round_who_knows");
    const answers = round ? roundAnswers("answer_who_knows", round.id) : [];
    const starter = round?.payload?.starterId;
    const mine = answers.find(row => row.owner_id === myOwnerId());
    const both = answers.filter(row => !row.locked && row.payload?.answer).length >= 2;
    setFab({ icon:"+", label:"Ask a question", action:"world-new-who-knows" });
    mainView.innerHTML = `<section class="page world-page">${worldHeader("PLAY", "🧠 Who Knows Who Better?", "One person sets the real answer. The other guesses. Reveal together.")}
      ${round ? `<article class="card card-duo game-card"><p class="eyebrow">ABOUT ${escapeHTML(ownerName(starter)).toUpperCase()}</p><h2>${escapeHTML(round.payload?.prompt || "Question")}</h2>${both ? `<div class="answer-grid">${answers.filter(a=>a.payload?.answer).map(row => `<div class="answer-card ${row.payload.role==="truth"?"is-you":"is-partner"}"><strong>${row.payload.role==="truth"?"Real answer":"Guess"}</strong><p>${escapeHTML(row.payload.answer)}</p></div>`).join("")}</div>` : starter === myOwnerId() ? `<div class="locked-world-message">🧠<p>Your answer is locked.</p><small>Waiting for ${escapeHTML(partnerProfile().displayName)} to guess.</small></div>` : mine ? `<div class="locked-world-message">♡<p>Your guess is locked.</p><small>Reveal happens when both are in.</small></div>` : `<form id="whoKnowsGuessForm" class="form-grid" data-round="${round.id}"><div class="field"><label>Your guess</label><input name="answer" required maxlength="220"></div><button class="button button-primary" type="submit">Lock my guess</button></form>`}</article>` : emptyState("No question yet", "Ask something about yourself and let your person guess.")}
    </section>`;
  }

  function renderBingo() {
    const slot = monthKey();
    const row = worldRows("bingo").find(item => item.slot_key === slot);
    const tasks = row?.payload?.tasks || BINGO_TASKS;
    const completed = new Set(row?.payload?.completed || []);
    setFab();
    mainView.innerHTML = `<section class="page world-page">${worldHeader("PLAY", "▦ Couple Bingo", "A tiny shared 3×3 for this month.", `<span class="pill pill-pink">${completed.size}/9</span>`)}
      ${row ? `<div class="bingo-grid">${tasks.map((task,index) => `<button class="bingo-cell ${completed.has(index)?"is-done":""}" data-world-action="toggle-bingo" data-id="${row.id}" data-index="${index}"><span>${completed.has(index)?"✓":"♡"}</span><strong>${escapeHTML(task)}</strong></button>`).join("")}</div>` : `<article class="card card-duo"><h2>Start ${new Date().toLocaleDateString(undefined,{month:"long"})} Bingo?</h2><p>Nine simple couple moments. Either person can mark squares done.</p><button class="button button-primary button-block" data-world-action="start-bingo">Start our bingo</button></article>`}
    </section>`;
  }

  function openDoodle() {
    openModal({ eyebrow:"PLAY", title:"Draw for me 🎨", html:`<div class="doodle-wrap"><canvas id="koiDoodle" width="720" height="480"></canvas></div><div class="inline-actions" style="margin-top:10px"><button data-world-action="clear-doodle">Clear</button></div><div class="field" style="margin-top:12px"><label>Little caption</label><input id="doodleCaption" maxlength="140" placeholder="For you 💗"></div><button class="button button-primary button-block" style="margin-top:12px" data-world-action="save-doodle">Send doodle</button>` });
    doodleCanvas = document.getElementById("koiDoodle");
    doodleContext = doodleCanvas.getContext("2d");
    doodleContext.fillStyle = "#FFF9FC"; doodleContext.fillRect(0,0,doodleCanvas.width,doodleCanvas.height);
    doodleContext.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--pink-deep").trim() || "#D96E9B";
    doodleContext.lineWidth = 8; doodleContext.lineCap = "round"; doodleContext.lineJoin = "round";
    let drawing = false;
    const point = event => { const r=doodleCanvas.getBoundingClientRect(); return {x:(event.clientX-r.left)*(doodleCanvas.width/r.width),y:(event.clientY-r.top)*(doodleCanvas.height/r.height)}; };
    doodleCanvas.addEventListener("pointerdown", e=>{drawing=true; const p=point(e); doodleContext.beginPath();doodleContext.moveTo(p.x,p.y);doodleCanvas.setPointerCapture?.(e.pointerId);});
    doodleCanvas.addEventListener("pointermove", e=>{if(!drawing)return; const p=point(e);doodleContext.lineTo(p.x,p.y);doodleContext.stroke();});
    ["pointerup","pointercancel","pointerleave"].forEach(name=>doodleCanvas.addEventListener(name,()=>drawing=false));
  }

  function renderDraw() {
    const doodles = (state.memories || []).filter(item => (item.tags || []).includes("Doodle"));
    setFab({ icon:"✎", label:"Draw", action:"world-open-doodle" });
    mainView.innerHTML = `<section class="page world-page">${worldHeader("PLAY", "🎨 Draw for Me", "Tiny doodles are saved as private cloud-backed memory photos.")}<div class="museum-grid">${doodles.map(item => `<button class="exhibit" data-action="open-exhibit" data-kind="memory" data-id="${item.id}"><div class="frame">${item.photo?`<img src="${escapeHTML(item.photo)}" alt="">`:"🎨"}</div><h3>${escapeHTML(item.note || item.title)}</h3><p>${escapeHTML(dateText(item.date))}</p></button>`).join("") || emptyState("No doodles yet", "Draw something questionable for your person.")}</div></section>`;
  }

  function renderFutureUs() {
    const round = latestRound("future_us_round");
    const answers = round ? roundAnswers("future_us_answer", round.id) : [];
    const mine = answers.find(row => row.owner_id === myOwnerId());
    const both = answers.filter(row => !row.locked && row.payload?.answer).length >= 2;
    setFab({ icon:"+", label:"New future question", action:"world-new-future" });
    mainView.innerHTML = `<section class="page world-page">${worldHeader("OUR STORY", "🔮 Future Us", "Answer privately now. Both answers reveal together.")} ${round ? `<article class="card card-duo game-card"><p class="eyebrow">A QUESTION FOR FUTURE-US</p><h2>${escapeHTML(round.payload?.prompt || "")}</h2>${both ? `<div class="answer-grid">${answers.filter(a=>a.payload?.answer).map(row=>`<div class="answer-card ${row.owner_id===myOwnerId()?"is-you":"is-partner"}"><strong>${escapeHTML(ownerName(row.owner_id))}</strong><p>${escapeHTML(row.payload.answer)}</p></div>`).join("")}</div>` : mine ? `<div class="locked-world-message">🔒<p>Your answer is saved.</p><small>Waiting for your person's answer.</small></div>` : `<form id="futureUsAnswerForm" class="form-grid" data-round="${round.id}"><div class="field"><label>Your private answer</label><textarea name="answer" required maxlength="1200"></textarea></div><button class="button button-primary" type="submit">Lock my answer</button></form>`}</article>` : emptyState("No Future Us question yet", "Ask something you would love to compare together.")}</section>`;
  }

  function renderWorldView(view) {
    if (String(view || "").startsWith("category:")) return renderWorldCategory(String(view).slice(9));
    if (SIMPLE[view]) return renderSimple(view);
    if (["timeCapsules","secretMemory","surprise"].includes(view)) return renderScheduled(view);
    const map = {
      thinking: renderThinking, mood: renderMood, oneLine: renderOneLine, dailyPhoto: renderDailyPhoto,
      compliments: renderCompliments, onThisDay: renderOnThisDay, photoOfUs: renderPhotoOfUs,
      memoryMap: renderMemoryMap, collections: renderCollections, monthlyRecap: renderMonthlyRecap,
      wrapped: renderWrapped, privateDraft: renderPrivateDraft, manual: renderManual,
      nextSee: renderNextSee, timezones: renderTimezones, thisOrThat: renderThisOrThat,
      likelyTo: renderLikelyTo, whoKnows: renderWhoKnows, bingo: renderBingo,
      draw: renderDraw, futureUs: renderFutureUs
    };
    return (map[view] || renderWorldLanding)();
  }

  renderExtras = function renderExtrasKoiWorld() {
    if (runtime.extrasView) return legacyRenderExtras();
    if (runtime.worldView) return renderWorldView(runtime.worldView);
    return renderWorldLanding();
  };

  function seasonalMoment() {
    const month = new Date().getMonth();
    if (month === 1) return { icon:"💘", label:"Valentine season", copy:"A little extra heart weather." };
    if (month >= 2 && month <= 4) return { icon:"🌸", label:"Petal season", copy:"Koi's room is feeling very spring." };
    if (month >= 5 && month <= 7) return { icon:"✨", label:"Summer glow", copy:"Slow days, late light, tiny adventures." };
    if (month >= 8 && month <= 10) return { icon:"🍂", label:"Cozy season", copy:"Excellent weather for shared snacks." };
    return { icon:"🎄", label:"Holiday glow", copy:"Your little room is extra cozy." };
  }

  function homeWorldCard() {
    const partnerMood = worldRows("mood").find(row => row.owner_id === partnerOwnerId() && row.slot_key === "current");
    const todayLines = worldRows("one_line").filter(row => String(row.slot_key || "").startsWith(`${todayKey()}:`));
    const latestPing = latestRow("thinking", row => row.owner_id === partnerOwnerId());
    const onDay = onThisDayMemories()[0];
    const season = seasonalMoment();
    return `<article class="card card-duo today-world-card"><div class="section-heading" style="margin:0"><div><p class="eyebrow">TODAY IN YOUR LITTLE WORLD</p><h2>${season.icon} ${escapeHTML(season.label)}</h2></div><button data-world-view="thinking">Send 💗</button></div><div class="today-world-grid"><button data-world-view="mood"><span>${escapeHTML(partnerMood?.payload?.emoji || "☺️")}</span><strong>${escapeHTML(partnerProfile().displayName)}'s mood</strong><small>${escapeHTML(partnerMood?.payload?.note || "Tap to check in")}</small></button><button data-world-view="oneLine"><span>✍️</span><strong>One-Line Today</strong><small>${todayLines.length}/2 lines in</small></button>${onDay ? `<button data-world-view="onThisDay"><span>📅</span><strong>On this day</strong><small>${escapeHTML(onDay.title)}</small></button>` : `<button data-world-view="dailyPhoto"><span>📷</span><strong>Daily Photo</strong><small>${dailyPhotoRows().length}/2 photos in</small></button>`}${latestPing ? `<button data-world-view="thinking"><span>💗</span><strong>Thinking of you</strong><small>${escapeHTML(ownerName(latestPing.owner_id))} sent a heart</small></button>` : `<button data-world-view="thinking"><span>💭</span><strong>Thinking of You</strong><small>One-tap heart ping</small></button>`}</div></article>`;
  }

  renderHome = function renderHomeKoiWorld() {
    legacyRenderHome();
    const page = mainView.querySelector(".page");
    if (!page) return;
    const header = page.querySelector(".page-header");
    if (header) header.insertAdjacentHTML("afterend", homeWorldCard());
  };

  renderRoom = function renderRoomKoiWorld() {
    legacyRenderRoom();
    const page = mainView.querySelector(".page");
    if (!page) return;
    const activity = (state.worldItems || []).length + (state.memories || []).length * 2 + (state.littleThings || []).length;
    const season = seasonalMoment();
    page.insertAdjacentHTML("beforeend", `<article class="card card-duo"><div class="section-heading" style="margin:0"><div><p class="eyebrow">KOI HEARTS</p><h2>${activity} 💗 relationship activity</h2></div><span class="pill pill-pink">${season.icon} ${escapeHTML(season.label)}</span></div><p class="small muted">Daily Us, memories, Little Things, games and shared lists all make your little world feel more lived-in.</p></article>`);
  };

  function openComplimentForm() {
    openModal({ eyebrow:"COMPLIMENT JAR", title:"Drop one in", html:`<form id="complimentForm" class="form-grid"><div class="field"><label>Compliment</label><textarea name="message" required maxlength="800" placeholder="I love how you..."></textarea></div><button class="button button-primary" type="submit">Drop into the jar 🫙</button></form>` });
  }

  function openPrivateDraftForm() {
    openModal({ eyebrow:"PRIVATE DRAFT", title:"Write before you're ready", html:`<form id="privateDraftForm" class="form-grid"><div class="field"><label>Title</label><input name="title" maxlength="120" placeholder="Something I want to say"></div><div class="field"><label>Draft</label><textarea name="message" required maxlength="2400"></textarea></div><button class="button button-primary" type="submit">Save only for me</button></form>` });
  }

  function openGameRound(kind) {
    if (kind === "this") {
      const options = THIS_OR_THAT[Math.floor(Math.random()*THIS_OR_THAT.length)];
      worldSave({ featureKey:"round_this_or_that", title:"This or That", payload:{options}, visibility:"shared" }).then(()=>setWorldView("thisOrThat"));
      return;
    }
    if (kind === "likely") {
      const prompt = LIKELY_TO[Math.floor(Math.random()*LIKELY_TO.length)];
      worldSave({ featureKey:"round_likely_to", title:"Who's More Likely", payload:{prompt}, visibility:"shared" }).then(()=>setWorldView("likelyTo"));
      return;
    }
    if (kind === "who") {
      openModal({ eyebrow:"WHO KNOWS WHO BETTER?", title:"Ask about yourself", html:`<form id="whoKnowsNewForm" class="form-grid"><div class="field"><label>Question</label><input name="prompt" required maxlength="220" placeholder="What's my dream comfort meal?"></div><div class="field"><label>Your real answer</label><input name="answer" required maxlength="220"></div><button class="button button-primary" type="submit">Start round</button></form>` });
      return;
    }
    if (kind === "future") {
      openModal({ eyebrow:"FUTURE US", title:"Ask future-you something", html:`<form id="futureUsNewForm" class="form-grid"><div class="field"><label>Question</label><textarea name="prompt" required maxlength="500" placeholder="Where do you think we'll be living five years from now?"></textarea></div><button class="button button-primary" type="submit">Start question</button></form>` });
    }
  }

  document.addEventListener("click", async event => {
    const categoryButton = event.target.closest("[data-world-category]");
    if (categoryButton) {
      event.preventDefault();
      runtime.extrasView = "";
      setWorldView(`category:${categoryButton.dataset.worldCategory}`);
      return;
    }

    const viewButton = event.target.closest("[data-world-view]");
    if (viewButton) {
      event.preventDefault();
      runtime.extrasView = "";
      setWorldView(viewButton.dataset.worldView);
      return;
    }

    const button = event.target.closest("[data-world-action]");
    if (!button) return;
    const action = button.dataset.worldAction;
    event.preventDefault();

    try {
      if (action === "back") { runtime.worldView=""; runtime.extrasView=""; render(); window.scrollTo({top:0,behavior:"smooth"}); return; }
      if (action === "send-thinking") { await worldSave({featureKey:"thinking",title:"Thinking of you",payload:{emoji:"💗"},visibility:"shared"}); toast("Sent a little 💗"); return; }
      if (action === "set-mood") { const moodPayload={emoji:button.dataset.value,note:document.getElementById("worldMoodNote")?.value?.trim()||""}; await worldSave({featureKey:"mood",slotKey:`current:${myOwnerId()}`,title:"Current mood",payload:moodPayload,visibility:"pair"}); await worldSave({featureKey:"mood_history",title:"Mood",payload:moodPayload,visibility:"pair"}); toast("Mood shared 💗"); return; }
      if (action === "pick-compliment") { const choices=worldRows("compliment").filter(row=>row.owner_id===partnerOwnerId()); const pick=choices[Math.floor(Math.random()*choices.length)]; const box=document.getElementById("complimentReveal"); if(box)box.innerHTML=pick?`<article class="card card-pink compliment-reveal"><span>💗</span><p>${escapeHTML(pick.payload?.message||"")}</p><small>— ${escapeHTML(ownerName(pick.owner_id))}</small></article>`:`<article class="card"><p class="small muted">Your person hasn't put anything in your jar yet.</p></article>`; return; }
      if (action === "delete") { if(confirm("Delete this from Koi?")) await worldRemove(button.dataset.id); return; }
      if (action === "edit-simple") { const row=state.worldItems.find(item=>item.id===button.dataset.id); openSimpleForm(button.dataset.view,row); return; }
      if (action === "edit-manual") { openManualForm(); return; }
      if (action === "reshuffle-photo") { renderPhotoOfUs(); return; }
      if (action === "edit-collection") { openCollectionForm(state.worldItems.find(item=>item.id===button.dataset.id)); return; }
      if (action === "open-collection") { openCollection(state.worldItems.find(item=>item.id===button.dataset.id)); return; }
      if (action === "answer-this-or-that") { await worldSave({featureKey:"answer_this_or_that",slotKey:button.dataset.round,title:"Private choice",payload:{answer:button.dataset.value},visibility:"round"}); setWorldView("thisOrThat"); return; }
      if (action === "answer-likely") { await worldSave({featureKey:"answer_likely_to",slotKey:button.dataset.round,title:"Private vote",payload:{answer:button.dataset.value},visibility:"round"}); setWorldView("likelyTo"); return; }
      if (action === "start-bingo") { await worldSave({featureKey:"bingo",slotKey:monthKey(),title:"Couple Bingo",payload:{tasks:BINGO_TASKS,completed:[]},visibility:"shared"}); setWorldView("bingo"); return; }
      if (action === "toggle-bingo") { const row=state.worldItems.find(item=>item.id===button.dataset.id); if(!row)return; const done=new Set(row.payload?.completed||[]); const index=Number(button.dataset.index); done.has(index)?done.delete(index):done.add(index); await worldSave({id:row.id,featureKey:"bingo",slotKey:row.slot_key,title:row.title,payload:{...row.payload,completed:[...done]},visibility:"shared"}); setWorldView("bingo"); return; }
      if (action === "clear-doodle" && doodleContext && doodleCanvas) { doodleContext.fillStyle="#FFF9FC";doodleContext.fillRect(0,0,doodleCanvas.width,doodleCanvas.height); return; }
      if (action === "save-doodle" && doodleCanvas) {
        const caption=document.getElementById("doodleCaption")?.value?.trim()||"A doodle for you";
        const blob=await new Promise(resolve=>doodleCanvas.toBlob(resolve,"image/jpeg",0.86));
        const file=new File([blob],`koi-doodle-${Date.now()}.jpg`,{type:"image/jpeg"});
        if(cloudReady()&&cloud()?.memories){await cloud().memories.create(cloud().runtime.pair.id,{type:"memory",title:"Draw for Me",date:todayKey(),location:"",note:caption,chapter:"Doodles",tags:["Doodle","Draw for Me"]},[file]);await cloud().refreshMemories?.({quiet:true});} else {const photo=doodleCanvas.toDataURL("image/jpeg",0.82);state.memories.unshift({id:uid("m"),type:"memory",title:"Draw for Me",date:todayKey(),location:"",note:caption,chapter:"Doodles",tags:["Doodle","Draw for Me"],photo,photos:[photo],icon:"🎨",createdAt:Date.now(),createdByLocalId:state.currentUserId});saveState();}
        closeModal(); setWorldView("draw"); toast("Doodle sent 🎨"); return;
      }
    } catch (error) { console.error("Koi World action failed", error); toast(error.message || "That didn't save yet"); }
  });

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "world-simple-add") { openSimpleForm(runtime.worldView); return; }
    if (action === "world-add-compliment") { openComplimentForm(); return; }
    if (action === "world-scheduled-add") { openScheduledForm(runtime.worldView); return; }
    if (action === "world-new-draft") { openPrivateDraftForm(); return; }
    if (action === "world-new-collection") { openCollectionForm(); return; }
    if (action === "world-new-this-or-that") { openGameRound("this"); return; }
    if (action === "world-new-likely") { openGameRound("likely"); return; }
    if (action === "world-new-who-knows") { openGameRound("who"); return; }
    if (action === "world-open-doodle") { openDoodle(); return; }
    if (action === "world-new-future") { openGameRound("future"); return; }
  });

  document.addEventListener("submit", async event => {
    const form = event.target;
    try {
      if (form.id === "worldSimpleForm") {
        event.preventDefault();
        const view=form.dataset.view; const config=SIMPLE[view]; if(!config)return;
        const data=new FormData(form); const payload={}; config.fields.forEach(field=>{ payload[field.name]=field.type==="date" ? readWorldDate(data,`world_${field.name}`,{required:Boolean(field.required),allowFuture:Boolean(field.futureAllowed)}) : String(data.get(field.name)||"").trim(); });
        await worldSave({id:form.dataset.id||null,featureKey:config.key,title:payload.title||config.title,payload,visibility:config.visibility||"shared"}); closeModal(); setWorldView(view); toast("Saved to Koi 💗"); return;
      }
      if (form.id === "oneLineForm") { event.preventDefault(); const data=new FormData(form); await worldSave({featureKey:"one_line",slotKey:`${todayKey()}:${myOwnerId()}`,title:"One-Line Today",payload:{text:String(data.get("text")||"").trim()},visibility:"pair"}); setWorldView("oneLine"); toast("Today's line saved"); return; }
      if (form.id === "dailyPhotoForm") {
        event.preventDefault(); const data=new FormData(form); const file=form.elements.photo.files?.[0]; if(!file)throw new Error("Choose a photo."); const caption=String(data.get("caption")||"").trim();
        if(cloudReady()&&cloud()?.memories){await cloud().memories.create(cloud().runtime.pair.id,{type:"memory",title:`Daily Photo · ${formatShortDate(todayKey())}`,date:todayKey(),location:"",note:caption,chapter:"Daily Photos",tags:["Daily Photo"]},[file]);await cloud().refreshMemories?.({quiet:true});}
        else {const photo=await compressImage(file,1400,0.8);state.memories.unshift({id:uid("m"),type:"memory",title:`Daily Photo · ${formatShortDate(todayKey())}`,date:todayKey(),location:"",note:caption,chapter:"Daily Photos",tags:["Daily Photo"],photo,photos:[photo],icon:"📷",createdAt:Date.now(),createdByLocalId:state.currentUserId});saveState();}
        setWorldView("dailyPhoto"); toast("Daily photo added 📷"); return;
      }
      if (form.id === "complimentForm") { event.preventDefault(); const data=new FormData(form); await worldSave({featureKey:"compliment",title:"Compliment",payload:{message:String(data.get("message")||"").trim()},visibility:"pair"});closeModal();setWorldView("compliments");toast("Dropped into the jar 🫙");return; }
      if (form.id === "scheduledForm") { event.preventDefault(); const cfg=scheduledConfig(form.dataset.view); const data=new FormData(form); const date=readWorldDate(data,"worldReveal",{required:true,allowFuture:true}); if(new Date(`${date}T23:59:59`)<new Date())throw new Error("Choose a future reveal date."); await worldSave({featureKey:cfg.key,title:String(data.get("title")||"").trim(),payload:{message:String(data.get("message")||"").trim(),teaser:String(data.get("teaser")||cfg.teaser).trim()},visibility:"scheduled",revealAt:`${date}T00:00:00`});closeModal();setWorldView(form.dataset.view);toast("Locked for later 🔒");return; }
      if (form.id === "privateDraftForm") { event.preventDefault();const data=new FormData(form);await worldSave({featureKey:"private_draft",title:String(data.get("title")||"Untitled draft").trim(),payload:{message:String(data.get("message")||"").trim()},visibility:"owner"});closeModal();setWorldView("privateDraft");toast("Draft saved only for you");return; }
      if (form.id === "manualForm") { event.preventDefault();const data=new FormData(form);await worldSave({featureKey:"manual",slotKey:`profile:${myOwnerId()}`,title:"My Manual",payload:{stressed:String(data.get("stressed")||"").trim(),helps:String(data.get("helps")||"").trim(),notHelpful:String(data.get("notHelpful")||"").trim(),loved:String(data.get("loved")||"").trim(),comfort:String(data.get("comfort")||"").trim()},visibility:"pair"});closeModal();setWorldView("manual");toast("Manual updated 📘");return; }
      if (form.id === "nextSeeForm") { event.preventDefault();const data=new FormData(form);await worldSave({featureKey:"next_see",slotKey:"current",title:"Next time together",payload:{date:readWorldDate(data,"worldNextSee",{required:false,allowFuture:true}),label:String(data.get("label")||"").trim()},visibility:"shared"});setWorldView("nextSee");toast("Countdown saved 💗");return; }
      if (form.id === "timezoneForm") { event.preventDefault();const data=new FormData(form);await worldSave({featureKey:"timezone",slotKey:`profile:${myOwnerId()}`,title:"Time zone",payload:{city:String(data.get("city")||"").trim(),offset:Number(data.get("offset")||0)},visibility:"pair"});setWorldView("timezones");toast("Time zone updated");return; }
      if (form.id === "collectionForm") { event.preventDefault();const data=new FormData(form);const ids=data.getAll("memoryIds").map(String);await worldSave({id:form.dataset.id||null,featureKey:"photo_collection",title:String(data.get("title")||"").trim(),payload:{memoryIds:ids},visibility:"shared"});closeModal();setWorldView("collections");toast("Album saved 🖼️");return; }
      if (form.id === "whoKnowsNewForm") { event.preventDefault();const data=new FormData(form);const prompt=String(data.get("prompt")||"").trim();const answer=String(data.get("answer")||"").trim();closeModal();const roundId=await worldSave({featureKey:"round_who_knows",title:"Who Knows",payload:{prompt,starterId:myOwnerId()},visibility:"shared"});await worldSave({featureKey:"answer_who_knows",slotKey:roundId,title:"Truth",payload:{role:"truth",answer},visibility:"round"});setWorldView("whoKnows");return; }
      if (form.id === "whoKnowsGuessForm") { event.preventDefault();const data=new FormData(form);await worldSave({featureKey:"answer_who_knows",slotKey:form.dataset.round,title:"Guess",payload:{role:"guess",answer:String(data.get("answer")||"").trim()},visibility:"round"});setWorldView("whoKnows");return; }
      if (form.id === "futureUsNewForm") { event.preventDefault();const data=new FormData(form);closeModal();await worldSave({featureKey:"future_us_round",title:"Future Us",payload:{prompt:String(data.get("prompt")||"").trim()},visibility:"shared"});setWorldView("futureUs");return; }
      if (form.id === "futureUsAnswerForm") { event.preventDefault();const data=new FormData(form);await worldSave({featureKey:"future_us_answer",slotKey:form.dataset.round,title:"Future Us answer",payload:{answer:String(data.get("answer")||"").trim()},visibility:"round"});setWorldView("futureUs");return; }
    } catch (error) { event.preventDefault(); console.error("Koi World form failed", error); toast(error.message || "Could not save yet"); }
  });

  // When Extras is opened from navigation, clear any previous world subview.
  document.querySelectorAll('[data-route="extras"]').forEach(button => button.addEventListener("click", () => { runtime.worldView=""; }));
})();
