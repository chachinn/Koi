(() => {
  "use strict";

  const cloud = window.KoiCloud;
  if (!cloud) return;

  const ui = {
    pairId: null,
    messages: [],
    loaded: false,
    loading: false,
    loadingOlder: false,
    hasMore: true,
    selectedId: null,
    replyToId: null,
    editingId: null,
    typingUserId: null,
    typingUntil: 0,
    typingTimer: null,
    sentTypingAt: 0,
    stopTypingTimer: null,
    refreshTimer: null,
    readTimer: null,
    shouldStickToBottom: true
  };

  const REACTIONS = ["💗", "😂", "🥹", "✨"];

  function meId() { return cloud.runtime?.session?.user?.id || null; }
  function pairId() { return cloud.runtime?.pair?.id || null; }
  function members() { return Array.isArray(cloud.runtime?.members) ? cloud.runtime.members : []; }
  function memberFor(userId) { return members().find(member => member.user_id === userId) || null; }
  function partnerMember() { return members().find(member => member.user_id !== meId()) || null; }
  function isMine(message) { return message?.sender_id === meId(); }
  function e(value) { return escapeHTML(value); }

  function draftKey() { return `koi_chat_draft_v1:${pairId() || "none"}:${meId() || "signed-out"}`; }
  function getDraft() {
    try { return localStorage.getItem(draftKey()) || ""; } catch { return ""; }
  }
  function setDraft(value) {
    try {
      const text = String(value || "");
      if (text) localStorage.setItem(draftKey(), text);
      else localStorage.removeItem(draftKey());
    } catch {}
  }

  function formatTime(value) {
    if (!value) return "";
    return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function dayKey(value) {
    const date = new Date(value || Date.now());
    return date.toLocaleDateString("en-CA");
  }

  function formatDay(value) {
    const date = new Date(value || Date.now());
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    const key = date.toLocaleDateString("en-CA");
    if (key === today.toLocaleDateString("en-CA")) return "Today";
    if (key === yesterday.toLocaleDateString("en-CA")) return "Yesterday";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
  }

  function sortMessages(rows) {
    return [...rows].sort((a, b) => {
      const time = new Date(a.created_at || 0) - new Date(b.created_at || 0);
      return time || String(a.id).localeCompare(String(b.id));
    });
  }

  function mergedWithOutbox(serverRows = ui.messages) {
    const queued = cloud.chat?.queuedForPair?.(pairId()) || [];
    const map = new Map();
    for (const row of serverRows || []) map.set(row.client_id || row.id, row);
    for (const row of queued) {
      if (!map.has(row.client_id)) map.set(row.client_id, row);
    }
    return sortMessages([...map.values()]);
  }

  function messageById(id) {
    return mergedWithOutbox().find(message => message.id === id || message.client_id === id) || null;
  }

  function replyPreview(message) {
    if (!message?.reply_to_id) return "";
    const parent = messageById(message.reply_to_id);
    const label = parent ? (isMine(parent) ? "You" : (memberFor(parent.sender_id)?.display_name || "Your person")) : "Earlier message";
    const text = parent?.body || "Message";
    return `<span class="chat-reply-preview"><strong>${e(label)}</strong><span>${e(text.slice(0, 120))}</span></span>`;
  }

  function reactionHTML(message) {
    const rows = Array.isArray(message.reactions) ? message.reactions : [];
    if (!rows.length) return "";
    const grouped = new Map();
    rows.forEach(row => {
      const item = grouped.get(row.emoji) || { count: 0, mine: false };
      item.count += 1;
      if (row.user_id === meId()) item.mine = true;
      grouped.set(row.emoji, item);
    });
    return `<div class="chat-reactions">${[...grouped.entries()].map(([emoji, item]) => `<button type="button" class="chat-reaction-chip ${item.mine ? "is-mine" : ""}" data-chat-action="react" data-id="${e(message.id)}" data-emoji="${e(emoji)}">${e(emoji)}${item.count > 1 ? `<span>${item.count}</span>` : ""}</button>`).join("")}</div>`;
  }

  function actionsHTML(message) {
    if (ui.selectedId !== message.id || message.queued && message.failed) {
      if (ui.selectedId !== message.id) return "";
    }
    const myReaction = (message.reactions || []).find(row => row.user_id === meId())?.emoji || "";
    return `<div class="chat-message-actions ${isMine(message) ? "is-mine" : ""}">
      ${!message.queued ? `<button type="button" data-chat-action="reply" data-id="${e(message.id)}">↩ Reply</button>` : ""}
      ${!message.queued ? REACTIONS.map(emoji => `<button type="button" class="chat-emoji-action ${myReaction === emoji ? "is-active" : ""}" data-chat-action="react" data-id="${e(message.id)}" data-emoji="${e(emoji)}">${e(emoji)}</button>`).join("") : ""}
      ${isMine(message) ? `<button type="button" data-chat-action="edit" data-id="${e(message.id)}">Edit</button><button type="button" class="is-danger" data-chat-action="delete" data-id="${e(message.id)}">Delete</button>` : ""}
    </div>`;
  }

  function messageHTML(message) {
    const mine = isMine(message);
    const sender = memberFor(message.sender_id);
    const status = message.queued ? (message.failed ? "Not sent" : "Sending when online…") : `${formatTime(message.created_at)}${message.edited_at ? " · edited" : ""}`;
    return `<div class="chat-message-row ${mine ? "is-mine" : "is-partner"}" data-chat-message-row="${e(message.id)}">
      ${mine ? "" : `<div class="chat-avatar" aria-hidden="true">${e(sender?.avatar || "♡")}</div>`}
      <div class="chat-message-stack">
        <button type="button" class="chat-bubble ${message.failed ? "is-failed" : ""}" data-chat-action="select" data-id="${e(message.id)}">
          ${replyPreview(message)}
          <span class="chat-message-text">${e(message.body)}</span>
          <span class="chat-message-meta">${e(status)}</span>
        </button>
        ${reactionHTML(message)}
        ${actionsHTML(message)}
        ${message.failed ? `<button type="button" class="chat-retry" data-chat-action="retry-queued" data-id="${e(message.id)}">Retry when online</button>` : ""}
      </div>
    </div>`;
  }

  function messageListHTML() {
    const rows = mergedWithOutbox();
    if (!rows.length) {
      return `<div class="chat-empty"><div>💬</div><h3>Start your little conversation.</h3><p>Messages live in your private Koi pair and follow you to your next phone.</p></div>`;
    }
    let previousDay = "";
    return rows.map(message => {
      const day = dayKey(message.created_at);
      const divider = day !== previousDay ? `<div class="chat-day-divider"><span>${e(formatDay(message.created_at))}</span></div>` : "";
      previousDay = day;
      return `${divider}${messageHTML(message)}`;
    }).join("");
  }

  function partnerStatusText() {
    const partner = partnerMember();
    if (!partner) return "Waiting for your partner to join";
    if (ui.typingUserId === partner.user_id && ui.typingUntil > Date.now()) return `${partner.display_name || "Your person"} is typing…`;
    return `Private with ${partner.display_name || "your person"}`;
  }

  function notificationPromptHTML() {
    if (!cloud.push?.supportsPush?.()) return "";
    if (cloud.push.isSubscribed?.()) {
      return `<div class="chat-notification-ready"><span>🔔</span><span><strong>Message notifications on</strong><small>Chat + Koi Note push is enabled on this phone.</small></span><button type="button" data-chat-action="test-notifications">Test</button></div>`;
    }
    const denied = cloud.push.permission === "denied";
    return `<div class="chat-notification-stack"><button type="button" class="chat-notification-prompt ${denied ? "is-denied" : ""}" data-chat-action="enable-notifications">
      <span>🔔</span><span><strong>${denied ? "Notifications are blocked" : "Turn on message notifications"}</strong><small>${denied ? "Allow Koi in your iPhone notification settings." : "Get a notification when your partner messages you."}</small></span><span>›</span>
    </button><button type="button" class="chat-notification-check" data-chat-action="check-notifications">Check why notifications aren't working</button></div>`;
  }

  function shellHTML() {
    const partner = partnerMember();
    const canSend = Boolean(partner);
    return `<section class="page chat-page">
      <div class="chat-panel glass-card">
        <div class="chat-header">
          <div class="chat-header-person">
            <div class="chat-header-avatar">${e(partner?.avatar || "💗")}</div>
            <div><p class="eyebrow">KOI CHAT</p><h1>${e(partner?.display_name || "Chat")}</h1><p id="chatPartnerStatus">${e(partnerStatusText())}</p></div>
          </div>
          <button type="button" class="icon-button" data-chat-action="refresh" aria-label="Refresh chat">↻</button>
        </div>

        <div class="chat-message-list" id="chatMessageList" aria-live="polite">
          ${ui.hasMore && ui.loaded ? `<button type="button" class="chat-load-older" data-chat-action="load-older" ${ui.loadingOlder ? "disabled" : ""}>${ui.loadingOlder ? "Loading…" : "Load earlier messages"}</button>` : ""}
          ${ui.loading && !ui.loaded ? `<div class="chat-loading">Loading your conversation…</div>` : messageListHTML()}
        </div>

        <div class="chat-composer-wrap">
          ${notificationPromptHTML()}
          <div id="chatComposerContext" class="chat-composer-context" hidden></div>
          <form id="koiChatForm" class="chat-composer" autocomplete="off">
            <textarea id="chatComposerInput" maxlength="4000" rows="1" placeholder="${canSend ? "Message your person…" : "Chat unlocks when your partner joins"}" ${canSend ? "" : "disabled"}></textarea>
            <button id="chatSendButton" class="chat-send-button" type="submit" aria-label="Send message" ${canSend ? "" : "disabled"}>↑</button>
          </form>
          <div class="chat-privacy-note">Private to your Koi pair · ${navigator.onLine ? "online" : "offline messages will queue"}</div>
        </div>
      </div>
    </section>`;
  }

  function composerContextHTML() {
    if (ui.editingId) {
      const message = messageById(ui.editingId);
      return `<div><strong>Editing message</strong><span>${e((message?.body || "").slice(0, 120))}</span></div><button type="button" data-chat-action="cancel-context">×</button>`;
    }
    if (ui.replyToId) {
      const message = messageById(ui.replyToId);
      const label = message ? (isMine(message) ? "You" : (memberFor(message.sender_id)?.display_name || "Your person")) : "Message";
      return `<div><strong>Replying to ${e(label)}</strong><span>${e((message?.body || "").slice(0, 120))}</span></div><button type="button" data-chat-action="cancel-context">×</button>`;
    }
    return "";
  }

  function paintComposerContext() {
    const box = document.getElementById("chatComposerContext");
    if (!box) return;
    const html = composerContextHTML();
    box.innerHTML = html;
    box.hidden = !html;
    const send = document.getElementById("chatSendButton");
    if (send) send.textContent = ui.editingId ? "✓" : "↑";
  }

  function paintMessages({ preserveScroll = true, stickBottom = false } = {}) {
    if (runtime.route !== "chat") return;
    const list = document.getElementById("chatMessageList");
    if (!list) return;
    const oldHeight = list.scrollHeight;
    const oldTop = list.scrollTop;
    const wasNearBottom = oldHeight - oldTop - list.clientHeight < 110;

    list.innerHTML = `${ui.hasMore && ui.loaded ? `<button type="button" class="chat-load-older" data-chat-action="load-older" ${ui.loadingOlder ? "disabled" : ""}>${ui.loadingOlder ? "Loading…" : "Load earlier messages"}</button>` : ""}${ui.loading && !ui.loaded ? `<div class="chat-loading">Loading your conversation…</div>` : messageListHTML()}`;

    requestAnimationFrame(() => {
      if (stickBottom || wasNearBottom || ui.shouldStickToBottom) {
        list.scrollTop = list.scrollHeight;
        ui.shouldStickToBottom = false;
      } else if (preserveScroll) {
        list.scrollTop = oldTop + (list.scrollHeight - oldHeight);
      }
    });
  }

  function paintStatus() {
    const el = document.getElementById("chatPartnerStatus");
    if (el) el.textContent = partnerStatusText();
  }

  function setInputValue(value, { focus = true } = {}) {
    const input = document.getElementById("chatComposerInput");
    if (!input) return;
    input.value = value || "";
    resizeComposer(input);
    if (focus) input.focus();
  }

  function resizeComposer(input) {
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(116, Math.max(42, input.scrollHeight))}px`;
  }

  function chatListNearBottom() {
    const list = document.getElementById("chatMessageList");
    if (!list) return false;
    return list.scrollHeight - list.scrollTop - list.clientHeight < 110;
  }

  function markVisibleChatReadSoon() {
    clearTimeout(ui.readTimer);
    ui.readTimer = setTimeout(() => {
      if (runtime.route !== "chat" || document.visibilityState !== "visible" || !chatListNearBottom()) return;
      const latest = ui.messages[ui.messages.length - 1];
      if (latest) cloud.chat?.markRead?.(latest, pairId()).catch(() => {});
    }, 180);
  }

  function replaceRecentRows(fetched) {
    const rows = fetched.rows || [];
    if (!ui.messages.length) {
      ui.messages = rows;
      return;
    }
    const earliestFetched = rows[0]?.created_at;
    const older = earliestFetched ? ui.messages.filter(row => new Date(row.created_at) < new Date(earliestFetched)) : [];
    const map = new Map();
    [...older, ...rows].forEach(row => map.set(row.id, row));
    ui.messages = sortMessages([...map.values()]);
  }

  async function loadInitial() {
    const pid = pairId();
    if (!pid || !cloud.chat || ui.loading) return;
    ui.loading = true;
    paintMessages();
    try {
      const fetched = await cloud.chat.listRecent(pid, { limit: 50 });
      ui.messages = fetched.rows;
      ui.hasMore = fetched.hasMore;
      ui.loaded = true;
      ui.shouldStickToBottom = true;
      paintMessages({ stickBottom: true });
      const latest = ui.messages[ui.messages.length - 1];
      if (latest) await cloud.chat.markRead(latest, pid).catch(() => {});
    } catch (error) {
      console.error("Koi chat load failed", error);
      toast(error.message || "Chat couldn't load right now");
    } finally {
      ui.loading = false;
      paintMessages();
    }
  }

  async function refreshRecent({ forceBottom = false } = {}) {
    const pid = pairId();
    if (!pid || !cloud.chat || !ui.loaded) return loadInitial();
    if (ui.loading) return;
    const wasReadingNewest = forceBottom || (runtime.route === "chat" && document.visibilityState === "visible" && chatListNearBottom());
    ui.loading = true;
    try {
      const fetched = await cloud.chat.listRecent(pid, { limit: 60 });
      replaceRecentRows(fetched);
      paintMessages({ preserveScroll: true, stickBottom: forceBottom });
      // Do not mark a newly arrived message as read while someone is scrolled up
      // reading older history. The cursor advances once the newest messages are visible.
      if (wasReadingNewest) {
        const latest = ui.messages[ui.messages.length - 1];
        if (latest) await cloud.chat.markRead(latest, pid).catch(() => {});
      }
    } catch (error) {
      console.warn("Koi chat refresh failed", error);
    } finally {
      ui.loading = false;
    }
  }

  async function loadOlder() {
    if (ui.loadingOlder || !ui.hasMore || !ui.messages.length) return;
    const oldest = ui.messages[0];
    ui.loadingOlder = true;
    paintMessages({ preserveScroll: true });
    try {
      const fetched = await cloud.chat.listRecent(pairId(), { limit: 40, before: oldest.created_at });
      const map = new Map();
      [...fetched.rows, ...ui.messages].forEach(row => map.set(row.id, row));
      ui.messages = sortMessages([...map.values()]);
      ui.hasMore = fetched.hasMore;
      paintMessages({ preserveScroll: true });
    } catch (error) {
      toast(error.message || "Couldn't load earlier messages");
    } finally {
      ui.loadingOlder = false;
      paintMessages({ preserveScroll: true });
    }
  }

  function resetForPair(pid) {
    ui.pairId = pid;
    ui.messages = [];
    ui.loaded = false;
    ui.loading = false;
    ui.loadingOlder = false;
    ui.hasMore = true;
    ui.selectedId = null;
    ui.replyToId = null;
    ui.editingId = null;
    ui.shouldStickToBottom = true;
  }

  window.renderKoiChat = function renderKoiChat() {
    setFab();
    if (!cloud.runtime.ready || !pairId()) {
      mainView.innerHTML = `<section class="page"><article class="card card-duo"><p class="eyebrow">KOI CHAT</p><h2>Connect your Koi first 💗</h2><p class="small muted">Chat becomes available after you sign in and connect with your partner.</p></article></section>`;
      return;
    }

    if (ui.pairId !== pairId()) resetForPair(pairId());
    mainView.innerHTML = shellHTML();
    paintComposerContext();
    const input = document.getElementById("chatComposerInput");
    if (input && !ui.editingId) {
      input.value = getDraft();
      resizeComposer(input);
    }
    if (!ui.loaded && !ui.loading) void loadInitial();
    else paintMessages({ stickBottom: ui.shouldStickToBottom });
  };

  async function submitMessage() {
    const input = document.getElementById("chatComposerInput");
    if (!input || !cloud.chat) return;
    const text = input.value.trim();
    if (!text) return;
    const button = document.getElementById("chatSendButton");
    if (button) button.disabled = true;

    try {
      await cloud.chat.sendTyping(false);
      if (ui.editingId) {
        const updated = await cloud.chat.edit(ui.editingId, text);
        const index = ui.messages.findIndex(row => row.id === ui.editingId);
        if (index >= 0 && !updated.queued) ui.messages[index] = { ...ui.messages[index], ...updated, reactions: ui.messages[index].reactions || [] };
        ui.editingId = null;
        setDraft("");
        input.value = "";
        paintComposerContext();
        paintMessages({ preserveScroll: true });
      } else {
        const sent = await cloud.chat.send({ pairId: pairId(), body: text, replyToId: ui.replyToId });
        if (!sent.queued) {
          ui.messages = sortMessages([...ui.messages.filter(row => row.id !== sent.id && row.client_id !== sent.client_id), sent]);
        }
        ui.replyToId = null;
        setDraft("");
        input.value = "";
        ui.shouldStickToBottom = true;
        paintComposerContext();
        paintMessages({ stickBottom: true });
        if (sent.queued) toast("You're offline · message queued");
      }
      resizeComposer(input);
    } catch (error) {
      toast(error.message || "Message couldn't send");
    } finally {
      if (button) button.disabled = false;
      input.focus();
    }
  }

  document.addEventListener("submit", event => {
    if (event.target?.id !== "koiChatForm") return;
    event.preventDefault();
    void submitMessage();
  });

  document.addEventListener("input", event => {
    const input = event.target.closest("#chatComposerInput");
    if (!input) return;
    resizeComposer(input);
    if (!ui.editingId) setDraft(input.value);

    const now = Date.now();
    if (input.value.trim() && now - ui.sentTypingAt > 850) {
      ui.sentTypingAt = now;
      cloud.chat?.sendTyping?.(true);
    }
    clearTimeout(ui.stopTypingTimer);
    ui.stopTypingTimer = setTimeout(() => cloud.chat?.sendTyping?.(false), 1300);
  });

  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-chat-action]");
    if (!button) return;
    const action = button.dataset.chatAction;
    const id = button.dataset.id || "";
    const message = id ? messageById(id) : null;

    if (action === "select") {
      ui.selectedId = ui.selectedId === id ? null : id;
      paintMessages({ preserveScroll: true });
      return;
    }
    if (action === "refresh") {
      await refreshRecent();
      toast("Chat refreshed");
      return;
    }
    if (action === "load-older") return loadOlder();
    if (action === "enable-notifications") {
      try {
        const result = await cloud.push?.enable?.();
        toast(result?.message || "Message notifications are on 💬");
        if (runtime.route === "chat") render();
      } catch (error) {
        toast(error?.message || "Notifications could not be enabled");
      }
      return;
    }
    if (action === "test-notifications") {
      try { const result = await cloud.push?.test?.(); toast(result?.message || "Test notification sent 🔔"); }
      catch (error) { toast(error?.message || "Test notification failed"); }
      return;
    }
    if (action === "check-notifications") {
      try {
        const d = await cloud.push?.diagnose?.();
        const issues = [];
        if (!d.supported) issues.push("Push is not supported on this device/browser.");
        if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !d.standalone) issues.push("Open Koi from the iPhone Home Screen icon.");
        if (d.permission === "denied") issues.push("Notifications are blocked in iPhone Settings.");
        if (!d.serviceWorker) issues.push("Koi's service worker is not ready yet.");
        if (!d.serverConfigured) issues.push("The Supabase push server/VAPID secrets are not configured yet.");
        if (d.permission === "granted" && !d.browserSubscription) issues.push("This phone has permission but no push subscription yet.");
        if (d.browserSubscription && d.serverSubscriptionCount < 1) issues.push("This phone's notification subscription hasn't reached the server yet.");
        toast(issues[0] || "Notifications look healthy on this phone 🔔");
      } catch (error) { toast(error?.message || "Notification check failed"); }
      return;
    }
    if (action === "cancel-context") {
      ui.replyToId = null;
      ui.editingId = null;
      paintComposerContext();
      setInputValue(getDraft());
      return;
    }
    if (!message) return;

    if (action === "reply") {
      ui.replyToId = message.id;
      ui.editingId = null;
      ui.selectedId = null;
      paintComposerContext();
      paintMessages({ preserveScroll: true });
      document.getElementById("chatComposerInput")?.focus();
      return;
    }

    if (action === "edit") {
      if (!isMine(message)) return;
      ui.editingId = message.id;
      ui.replyToId = null;
      ui.selectedId = null;
      paintComposerContext();
      paintMessages({ preserveScroll: true });
      setInputValue(message.body);
      return;
    }

    if (action === "delete") {
      if (!isMine(message) || !confirm("Delete this message?")) return;
      try {
        await cloud.chat.remove(message.id);
        ui.messages = ui.messages.filter(row => row.id !== message.id);
        if (ui.replyToId === message.id) ui.replyToId = null;
        if (ui.editingId === message.id) ui.editingId = null;
        ui.selectedId = null;
        paintComposerContext();
        paintMessages({ preserveScroll: true });
      } catch (error) {
        toast(error.message || "Couldn't delete message");
      }
      return;
    }

    if (action === "react") {
      if (message.queued) return;
      const emoji = button.dataset.emoji || "💗";
      const mine = (message.reactions || []).find(row => row.user_id === meId());
      try {
        if (mine?.emoji === emoji) await cloud.chat.removeReaction(message.id);
        else await cloud.chat.setReaction(message.id, emoji, pairId());
        ui.selectedId = null;
        await refreshRecent();
      } catch (error) {
        toast(error.message || "Couldn't react");
      }
      return;
    }

    if (action === "retry-queued") {
      if (!navigator.onLine) return toast("Still offline");
      try {
        await cloud.chat.flushOutbox();
        await refreshRecent({ forceBottom: true });
      } catch (error) {
        toast(error.message || "Still couldn't send");
      }
    }
  });

  document.addEventListener("scroll", event => {
    if (event.target?.id !== "chatMessageList") return;
    if (chatListNearBottom()) markVisibleChatReadSoon();
  }, true);

  window.addEventListener("koi:chat-sync", () => {
    clearTimeout(ui.refreshTimer);
    ui.refreshTimer = setTimeout(() => {
      if (runtime.route === "chat") refreshRecent().catch(() => {});
    }, 70);
  });

  window.addEventListener("koi:chat-outbox", () => {
    if (runtime.route === "chat") paintMessages({ preserveScroll: true, stickBottom: true });
  });

  window.addEventListener("koi:chat-typing", event => {
    const detail = event.detail || {};
    if (!detail.user_id || detail.user_id === meId()) return;
    if (!detail.is_typing) {
      ui.typingUserId = null;
      ui.typingUntil = 0;
      paintStatus();
      return;
    }
    ui.typingUserId = detail.user_id;
    ui.typingUntil = Date.now() + 2200;
    paintStatus();
    clearTimeout(ui.typingTimer);
    ui.typingTimer = setTimeout(() => {
      if (Date.now() >= ui.typingUntil) {
        ui.typingUserId = null;
        paintStatus();
      }
    }, 2300);
  });

  window.addEventListener("koi:chat-unread", event => {
    if (runtime.route === "chat") return;
    const delta = Number(event.detail?.delta || 0);
    if (delta < 1) return;
    const partner = partnerMember()?.display_name || "Your person";
    toast(`${partner} sent you a message 💬`);
    if (document.visibilityState !== "visible" && "Notification" in window && Notification.permission === "granted" && !cloud.push?.isSubscribed?.()) {
      // Legacy fallback only. Once real Web Push is subscribed, the service
      // worker owns background notifications so the user never gets duplicates.
      try { new Notification("Koi 💗", { body: `${partner} sent you a message.`, icon: "icon/icon-192.png" }); } catch {}
    }
  });

  // If the page was opened directly at #chat, app.js rendered before this file loaded.
  if (runtime.route === "chat") render();
})();
