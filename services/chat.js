(() => {
  "use strict";

  const cloud = window.KoiCloud;
  if (!cloud) return;

  const OUTBOX_KEY = "koi_chat_outbox_v1";
  const PAGE_SIZE = 40;
  let activePairId = null;
  let typingChannel = null;
  let fallbackChannels = [];
  let unreadCount = 0;
  let unreadInitialized = false;
  let flushing = null;
  let lastMarkedId = null;
  let lastMarkedAt = 0;

  function currentUserId() {
    return cloud.runtime?.session?.user?.id || null;
  }

  function requirePair(pairId = activePairId) {
    if (!pairId) throw new Error("No Koi pair is connected.");
    return pairId;
  }

  function randomId() {
    return crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  function isNetworkError(error) {
    const message = String(error?.message || error || "").toLowerCase();
    return !navigator.onLine || message.includes("fetch") || message.includes("network") || message.includes("load failed") || message.includes("offline");
  }

  function loadOutbox() {
    try {
      const parsed = JSON.parse(localStorage.getItem(OUTBOX_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveOutbox(rows) {
    try {
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(rows || []));
    } catch (error) {
      console.warn("Koi chat outbox could not be saved", error);
    }
    window.dispatchEvent(new CustomEvent("koi:chat-outbox"));
  }

  function queuedForPair(pairId = activePairId) {
    const userId = currentUserId();
    if (!pairId || !userId) return [];
    // Keep offline messages account-scoped on shared devices.
    return loadOutbox().filter(row => row.pair_id === pairId && row.sender_id === userId);
  }

  function enqueue(row) {
    const rows = loadOutbox().filter(item => item.client_id !== row.client_id);
    rows.push(row);
    saveOutbox(rows);
    return row;
  }

  function removeQueued(clientId) {
    const rows = loadOutbox().filter(item => item.client_id !== clientId);
    saveOutbox(rows);
  }

  function updateQueued(clientId, patch = {}) {
    const rows = loadOutbox().map(item => item.client_id === clientId ? { ...item, ...patch } : item);
    saveOutbox(rows);
  }

  async function fetchReactions(messageIds) {
    if (!messageIds.length) return new Map();
    const { data, error } = await cloud.client
      .from("chat_message_reactions")
      .select("message_id,pair_id,user_id,emoji,created_at")
      .in("message_id", messageIds);
    if (error) throw error;

    const map = new Map();
    for (const reaction of data || []) {
      const list = map.get(reaction.message_id) || [];
      list.push(reaction);
      map.set(reaction.message_id, list);
    }
    return map;
  }

  async function listRecent(pairId = activePairId, { limit = PAGE_SIZE, before = null } = {}) {
    requirePair(pairId);
    let query = cloud.client
      .from("chat_messages")
      .select("id,pair_id,client_id,sender_id,body,reply_to_id,created_at,updated_at,edited_at")
      .eq("pair_id", pairId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (before) query = query.lt("created_at", before);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    const reactions = await fetchReactions(rows.map(row => row.id));
    return {
      rows: rows.reverse().map(row => ({ ...row, reactions: reactions.get(row.id) || [] })),
      hasMore: rows.length >= limit
    };
  }

  async function insertRow(row) {
    const { data, error } = await cloud.client
      .from("chat_messages")
      .upsert({
        pair_id: row.pair_id,
        client_id: row.client_id,
        sender_id: currentUserId(),
        body: row.body,
        reply_to_id: row.reply_to_id || null
      }, { onConflict: "pair_id,client_id" })
      .select("id,pair_id,client_id,sender_id,body,reply_to_id,created_at,updated_at,edited_at")
      .single();
    if (error) throw error;
    // Save first, then notify in the background. Push must never delay the chat UI.
    Promise.resolve(cloud.push?.notifyChatMessage?.(data.id)).catch(() => {});
    return { ...data, reactions: [] };
  }

  async function send({ pairId = activePairId, body, replyToId = null } = {}) {
    requirePair(pairId);
    const text = String(body || "").trim();
    if (!text) throw new Error("Write a message first.");
    if (text.length > 4000) throw new Error("That message is a little too long.");

    const queued = {
      id: `queued_${randomId()}`,
      pair_id: pairId,
      client_id: randomId(),
      sender_id: currentUserId(),
      body: text,
      reply_to_id: replyToId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      edited_at: null,
      reactions: [],
      queued: true
    };

    if (!navigator.onLine) {
      enqueue(queued);
      return queued;
    }

    try {
      return await insertRow(queued);
    } catch (error) {
      if (isNetworkError(error)) {
        enqueue(queued);
        return queued;
      }
      throw error;
    }
  }

  async function flushOutbox() {
    if (flushing || !navigator.onLine || !activePairId || !currentUserId()) return flushing;
    flushing = (async () => {
      const all = loadOutbox();
      const mine = all.filter(row => row.pair_id === activePairId && row.sender_id === currentUserId());
      if (!mine.length) return;

      const sent = new Set();
      for (const row of mine) {
        try {
          await insertRow(row);
          sent.add(row.client_id);
        } catch (error) {
          if (isNetworkError(error)) break;
          console.warn("Koi chat queued message could not send", error);
          // Keep validation/RLS failures visible in the outbox instead of silently losing them.
          updateQueued(row.client_id, { failed: true, error: String(error?.message || error) });
        }
      }
      if (sent.size) {
        saveOutbox(loadOutbox().filter(row => !sent.has(row.client_id)));
        notifySync();
      }
    })().finally(() => { flushing = null; });
    return flushing;
  }

  async function edit(messageId, body) {
    const text = String(body || "").trim();
    if (!text) throw new Error("A message can't be empty.");
    if (text.length > 4000) throw new Error("That message is a little too long.");

    if (String(messageId).startsWith("queued_")) {
      const row = loadOutbox().find(item => item.id === messageId);
      if (!row) throw new Error("Queued message not found.");
      updateQueued(row.client_id, { body: text, edited_at: new Date().toISOString() });
      return { ...row, body: text, edited_at: new Date().toISOString(), queued: true };
    }

    const { data, error } = await cloud.client
      .from("chat_messages")
      .update({ body: text, edited_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("sender_id", currentUserId())
      .select("id,pair_id,client_id,sender_id,body,reply_to_id,created_at,updated_at,edited_at")
      .single();
    if (error) throw error;
    return { ...data, reactions: [] };
  }

  async function remove(messageId) {
    if (String(messageId).startsWith("queued_")) {
      const row = loadOutbox().find(item => item.id === messageId);
      if (row) removeQueued(row.client_id);
      return true;
    }
    const { error } = await cloud.client
      .from("chat_messages")
      .delete()
      .eq("id", messageId)
      .eq("sender_id", currentUserId());
    if (error) throw error;
    return true;
  }

  async function setReaction(messageId, emoji, pairId = activePairId) {
    requirePair(pairId);
    const value = String(emoji || "").trim();
    if (!value) return removeReaction(messageId);
    const { error } = await cloud.client
      .from("chat_message_reactions")
      .upsert({ message_id: messageId, pair_id: pairId, user_id: currentUserId(), emoji: value }, { onConflict: "message_id,user_id" });
    if (error) throw error;
  }

  async function removeReaction(messageId) {
    const { error } = await cloud.client
      .from("chat_message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", currentUserId());
    if (error) throw error;
  }

  async function getReadState(pairId = activePairId) {
    if (!pairId || !currentUserId()) return null;
    const { data, error } = await cloud.client
      .from("chat_read_state")
      .select("pair_id,user_id,last_read_message_id,last_read_at,updated_at")
      .eq("pair_id", pairId)
      .eq("user_id", currentUserId())
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  function paintUnreadBadge(count) {
    unreadCount = Math.max(0, Number(count) || 0);
    const badge = document.getElementById("chatUnreadBadge");
    const button = document.getElementById("openChatBtn");
    if (badge) {
      badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
      badge.hidden = unreadCount < 1;
    }
    if (button) button.setAttribute("aria-label", unreadCount ? `Chat · ${unreadCount} unread` : "Chat");
    document.documentElement.dataset.koiChatUnread = String(unreadCount);
  }

  async function refreshUnread(pairId = activePairId) {
    if (!pairId || !currentUserId() || !cloud.runtime.ready) {
      paintUnreadBadge(0);
      return 0;
    }
    try {
      const read = await getReadState(pairId);
      let query = cloud.client
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("pair_id", pairId)
        .neq("sender_id", currentUserId());
      if (read?.last_read_at) query = query.gt("created_at", read.last_read_at);
      const { count, error } = await query;
      if (error) throw error;
      const previous = unreadCount;
      paintUnreadBadge(count || 0);
      if (unreadInitialized && (count || 0) > previous) {
        window.dispatchEvent(new CustomEvent("koi:chat-unread", { detail: { count: count || 0, delta: (count || 0) - previous } }));
      }
      unreadInitialized = true;
      return count || 0;
    } catch (error) {
      console.warn("Koi chat unread refresh failed", error);
      return unreadCount;
    }
  }

  async function markRead(message = null, pairId = activePairId) {
    if (!pairId || !currentUserId()) return;
    const markId = message?.id && !String(message.id).startsWith("queued_") ? message.id : null;
    const when = message?.created_at || new Date().toISOString();
    const whenMs = Number.isFinite(Date.parse(when)) ? Date.parse(when) : Date.now();
    // Never move a read cursor backwards if two refreshes finish out of order.
    if (whenMs < lastMarkedAt) return;
    if (markId && markId === lastMarkedId && unreadCount === 0) return;
    const { error } = await cloud.client
      .from("chat_read_state")
      .upsert({
        pair_id: pairId,
        user_id: currentUserId(),
        last_read_message_id: markId,
        last_read_at: when
      }, { onConflict: "pair_id,user_id" });
    if (error) throw error;
    lastMarkedId = markId;
    lastMarkedAt = Math.max(lastMarkedAt, whenMs);
    paintUnreadBadge(0);
  }

  function notifySync() {
    refreshUnread().catch(() => {});
    window.dispatchEvent(new CustomEvent("koi:chat-sync"));
  }

  async function connectTyping(pairId = activePairId) {
    if (!pairId || !cloud.client) return null;
    if (typingChannel) await cloud.client.removeChannel(typingChannel).catch(() => {});
    await cloud.client.realtime.setAuth();

    typingChannel = cloud.client
      .channel(`pair:${pairId}:chat`, { config: { private: true } })
      .on("broadcast", { event: "typing" }, message => {
        const payload = message?.payload || {};
        if (!payload.user_id || payload.user_id === currentUserId()) return;
        window.dispatchEvent(new CustomEvent("koi:chat-typing", { detail: payload }));
      })
      .subscribe();

    cloud.runtime.chatTypingChannel = typingChannel;
    return typingChannel;
  }

  async function sendTyping(isTyping) {
    if (!typingChannel || !activePairId || !currentUserId()) return;
    try {
      await typingChannel.send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: currentUserId(), is_typing: Boolean(isTyping), at: Date.now() }
      });
    } catch {
      // Typing is intentionally best-effort and must never block actual messages.
    }
  }

  async function subscribeFallback(pairId = activePairId) {
    await unsubscribeFallback();
    if (!pairId) return [];
    await cloud.client.realtime.setAuth();
    fallbackChannels = ["chat_messages", "chat_message_reactions"].map(table => cloud.client
      .channel(`pair:${pairId}:${table}`, { config: { private: true } })
      .on("broadcast", { event: "*" }, () => notifySync())
      .subscribe());
    return fallbackChannels;
  }

  async function unsubscribeFallback() {
    const channels = fallbackChannels;
    fallbackChannels = [];
    await Promise.all(channels.map(channel => cloud.client.removeChannel(channel).catch(() => {})));
  }

  async function start(pairId) {
    activePairId = pairId || null;
    unreadInitialized = false;
    lastMarkedId = null;
    lastMarkedAt = 0;
    paintUnreadBadge(0);
    if (!activePairId) return;
    await connectTyping(activePairId).catch(error => console.warn("Koi typing channel unavailable", error));
    await flushOutbox().catch(() => {});
    await refreshUnread(activePairId).catch(() => {});
  }

  async function stop() {
    await unsubscribeFallback();
    if (typingChannel) await cloud.client.removeChannel(typingChannel).catch(() => {});
    typingChannel = null;
    cloud.runtime.chatTypingChannel = null;
    activePairId = null;
    unreadInitialized = false;
    lastMarkedId = null;
    lastMarkedAt = 0;
    paintUnreadBadge(0);
  }

  window.addEventListener("online", () => {
    flushOutbox().catch(() => {});
    refreshUnread().catch(() => {});
  });

  cloud.chat = {
    listRecent,
    send,
    edit,
    remove,
    setReaction,
    removeReaction,
    markRead,
    refreshUnread,
    notifySync,
    sendTyping,
    start,
    stop,
    subscribeFallback,
    unsubscribeFallback,
    flushOutbox,
    queuedForPair,
    removeQueued,
    get unreadCount() { return unreadCount; },
    get pairId() { return activePairId; }
  };
})();
