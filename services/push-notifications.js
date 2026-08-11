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
    return Boolean(
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }

  function userId() {
    return cloud.runtime?.session?.user?.id || null;
  }

  function pairId() {
    return activePairId || cloud.runtime?.pair?.id || null;
  }

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
      if (!key) throw new Error("Push notifications are not configured yet.");
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

    const { error } = await cloud.client
      .from("push_subscriptions")
      .upsert({
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

  async function enable() {
    if (!supportsPush()) throw new Error("Push notifications are not supported on this device.");
    if (!userId() || !pairId()) throw new Error("Connect your Koi pair first.");

    // Keep the permission request directly attached to the user's tap. This is
    // required by iOS Home Screen web apps and avoids blocked permission prompts.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error(permission === "denied"
        ? "Notifications are blocked. Allow Koi in your device notification settings."
        : "Notification permission was not granted.");
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const publicKey = cachedPublicKey || await prefetchConfig();
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
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription && userId()) {
      try {
        await cloud.client
          .from("push_subscriptions")
          .delete()
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
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      currentSubscription = subscription || null;
      if (subscription) await saveSubscription(subscription);
      return Boolean(subscription);
    })().catch(error => {
      console.warn("Koi push subscription sync failed", error);
      return false;
    }).finally(() => { syncPromise = null; });
    return syncPromise;
  }

  async function notifyChatMessage(messageId) {
    if (!messageId || !navigator.onLine || !userId()) return false;
    try {
      const { error } = await cloud.client.functions.invoke("chat-push", {
        body: { action: "send", messageId }
      });
      if (error) throw error;
      return true;
    } catch (error) {
      // Push is best-effort. A notification outage must never make chat feel slow
      // or make a successfully saved message appear failed.
      console.warn("Koi chat push could not be sent", error);
      return false;
    }
  }

  function isSubscribed() {
    return supportsPush() && Notification.permission === "granted" && Boolean(currentSubscription);
  }

  if (supportsPush()) {
    // Warm the public VAPID key before the user taps Enable so iOS can keep the
    // actual permission/subscription flow close to the direct user gesture.
    window.addEventListener("load", () => {
      if (cloud.configured) prefetchConfig().catch(() => {});
    }, { once: true });

    navigator.serviceWorker.addEventListener("message", event => {
      if (event.data?.type === "KOI_OPEN_CHAT") {
        if (typeof window.navigate === "function") window.navigate("chat");
        else location.hash = "chat";
      }
    });
  }

  cloud.push = {
    supportsPush,
    prefetchConfig,
    enable,
    disable,
    syncCurrent,
    notifyChatMessage,
    isSubscribed,
    get permission() { return "Notification" in window ? Notification.permission : "unsupported"; }
  };
})();
