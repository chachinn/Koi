(() => {
  "use strict";

  const cloud = window.KoiCloud;
  if (!cloud) return;

  const STYLES = [
    ["blush", "Blush", "🌸"],
    ["lavender", "Lavender", "☁️"],
    ["cream", "Cream", "🕯️"],
    ["sky", "Sky", "🫧"],
    ["mint", "Mint", "🍃"],
    ["sunny", "Sunny", "🌼"]
  ];
  const EMOJIS = ["💗", "🥰", "🫶", "🌷", "☕", "✨", "🥹", "💌", "🌙", "🐟"];

  function e(value) { return typeof escapeHTML === "function" ? escapeHTML(value) : String(value ?? ""); }
  function meId() { return cloud.runtime?.session?.user?.id || null; }
  function members() { return Array.isArray(cloud.runtime?.members) ? cloud.runtime.members : []; }
  function member(userId) { return members().find(item => item.user_id === userId) || null; }
  function authorName(row) {
    if (!row?.author_id) return "Koi";
    if (row.author_id === meId()) return "You";
    return member(row.author_id)?.display_name || "Your person";
  }
  function timeAgo(value) {
    if (!value) return "";
    const ms = Math.max(0, Date.now() - new Date(value).getTime());
    const min = Math.floor(ms / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d ago`;
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function currentNote() { return cloud.note?.current || null; }

  function homeCardHTML() {
    if (!cloud.runtime?.ready) return "";
    const note = currentNote();
    if (!note?.body) {
      return `<button type="button" class="koi-note-home-card koi-note-style-blush is-empty" data-koi-note-action="open">
        <span class="koi-note-home-icon">💌</span>
        <span class="koi-note-home-copy"><span class="eyebrow">KOI NOTE</span><strong>Leave something on their Home.</strong><small>It will sync to both phones instantly.</small></span>
        <span class="koi-note-home-arrow">›</span>
      </button>`;
    }
    return `<button type="button" class="koi-note-home-card koi-note-style-${e(note.style_key || "blush")}" data-koi-note-action="open">
      <span class="koi-note-home-icon">${e(note.emoji || "💗")}</span>
      <span class="koi-note-home-copy"><span class="eyebrow">KOI NOTE · ${e(authorName(note))}</span><strong>${e(note.body)}</strong><small>${e(timeAgo(note.updated_at))} · tap to write back</small></span>
      <span class="koi-note-home-arrow">›</span>
    </button>`;
  }

  function historyHTML() {
    const rows = cloud.note?.history || [];
    if (!rows.length) return `<div class="koi-note-history-empty">Your old Koi Notes will collect here.</div>`;
    return `<div class="koi-note-history-list">${rows.map(row => `<article class="koi-note-history-item koi-note-style-${e(row.style_key || "blush")}">
      <div class="koi-note-history-main"><span>${e(row.emoji || "💗")}</span><div><strong>${e(row.body)}</strong><small>${e(authorName(row))} · ${e(timeAgo(row.created_at))}</small></div></div>
      <div class="koi-note-history-actions">
        <button type="button" data-koi-note-action="restore" data-id="${e(row.id)}">Use again</button>
        <button type="button" data-koi-note-action="keep" data-id="${e(row.id)}" data-keep="${row.is_kept ? "0" : "1"}">${row.is_kept ? "★ Kept" : "☆ Keep"}</button>
      </div>
    </article>`).join("")}</div>`;
  }

  function editorHTML() {
    const note = currentNote();
    const selectedStyle = note?.style_key || "blush";
    const selectedEmoji = note?.emoji || "💗";
    return `<form id="koiNoteForm" class="koi-note-editor">
      <article class="koi-note-preview koi-note-style-${e(selectedStyle)}" id="koiNotePreview">
        <span class="koi-note-preview-emoji" id="koiNotePreviewEmoji">${e(selectedEmoji)}</span>
        <p id="koiNotePreviewText">${e(note?.body || "Write a tiny note for your person…")}</p>
        <small>Shows on both Koi Home screens</small>
      </article>
      <label class="field"><span>Note</span><textarea name="body" id="koiNoteBody" maxlength="220" rows="4" placeholder="Good luck today 💗">${e(note?.body || "")}</textarea><small class="koi-note-counter"><span id="koiNoteCount">${String(note?.body || "").length}</span>/220</small></label>
      <div><p class="field-label">Little icon</p><div class="koi-note-emoji-row">${EMOJIS.map(emoji => `<button type="button" class="${emoji === selectedEmoji ? "is-active" : ""}" data-koi-note-action="emoji" data-emoji="${e(emoji)}">${e(emoji)}</button>`).join("")}</div><input type="hidden" name="emoji" id="koiNoteEmoji" value="${e(selectedEmoji)}"></div>
      <div><p class="field-label">Card color</p><div class="koi-note-style-grid">${STYLES.map(([id,label,icon]) => `<button type="button" class="koi-note-style-choice koi-note-style-${id} ${id === selectedStyle ? "is-active" : ""}" data-koi-note-action="style" data-style="${id}"><span>${icon}</span><strong>${label}</strong></button>`).join("")}</div><input type="hidden" name="styleKey" id="koiNoteStyle" value="${e(selectedStyle)}"></div>
      <button class="button button-primary button-block" type="submit">Put this on our Koi 💗</button>
      ${note?.body ? `<button class="button button-ghost button-block" type="button" data-koi-note-action="clear">Clear current note</button>` : ""}
    </form>`;
  }

  function open() {
    if (!cloud.runtime?.ready || !cloud.note) {
      toast("Connect your Koi pair first");
      return;
    }
    openModal({ eyebrow: "KOI NOTE", title: "A tiny note for their screen", html: `
      ${editorHTML()}
      <div class="section-heading koi-note-history-heading"><h2>Note history</h2><span class="micro muted">recent + kept</span></div>
      <div id="koiNoteHistory">${historyHTML()}</div>
    ` });
  }

  async function save(form) {
    const data = new FormData(form);
    const body = String(data.get("body") || "").trim();
    try {
      await cloud.note.set({ body, emoji: data.get("emoji"), styleKey: data.get("styleKey") });
      toast(body ? "Koi Note updated 💗" : "Koi Note cleared");
      closeModal();
      if (typeof cloud.requestRender === "function") cloud.requestRender();
      else render();
    } catch (error) {
      toast(error?.message || "Koi Note couldn't save");
    }
  }

  document.addEventListener("submit", event => {
    if (event.target?.id !== "koiNoteForm") return;
    event.preventDefault();
    void save(event.target);
  });

  document.addEventListener("input", event => {
    const input = event.target.closest("#koiNoteBody");
    if (!input) return;
    const text = input.value;
    const preview = document.getElementById("koiNotePreviewText");
    const count = document.getElementById("koiNoteCount");
    if (preview) preview.textContent = text.trim() || "Write a tiny note for your person…";
    if (count) count.textContent = String(text.length);
  });

  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-koi-note-action]");
    if (!button) return;
    const action = button.dataset.koiNoteAction;
    if (action === "open") return open();
    if (action === "emoji") {
      const emoji = button.dataset.emoji || "💗";
      document.querySelectorAll("[data-koi-note-action='emoji']").forEach(el => el.classList.toggle("is-active", el === button));
      const hidden = document.getElementById("koiNoteEmoji");
      const preview = document.getElementById("koiNotePreviewEmoji");
      if (hidden) hidden.value = emoji;
      if (preview) preview.textContent = emoji;
      return;
    }
    if (action === "style") {
      const style = button.dataset.style || "blush";
      document.querySelectorAll("[data-koi-note-action='style']").forEach(el => el.classList.toggle("is-active", el === button));
      const hidden = document.getElementById("koiNoteStyle");
      const preview = document.getElementById("koiNotePreview");
      if (hidden) hidden.value = style;
      if (preview) {
        [...preview.classList].filter(name => name.startsWith("koi-note-style-")).forEach(name => preview.classList.remove(name));
        preview.classList.add(`koi-note-style-${style}`);
      }
      return;
    }
    if (action === "clear") {
      try {
        await cloud.note.clear();
        toast("Koi Note cleared");
        closeModal();
        cloud.requestRender?.();
      } catch (error) { toast(error?.message || "Couldn't clear Koi Note"); }
      return;
    }
    if (action === "keep") {
      try {
        await cloud.note.toggleKeep(button.dataset.id, button.dataset.keep === "1");
        const wrap = document.getElementById("koiNoteHistory");
        if (wrap) wrap.innerHTML = historyHTML();
      } catch (error) { toast(error?.message || "Couldn't update that note"); }
      return;
    }
    if (action === "restore") {
      try {
        await cloud.note.restore(button.dataset.id);
        toast("Koi Note restored 💗");
        closeModal();
        cloud.requestRender?.();
      } catch (error) { toast(error?.message || "Couldn't restore that note"); }
    }
  });

  window.addEventListener("koi:note-updated", () => {
    if (runtime?.route === "home") cloud.requestRender?.();
  });

  window.KoiNoteUI = { homeCardHTML, open };

  // app.js may have rendered Home before this deferred feature file loaded.
  if (runtime?.route === "home" && cloud.runtime?.ready) cloud.requestRender?.();
})();
