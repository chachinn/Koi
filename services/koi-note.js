(() => {
  "use strict";

  const cloud = window.KoiCloud;
  if (!cloud) return;

  let activePairId = null;
  let current = null;
  let history = [];
  let refreshing = null;

  function pairId() {
    return activePairId || cloud.runtime?.pair?.id || null;
  }

  function userId() {
    return cloud.runtime?.session?.user?.id || null;
  }

  function requirePair() {
    const id = pairId();
    if (!id) throw new Error("Connect your Koi pair first.");
    return id;
  }

  function emit() {
    window.dispatchEvent(new CustomEvent("koi:note-updated", {
      detail: { current, history: [...history], pairId: pairId() }
    }));
  }

  async function fetchCurrent() {
    const pid = requirePair();
    const { data, error } = await cloud.client
      .from("pair_notes")
      .select("pair_id,body,emoji,style_key,author_id,version,updated_at")
      .eq("pair_id", pid)
      .maybeSingle();
    if (error) throw error;
    current = data || null;
    return current;
  }

  async function fetchHistory({ limit = 30 } = {}) {
    const pid = requirePair();
    const { data, error } = await cloud.client
      .from("pair_note_history")
      .select("id,pair_id,body,emoji,style_key,author_id,is_kept,created_at")
      .eq("pair_id", pid)
      .order("created_at", { ascending: false })
      .limit(Math.max(1, Math.min(100, Number(limit) || 30)));
    if (error) throw error;
    history = data || [];
    return history;
  }

  async function refresh({ quiet = false } = {}) {
    if (!pairId() || !cloud.client) return null;
    if (refreshing) return refreshing;
    refreshing = Promise.all([fetchCurrent(), fetchHistory({ limit: 30 })])
      .then(() => {
        emit();
        return { current, history: [...history] };
      })
      .catch(error => {
        if (!quiet) console.warn("Koi Note refresh failed", error);
        throw error;
      })
      .finally(() => { refreshing = null; });
    return refreshing;
  }

  async function set({ body, emoji = "💗", styleKey = "blush" } = {}) {
    const pid = requirePair();
    const text = String(body || "").trim();
    const safeEmoji = String(emoji || "💗").trim().slice(0, 16) || "💗";
    const safeStyle = String(styleKey || "blush").trim();
    if (text.length > 220) throw new Error("Koi Notes can be up to 220 characters.");

    const { data, error } = await cloud.client.rpc("set_koi_note", {
      p_pair_id: pid,
      p_body: text,
      p_emoji: safeEmoji,
      p_style_key: safeStyle
    });
    if (error) throw error;

    current = Array.isArray(data) ? (data[0] || null) : data;
    await fetchHistory({ limit: 30 }).catch(() => {});
    emit();

    // Best effort only. Saving the note must never feel slow because push is down.
    if (text) Promise.resolve(cloud.push?.notifyKoiNote?.(pid)).catch(() => {});
    return current;
  }

  async function clear() {
    return set({ body: "", emoji: "💗", styleKey: current?.style_key || "blush" });
  }

  async function toggleKeep(historyId, keep) {
    if (!historyId) return;
    const pid = requirePair();
    const { error } = await cloud.client.rpc("toggle_koi_note_keep", {
      p_history_id: historyId,
      p_keep: Boolean(keep)
    });
    if (error) throw error;
    history = history.map(row => row.id === historyId ? { ...row, is_kept: Boolean(keep) } : row);
    emit();
  }

  async function restore(historyId) {
    const row = history.find(item => item.id === historyId);
    if (!row) throw new Error("That note is no longer available.");
    return set({ body: row.body, emoji: row.emoji, styleKey: row.style_key });
  }

  async function start(nextPairId) {
    activePairId = nextPairId || cloud.runtime?.pair?.id || null;
    current = null;
    history = [];
    if (!activePairId) return null;
    return refresh({ quiet: true });
  }

  function stop() {
    activePairId = null;
    current = null;
    history = [];
    refreshing = null;
    emit();
  }

  cloud.note = {
    start,
    stop,
    refresh,
    set,
    clear,
    toggleKeep,
    restore,
    get current() { return current; },
    get history() { return [...history]; },
    get pairId() { return pairId(); },
    get userId() { return userId(); }
  };
})();
