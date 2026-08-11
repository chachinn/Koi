(() => {
  "use strict";

  const cloud = window.KoiCloud;
  if (!cloud) return;

  let activePairPayload = null;
  let currentSession = null;
  let booting = false;

  const localOpenAddLittleThing = typeof openAddLittleThing === "function" ? openAddLittleThing : null;
  const localRenderYou = typeof renderYou === "function" ? renderYou : null;

  function html(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[char]));
  }

  function ensureGate() {
    let gate = document.getElementById("cloudGate");
    if (gate) return gate;
    gate = document.createElement("div");
    gate.id = "cloudGate";
    gate.className = "cloud-gate";
    gate.hidden = true;
    document.body.appendChild(gate);
    return gate;
  }

  function showGate(inner) {
    const gate = ensureGate();
    gate.innerHTML = `<div class="cloud-gate-card glass-card">${inner}</div>`;
    gate.hidden = false;
  }

  function hideGate() {
    const gate = ensureGate();
    gate.hidden = true;
    gate.innerHTML = "";
  }

  function cloudStatusText() {
    if (!cloud.configured) return "Not connected";
    if (!currentSession) return "Signed out";
    if (!activePairPayload?.pair) return "Account ready · pair not connected";
    return `Synced · ${cloud.runtime.members.length}/2 people connected`;
  }

  function renderAuthGate(message = "") {
    showGate(`
      <div class="cloud-gate-brand">Koi <span>💗</span></div>
      <p class="eyebrow">KOI CLOUD</p>
      <h1>Your private space, on both phones.</h1>
      <p class="lead">Create your own account, then connect exactly one partner.</p>
      ${message ? `<div class="cloud-message">${html(message)}</div>` : ""}
      <div class="cloud-auth-tabs">
        <button class="is-active" data-cloud-action="show-sign-in">Sign in</button>
        <button data-cloud-action="show-sign-up">Create account</button>
      </div>
      <form id="cloudAuthForm" class="form-grid">
        <input type="hidden" name="mode" value="signin">
        <div class="field cloud-signup-name" hidden><label>Your name</label><input name="displayName" maxlength="60" autocomplete="name"></div>
        <div class="field"><label>Email</label><input name="email" type="email" required autocomplete="email"></div>
        <div class="field"><label>Password</label><input name="password" type="password" minlength="8" required autocomplete="current-password"></div>
        <button class="button button-primary button-block" type="submit">Sign in 💗</button>
      </form>
      <button class="button button-ghost button-block" data-cloud-action="forgot-password">Forgot password?</button>
      <p class="micro muted cloud-security-note">Koi uses your browser-safe Supabase publishable key. Access to couple data is enforced in the database with Row Level Security.</p>
    `);
  }

  function renderPairGate(message = "") {
    showGate(`
      <div class="cloud-gate-brand">Koi <span>💗</span></div>
      <p class="eyebrow">CONNECT YOUR TWO PHONES</p>
      <h1>Create your Koi, or join your partner.</h1>
      ${message ? `<div class="cloud-message">${html(message)}</div>` : ""}
      <div class="cloud-pair-grid">
        <form id="createPairForm" class="card card-pink form-grid">
          <h2>Create our Koi</h2>
          <p class="small muted">You'll get a one-time invite code for your partner.</p>
          <div class="field"><label>Anniversary</label><input name="anniversary" type="date"></div>
          <button class="button button-primary" type="submit">Create pair</button>
        </form>
        <form id="joinPairForm" class="card card-lavender form-grid">
          <h2>Join my partner</h2>
          <p class="small muted">Enter the invite code shown on your partner's phone.</p>
          <div class="field"><label>Invite code</label><input name="inviteCode" required maxlength="20" placeholder="KOI-AB12CD34EF56" autocapitalize="characters"></div>
          <button class="button button-secondary" type="submit">Join pair</button>
        </form>
      </div>
      <button class="button button-ghost button-block" data-cloud-action="sign-out">Use another account</button>
    `);
  }

  function renderInviteReady(payload) {
    const code = payload?.invite?.code || payload?.pair?.invite_code || "";
    showGate(`
      <div class="cloud-gate-brand">Koi <span>💗</span></div>
      <p class="eyebrow">YOUR KOI IS READY</p>
      <h1>Invite your person.</h1>
      <article class="card card-duo invite-code-card">
        <span class="micro muted">ONE-TIME PAIR CODE</span>
        <strong>${html(code || "Open Pair menu to regenerate")}</strong>
      </article>
      <p class="small muted">Your partner creates their own Koi account and enters this code. The code expires automatically.</p>
      <button class="button button-primary button-block" data-cloud-action="continue-to-koi">Continue to Koi</button>
    `);
  }

  async function mapCloudPairToLocal(payload) {
    if (!payload?.pair || !currentSession?.user) return;
    activePairPayload = payload;
    cloud.runtime.pair = payload.pair;
    cloud.runtime.members = payload.members || [];

    const meCloud = cloud.runtime.members.find(member => member.user_id === currentSession.user.id);
    const partnerCloud = cloud.runtime.members.find(member => member.user_id !== currentSession.user.id);

    state.currentUserId = "u1";
    state.profiles[0].displayName = meCloud?.display_name || currentSession.user.user_metadata?.display_name || currentSession.user.email?.split("@")[0] || "You";
    state.profiles[0].avatar = meCloud?.avatar || "🌷";
    state.profiles[1].displayName = partnerCloud?.display_name || "Waiting for partner";
    state.profiles[1].avatar = partnerCloud?.avatar || "☁️";

    state.pair.pairId = payload.pair.id;
    state.pair.anniversary = payload.pair.anniversary || state.pair.anniversary;
    state.pair.inviteCode = payload.invite?.code || "";
    state.onboardingComplete = true;

    saveState();
  }

  function cloudToLocalLittleThing(row) {
    const meId = currentSession?.user?.id;
    return {
      id: row.id,
      cloudId: row.id,
      clientId: row.client_id,
      text: row.text,
      date: row.happened_on,
      category: row.category || "Everyday",
      userId: row.created_by === meId ? "u1" : "u2",
      aboutUserId: row.about_user_id === meId ? "u1" : "u2",
      createdAt: new Date(row.created_at).getTime(),
      syncStatus: "synced"
    };
  }

  async function refreshLittleThings({ quiet = false } = {}) {
    if (!cloud.runtime.ready || !activePairPayload?.pair?.id) return;
    try {
      const rows = await cloud.littleThings.list(activePairPayload.pair.id);
      state.littleThings = rows.map(cloudToLocalLittleThing);
      saveState();
      render();
    } catch (error) {
      console.error("Koi cloud refresh failed", error);
      if (!quiet) toast(`Sync paused: ${error.message || "network error"}`);
    }
  }

  async function connectPair(payload) {
    await mapCloudPairToLocal(payload);
    cloud.runtime.ready = true;
    document.documentElement.classList.add("koi-cloud-ready");
    hideGate();

    await cloud.sync.flush();
    await refreshLittleThings({ quiet: true });

    await cloud.littleThings.subscribe(payload.pair.id, async () => {
      await refreshLittleThings({ quiet: true });
      toast("Koi updated from your partner 💗");
    });

    render();
  }

  async function loadAccountAndPair() {
    const payload = await cloud.pairs.getMine();
    if (!payload?.pair) {
      cloud.runtime.ready = false;
      renderPairGate();
      return;
    }
    await connectPair(payload);
  }

  async function boot() {
    if (booting || !cloud.configured) return;
    booting = true;
    try {
      currentSession = await cloud.auth.getSession();
      if (!currentSession) {
        cloud.runtime.ready = false;
        renderAuthGate();
      } else {
        await loadAccountAndPair();
      }
    } catch (error) {
      console.error(error);
      renderAuthGate(`Could not connect to Koi Cloud: ${error.message || error}`);
    } finally {
      booting = false;
    }
  }

  // Cloud-aware Little Things: first feature migrated end-to-end.
  if (localOpenAddLittleThing) {
    openAddLittleThing = function openAddLittleThingCloudAware() {
      if (!cloud.runtime.ready || !activePairPayload?.pair) {
        return localOpenAddLittleThing();
      }

      openModal({
        eyebrow: "LITTLE THINGS · SYNCED",
        title: `What did ${partnerProfile().displayName} do?`,
        html: `<form id="littleThingForm" class="form-grid">
          <div class="field"><label>The little thing</label><textarea name="text" required maxlength="400" placeholder="Brought me coffee without me asking."></textarea></div>
          <div class="two-grid">
            <div class="field"><label>Date</label><input name="date" type="date" value="${todayKey()}"></div>
            <div class="field"><label>Category</label><select name="category">${(DATA.littleThingCategories || ["Everyday"]).map(value => `<option>${escapeHTML(value)}</option>`).join("")}</select></div>
          </div>
          <button class="button button-primary" type="submit">Keep this little thing 💗</button>
        </form>`
      });

      document.getElementById("littleThingForm").addEventListener("submit", async event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const item = {
          clientId: `lt_${crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`,
          text: String(form.get("text") || "").trim(),
          date: String(form.get("date") || todayKey()),
          category: String(form.get("category") || "Everyday"),
          aboutUserId: cloud.runtime.members.find(member => member.user_id !== currentSession.user.id)?.user_id || null
        };

        if (!navigator.onLine) {
          cloud.sync.enqueue("littleThing:create", item);
          state.littleThings.unshift({
            id: item.clientId,
            ...item,
            userId: "u1",
            aboutUserId: "u2",
            createdAt: Date.now(),
            syncStatus: "pending"
          });
          saveState();
          closeModal();
          render();
          toast("Saved offline · Koi will sync when you're back");
          return;
        }

        try {
          await cloud.littleThings.create(activePairPayload.pair.id, item);
          closeModal();
          await refreshLittleThings({ quiet: true });
          toast("Saved to both phones 💗");
        } catch (error) {
          cloud.sync.enqueue("littleThing:create", item);
          closeModal();
          toast("Saved to sync queue");
        }
      });
    };
  }

  // Add production cloud status to the You screen.
  if (localRenderYou) {
    renderYou = function renderYouFoundation2() {
      localRenderYou();
      const page = mainView.querySelector(".page");
      if (!page) return;
      const card = document.createElement("article");
      card.className = "card card-duo cloud-status-card";
      card.innerHTML = `
        <p class="eyebrow">KOI CLOUD FOUNDATION 2.0</p>
        <h3>${html(cloudStatusText())}</h3>
        <p class="small muted">${cloud.runtime.ready ? "Little Things are now using the shared cloud database and private realtime channel. Other Koi features remain local until they are migrated one by one." : "Cloud setup is optional until you fill in config/supabase-config.js."}</p>
        ${cloud.runtime.ready ? `<div class="inline-actions"><button data-cloud-action="show-pair-info">Pair details</button><button data-cloud-action="sign-out">Sign out</button></div>` : ""}
      `;
      page.appendChild(card);
    };
  }

  async function renderPairInfo() {
    try {
      const fresh = await cloud.pairs.getMine();
      if (fresh?.pair) await mapCloudPairToLocal(fresh);
    } catch (error) {
      console.warn("Could not refresh pair details", error);
    }

    const pair = activePairPayload?.pair;
    const members = cloud.runtime.members || [];
    if (!pair) return renderPairGate();
    const inviteCode = activePairPayload?.invite?.code || state.pair.inviteCode || "";

    openModal({
      eyebrow: "YOUR PRIVATE PAIR",
      title: `${members.length}/2 connected`,
      html: `
        <article class="card card-duo">
          <p class="small muted">Pair ID</p>
          <p class="micro">${html(pair.id)}</p>
          <div class="memory-list" style="margin-top:10px">
            ${members.map(member => `<div class="memory-item"><div class="memory-thumb">${html(member.avatar || "♡")}</div><div><h3>${html(member.display_name || "Koi user")}</h3><p>${member.user_id === currentSession?.user?.id ? "This phone" : "Partner"} · ${html(member.role || "member")}</p></div></div>`).join("")}
          </div>
        </article>
        ${members.length < 2 && inviteCode ? `<article class="card card-lavender invite-code-card"><span class="micro muted">ACTIVE INVITE CODE</span><strong>${html(inviteCode)}</strong><p class="small muted">Share this one-time code with your partner.</p></article>` : ""}
        ${members.length < 2 ? `<button class="button button-primary button-block" data-cloud-action="regenerate-invite">Generate new invite code</button>` : ""}
        <button class="button button-ghost button-block" data-cloud-action="sign-out">Sign out</button>
      `
    });
  }

  async function signOutAndReset() {
    try {
      await cloud.auth.signOut();
    } finally {
      currentSession = null;
      activePairPayload = null;
      cloud.runtime.ready = false;
      document.documentElement.classList.remove("koi-cloud-ready");
      cloud.sync.clear();
      state.currentUserId = "u1";
      renderAuthGate("Signed out.");
    }
  }

  // Capture migrated delete action before the local-only Build 1 handler sees it.
  document.addEventListener("click", async event => {
    if (!cloud.runtime.ready) return;
    const button = event.target.closest('[data-action="delete-little-thing"]');
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const item = state.littleThings.find(entry => entry.id === button.dataset.id);
    if (!item) return;

    state.littleThings = state.littleThings.filter(entry => entry.id !== item.id);
    saveState();
    render();

    if (!navigator.onLine) {
      if (item.cloudId) cloud.sync.enqueue("littleThing:delete", { id: item.cloudId });
      toast("Deleted locally · sync queued");
      return;
    }

    try {
      if (item.cloudId || item.id) await cloud.littleThings.remove(item.cloudId || item.id);
      await refreshLittleThings({ quiet: true });
    } catch (error) {
      if (item.cloudId) cloud.sync.enqueue("littleThing:delete", { id: item.cloudId });
      toast("Delete queued for sync");
    }
  }, true);

  // Real accounts replace the old same-device profile switcher.
  document.addEventListener("click", event => {
    if (!cloud.runtime.ready) return;
    const switchButton = event.target.closest('[data-action="switch-profile"]');
    if (!switchButton) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toast("You're signed in as yourself on this phone 💗");
  }, true);

  // Intercept the old local tester pair-menu button once real cloud pairing is active.
  document.getElementById("openPairMenuBtn")?.addEventListener("click", event => {
    if (!cloud.runtime.ready) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    renderPairInfo();
  }, true);

  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-cloud-action]");
    if (!button) return;
    const action = button.dataset.cloudAction;

    if (action === "show-sign-up" || action === "show-sign-in") {
      const signUp = action === "show-sign-up";
      const form = document.getElementById("cloudAuthForm");
      if (!form) return;
      form.elements.mode.value = signUp ? "signup" : "signin";
      form.querySelector(".cloud-signup-name").hidden = !signUp;
      form.querySelector('input[name="password"]').autocomplete = signUp ? "new-password" : "current-password";
      form.querySelector('button[type="submit"]').textContent = signUp ? "Create account 💗" : "Sign in 💗";
      document.querySelectorAll(".cloud-auth-tabs button").forEach(btn => btn.classList.toggle("is-active", btn === button));
      return;
    }

    if (action === "forgot-password") {
      const email = document.querySelector('#cloudAuthForm input[name="email"]')?.value?.trim();
      if (!email) return toast("Enter your email first");
      try {
        await cloud.auth.requestPasswordReset(email);
        toast("Password reset email sent");
      } catch (error) {
        toast(error.message || "Could not send reset email");
      }
      return;
    }

    if (action === "sign-out") return signOutAndReset();
    if (action === "continue-to-koi") return loadAccountAndPair();
    if (action === "show-pair-info") return renderPairInfo();

    if (action === "regenerate-invite") {
      try {
        const payload = await cloud.pairs.regenerateInvite();
        activePairPayload = { ...(activePairPayload || {}), ...payload };
        closeModal();
        renderInviteReady(activePairPayload);
      } catch (error) {
        toast(error.message || "Could not generate invite");
      }
    }
  });

  document.addEventListener("submit", async event => {
    if (event.target?.id === "cloudAuthForm") {
      event.preventDefault();
      const form = new FormData(event.target);
      const mode = String(form.get("mode") || "signin");
      const email = String(form.get("email") || "").trim();
      const password = String(form.get("password") || "");
      const displayName = String(form.get("displayName") || "").trim();

      try {
        if (mode === "signup") {
          const data = await cloud.auth.signUp({ email, password, displayName });
          if (!data.session) {
            renderAuthGate("Account created. Confirm your email, then sign in.");
            return;
          }
          currentSession = data.session;
        } else {
          const data = await cloud.auth.signIn({ email, password });
          currentSession = data.session;
        }
        await loadAccountAndPair();
      } catch (error) {
        renderAuthGate(error.message || "Could not sign in.");
      }
      return;
    }

    if (event.target?.id === "createPairForm") {
      event.preventDefault();
      const form = new FormData(event.target);
      try {
        const payload = await cloud.pairs.create({
          anniversary: String(form.get("anniversary") || "") || null
        });
        activePairPayload = payload;
        renderInviteReady(payload);
      } catch (error) {
        renderPairGate(error.message || "Could not create pair.");
      }
      return;
    }

    if (event.target?.id === "joinPairForm") {
      event.preventDefault();
      const form = new FormData(event.target);
      try {
        const payload = await cloud.pairs.join(String(form.get("inviteCode") || ""));
        currentSession = await cloud.auth.getSession();
        await connectPair(payload);
        toast("You two are connected 💗");
      } catch (error) {
        renderPairGate(error.message || "Could not join this Koi.");
      }
    }
  });

  window.addEventListener("online", async () => {
    if (!cloud.runtime.ready) return;
    await cloud.sync.flush();
    await refreshLittleThings({ quiet: true });
    toast("Koi is back online");
  });

  cloud.auth.onChange(async (event, session) => {
    currentSession = session;
    if (event === "SIGNED_OUT") {
      activePairPayload = null;
      cloud.runtime.ready = false;
      document.documentElement.classList.remove("koi-cloud-ready");
      renderAuthGate();
    }
  });

  if (!cloud.configured) {
    console.info("Koi Cloud Foundation is installed but not configured. Local mode remains active.");
    return;
  }

  boot();
})();
