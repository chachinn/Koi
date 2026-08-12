(() => {
  "use strict";

  const cloud = window.KoiCloud;
  if (!cloud) return;

  let cachedPublicKey = "";
  let configPromise = null;
  let activePairId = null;
  let currentSubscription = null;
  let syncPromise = null;

  function supportsPush() {
    return Boolean("serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
  }

  function isStandalone() {
    return Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone === true);
  }

  function userId() { return cloud.runtime?.session?.user?.id || null; }
  function pairId() { return activePairId || cloud.runtime?.pair?.id || null; }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
  }

  async function prefetchConfig({ force = false } = {}) {
    if (cachedPublicKey && !force) return cachedPublicKey;
    if (configPromise && !force) return configPromise;
    configPromise = (async () => {
      const { data, error } = await cloud.client.functions.invoke("chat-push", {
        body: { action: "config" }
      });
      if (error) throw error;
      const key = String(data?.publicKey || "").trim();
      if (!key) throw new Error(data?.error || "Push notifications are not configured yet.");
      cachedPublicKey = key;
      return key;
    })().finally(() => { configPromise = null; });
    return configPromise;
  }

  async function saveSubscription(subscription) {
    const uid = userId();
    const pid = pairId();
    if (!uid || !pid || !subscription) return;
    const json = subscription.toJSON();
    const endpoint = String(json.endpoint || subscription.endpoint || "");
    const p256dh = String(json.keys?.p256dh || "");
    const auth = String(json.keys?.auth || "");
    if (!endpoint || !p256dh || !auth) throw new Error("This device returned an incomplete push subscription.");

    const { error } = await cloud.client.from("push_subscriptions").upsert({
      user_id: uid,
      pair_id: pid,
      endpoint,
      p256dh,
      auth_key: auth,
      user_agent: navigator.userAgent.slice(0, 500),
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: "endpoint" });
    if (error) throw error;
    currentSubscription = subscription;
  }

  async function getBrowserSubscription() {
    if (!supportsPush()) return null;
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  }

  async function enable() {
    if (!supportsPush()) throw new Error("Push notifications are not supported on this device.");
    if (!userId() || !pairId()) throw new Error("Connect your Koi pair first.");

    // On iPhone, real Web Push is for Home Screen web apps. Being explicit here
    // prevents the confusing case where Safari grants nothing and gives no useful clue.
    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isiOS && !isStandalone()) {
      throw new Error("Open Koi from its Home Screen icon first, then turn notifications on.");
    }

    // VAPID config is normally prefetched after sign-in. If it is still missing,
    // prepare it now and ask for one more tap rather than risking iOS losing the
    // direct user gesture before PushManager.subscribe().
    if (!cachedPublicKey) {
      await prefetchConfig({ force: true });
      throw new Error("Koi prepared notifications. Tap Turn on message notifications once more.");
    }
    const publicKey = cachedPublicKey;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error(permission === "denied"
        ? "Notifications are blocked. Allow Koi in iPhone Settings → Notifications."
        : "Notification permission was not granted.");
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }
    await saveSubscription(subscription);
    return { enabled: true, message: "Message notifications are on 💬" };
  }

  async function disable() {
    if (!supportsPush()) return { enabled: false };
    const subscription = await getBrowserSubscription();
    if (subscription && userId()) {
      try {
        await cloud.client.from("push_subscriptions").delete()
          .eq("user_id", userId())
          .eq("endpoint", subscription.endpoint);
      } catch {}
      try { await subscription.unsubscribe(); } catch {}
    }
    currentSubscription = null;
    return { enabled: false, message: "Message notifications are off" };
  }

  async function syncCurrent(nextPairId = pairId()) {
    activePairId = nextPairId || null;
    if (!supportsPush() || Notification.permission !== "granted" || !activePairId || !userId()) return false;
    if (syncPromise) return syncPromise;
    syncPromise = (async () => {
      const subscription = await getBrowserSubscription();
      currentSubscription = subscription || null;
      if (subscription) await saveSubscription(subscription);
      return Boolean(subscription);
    })().catch(error => {
      console.warn("Koi push subscription sync failed", error);
      return false;
    }).finally(() => { syncPromise = null; });
    return syncPromise;
  }

  async function invokePush(body) {
    const { data, error } = await cloud.client.functions.invoke("chat-push", { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data || {};
  }

  async function notifyChatMessage(messageId) {
    if (!messageId || !navigator.onLine || !userId()) return false;
    try {
      await invokePush({ action: "send", messageId });
      return true;
    } catch (error) {
      console.warn("Koi chat push could not be sent", error);
      return false;
    }
  }

  async function notifyKoiNote(targetPairId = pairId()) {
    if (!targetPairId || !navigator.onLine || !userId()) return false;
    try {
      await invokePush({ action: "send-note", pairId: targetPairId });
      return true;
    } catch (error) {
      console.warn("Koi Note push could not be sent", error);
      return false;
    }
  }

  async function diagnose() {
    const result = {
      supported: supportsPush(),
      standalone: isStandalone(),
      permission: "Notification" in window ? Notification.permission : "unsupported",
      serviceWorker: false,
      browserSubscription: false,
      serverConfigured: false,
      serverSubscriptionCount: 0,
      serverError: ""
    };

    if (!result.supported) return result;
    try {
      await navigator.serviceWorker.ready;
      result.serviceWorker = true;
      const subscription = await getBrowserSubscription();
      currentSubscription = subscription || null;
      result.browserSubscription = Boolean(subscription);
    } catch (error) {
      result.serverError = String(error?.message || error);
    }

    try {
      await prefetchConfig({ force: true });
      result.serverConfigured = true;
      if (userId()) {
        const status = await invokePush({ action: "status" });
        result.serverConfigured = Boolean(status.configured);
        result.serverSubscriptionCount = Number(status.subscriptionCount || 0);
      }
    } catch (error) {
      result.serverError = String(error?.message || error);
    }
    return result;
  }

  async function test() {
    if (!isSubscribed()) throw new Error("Turn on message notifications on this phone first.");
    const data = await invokePush({ action: "test" });
    const sent = Number(data.sent || 0);
    if (sent < 1) throw new Error(data.reason || "Koi could not reach this device. Run notification check.");
    return { sent, message: "Test notification sent 🔔" };
  }

  function isSubscribed() {
    return supportsPush() && Notification.permission === "granted" && Boolean(currentSubscription);
  }

  if (supportsPush()) {
    // Step 31: the function's config action is public and returns only the public
    // VAPID key, so this can warm before sign-in and before the iOS user gesture.
    const warm = () => {
      if (cloud.configured) prefetchConfig().catch(() => {});
    };
    if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", warm, { once: true });
    else warm();

    navigator.serviceWorker.addEventListener("message", event => {
      if (event.data?.type === "KOI_OPEN_CHAT") {
        if (typeof window.navigate === "function") window.navigate("chat");
        else location.hash = "chat";
      }
      if (event.data?.type === "KOI_OPEN_HOME") {
        if (typeof window.navigate === "function") window.navigate("home");
        else location.hash = "home";
      }
    });
  }

  cloud.push = {
    supportsPush,
    isStandalone,
    prefetchConfig,
    enable,
    disable,
    syncCurrent,
    notifyChatMessage,
    notifyKoiNote,
    diagnose,
    test,
    isSubscribed,
    get permission() { return "Notification" in window ? Notification.permission : "unsupported"; }
  };
})();
