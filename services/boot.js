(() => {
  "use strict";
  const startedAt = performance.now();
  let finished = false;
  let watchdog = 0;

  function setStatus(text) {
    const el = document.getElementById("koiBootStatus");
    if (el && text) el.textContent = text;
  }

  function reveal() {
    if (finished) return;
    finished = true;
    clearTimeout(watchdog);
    const body = document.body;
    const splash = document.getElementById("koiBootSplash");
    const elapsed = performance.now() - startedAt;
    const wait = Math.max(0, 140 - elapsed);
    setTimeout(() => {
      body.classList.remove("koi-booting");
      body.classList.add("koi-ready");
      if (splash) {
        splash.classList.add("is-leaving");
        setTimeout(() => splash.remove(), 180);
      }
    }, wait);
  }

  watchdog = setTimeout(() => reveal(), 7000);
  window.KoiBoot = { ready: reveal, setStatus };
})();
