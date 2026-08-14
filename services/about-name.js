(() => {
  "use strict";

  const COPY = "Koi (恋) means “love” or “romance.” A simple name for a space made for two people—to share memories, plans, messages, and the little things that make a relationship theirs. The two koi in the icon form a heart, tying the name back to the idea of two people coming together in love.";

  function applyAboutNameCopy() {
    const card = document.querySelector(".about-koi-card");
    if (!card) return;
    const paragraph = Array.from(card.querySelectorAll("p")).find(node => !node.classList.contains("eyebrow"));
    if (paragraph && paragraph.textContent !== COPY) paragraph.textContent = COPY;
  }

  const main = document.getElementById("mainView");
  if (main) {
    const observer = new MutationObserver(() => requestAnimationFrame(applyAboutNameCopy));
    observer.observe(main, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyAboutNameCopy, { once: true });
  } else {
    applyAboutNameCopy();
  }
})();
