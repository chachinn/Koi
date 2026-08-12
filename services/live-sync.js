(() => {
  "use strict";

  const cloud = window.KoiCloud;
  if (!cloud) return;

  let channel = null;
  let pairId = null;
  let handlers = {};
  let flushTimer = null;
  let reconnectTimer = null;
  let reconnectAttempt = 0;
  let connecting = null;
  let suppressReconnect = false;
  let needsCatchUp = false;
  const pendingDomains = new Set();

  const DOMAIN_ALIASES = {
    little_things: "littleThings",
    littleThings: "littleThings",
    memories: "memories",
    memory_sides: "memories",
    memory_media: "memories",
    pair_shared_state: "sharedState",
    sharedState: "sharedState",
    couple_feature_items: "world",
    world: "world",
    chat_messages: "chat",
    chat_message_reactions: "chat",
    chat: "chat",
    pair_notes: "note",
    pair_note_history: "note",
    note: "note",
    pairs: "pair",
    pair_members: "pair",
    profiles: "pair",
    pair: "pair"
  };

  function normalizeDomain(value) {
    return DOMAIN_ALIASES[value] || value || "all";
  }

  function setStatus(status, error = null) {
    cloud.runtime.realtimeStatus = status;
    cloud.runtime.realtimeError = error || null;
    document.documentElement.dataset.koiRealtime = String(status || "").toLowerCase();
  }

  async function flushPending() {
    clearTimeout(flushTimer);
    flushTimer = null;
    if (!pendingDomains.size) return;

    const domains = [...pendingDomains];
    pendingDomains.clear();

    if (domains.includes("all") && typeof handlers.all === "function") {
      await handlers.all();
      return;
    }

    const unique = [...new Set(domains.map(normalizeDomain))];
    await Promise.allSettled(unique.map(domain => {
      const handler = handlers[domain];
      return typeof handler === "function" ? handler() : Promise.resolve();
    }));
  }

  function queueDomain(domain) {
    pendingDomains.add(normalizeDomain(domain));
    clearTimeout(flushTimer);
    // Small enough to feel instant, long enough to merge multi-row photo writes.
    flushTimer = setTimeout(() => {
      flushPending().catch(error => console.warn("Koi live sync refresh failed", error));
    }, 70);
  }

  function parsePayload(message) {
    const body = message?.payload || message || {};
    return {
      domain: normalizeDomain(body.domain || body.table || body.entity || "all"),
      operation: body.operation || body.op || "",
      rowId: body.row_id || body.id || null,
      actorId: body.actor_id || null
    };
  }

  function scheduleReconnect() {
    if (suppressReconnect || !pairId || reconnectTimer || !navigator.onLine) return;
    reconnectAttempt += 1;
    const delay = Math.min(12000, 800 * Math.pow(1.7, reconnectAttempt - 1));
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (document.visibilityState === "hidden") return scheduleReconnect();
      connect(pairId, handlers).catch(error => {
        console.warn("Koi realtime reconnect failed", error);
        scheduleReconnect();
      });
    }, delay);
  }

  async function unsubscribe() {
    clearTimeout(flushTimer);
    clearTimeout(reconnectTimer);
    flushTimer = null;
    reconnectTimer = null;
    pendingDomains.clear();
    connecting = null;
    pairId = null;
    needsCatchUp = false;

    const existing = channel;
    channel = null;
    cloud.runtime.liveSyncChannel = null;
    suppressReconnect = true;
    if (existing && cloud.client) {
      await cloud.client.removeChannel(existing).catch(() => {});
    }
    suppressReconnect = false;
    setStatus("CLOSED");
  }

  async function connect(activePairId, nextHandlers = handlers) {
    if (!cloud.configured || !cloud.client || !activePairId) return null;
    if (connecting) return connecting;

    connecting = (async () => {
      pairId = activePairId;
      handlers = nextHandlers || {};

      if (channel) {
        const old = channel;
        channel = null;
        suppressReconnect = true;
        await cloud.client.removeChannel(old).catch(() => {});
        suppressReconnect = false;
      }

      await cloud.client.realtime.setAuth();
      const topic = `pair:${pairId}:sync`;

      channel = cloud.client
        .channel(topic, { config: { private: true } })
        .on("broadcast", { event: "sync" }, message => {
          const event = parsePayload(message);
          queueDomain(event.domain);
        })
        .subscribe((status, error) => {
          setStatus(status, error || null);
          if (status === "SUBSCRIBED") {
            reconnectAttempt = 0;
            if (needsCatchUp) {
              needsCatchUp = false;
              queueDomain("all");
            }
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            if (!suppressReconnect) needsCatchUp = true;
            if (error) console.warn("Koi realtime channel", status, error);
            scheduleReconnect();
          }
        });

      cloud.runtime.liveSyncChannel = channel;
      return channel;
    })().finally(() => {
      connecting = null;
    });

    return connecting;
  }

  async function ensure() {
    if (!pairId || !cloud.runtime.ready) return;
    const status = cloud.runtime.realtimeStatus;
    if (channel && status === "SUBSCRIBED") return channel;
    return connect(pairId, handlers);
  }

  cloud.liveSync = {
    connect,
    ensure,
    unsubscribe,
    queueDomain,
    flushPending,
    get pairId() { return pairId; }
  };
})();
