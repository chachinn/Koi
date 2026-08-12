(() => {
  "use strict";

  if (!("serviceWorker" in navigator) || !(location.protocol === "https:" || location.hostname === "localhost")) return;

  let registration = null;
  let reloadForUpdate = false;
  let lastUpdateCheck = 0;
  const CHECK_INTERVAL = 10 * 60 * 1000;

  function banner() {
    let el = document.getElementById("koiAppUpdateBanner");
    if (el) return el;
    el = document.createElement("aside");
    el.id = "koiAppUpdateBanner";
    el.className = "app-update-banner";
    el.hidden = true;
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.innerHTML = `
      <div class="app-update-copy">
        <strong>An update is available.</strong>
        <span>Refresh to update.</span>
      </div>
      <button type="button" class="app-update-button" id="koiAppUpdateButton">Update</button>
    `;
    document.body.appendChild(el);
    el.querySelector("#koiAppUpdateButton")?.addEventListener("click", applyUpdate);
    return el;
  }

  function showUpdate(reg = registration) {
    if (!reg?.waiting || !navigator.serviceWorker.controller) return;
    registration = reg;
    const el = banner();
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add("is-visible"));
  }

  function setUpdating() {
    const el = banner();
    const button = el.querySelector("#koiAppUpdateButton");
    const copy = el.querySelector(".app-update-copy");
    if (button) {
      button.disabled = true;
      button.textContent = "Updating…";
    }
    if (copy) copy.innerHTML = `<strong>Updating Koi…</strong><span>One tiny moment 💗</span>`;
  }

  async function applyUpdate() {
    if (!registration?.waiting) return;
    reloadForUpdate = true;
    setUpdating();
    try {
      window.KoiLocalState?.flushPersist?.();
      await window.KoiCloud?.sharedState?.flushLocal?.();
    } catch {}
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }

  function watch(reg) {
    registration = reg;
    if (reg.waiting) showUpdate(reg);

    reg.addEventListener("updatefound", () => {
      const worker = reg.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) showUpdate(reg);
      });
    });
  }

  async function checkForUpdate({ force = false } = {}) {
    if (!registration) return;
    const now = Date.now();
    if (!force && now - lastUpdateCheck < CHECK_INTERVAL) return;
    lastUpdateCheck = now;
    try { await registration.update(); } catch {}
    if (registration.waiting) showUpdate(registration);
  }

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!reloadForUpdate) return;
    reloadForUpdate = false;
    location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("service-worker.js");
      watch(reg);
      // Browser registration already checks for a new worker. A later idle check
      // avoids competing with auth, sync and first paint during app startup.
      const later = () => checkForUpdate({ force: true });
      if ("requestIdleCallback" in window) requestIdleCallback(later, { timeout: 12000 });
      else setTimeout(later, 10000);
    } catch (error) {
      console.warn("Koi update check unavailable", error);
    }
  }, { once: true });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForUpdate();
  });
  window.addEventListener("online", () => checkForUpdate());
  window.addEventListener("pageshow", event => {
    if (event.persisted) checkForUpdate();
  });

  window.KoiAppUpdate = { check: () => checkForUpdate({ force: true }) };
})();
