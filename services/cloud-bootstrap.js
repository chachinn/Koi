(() => {
  "use strict";

  const cloud = window.KoiCloud;
  if (!cloud) return;

  let activePairPayload = null;
  let currentSession = null;
  let booting = false;

  const localOpenAddLittleThing = typeof openAddLittleThing === "function" ? openAddLittleThing : null;
  const localOpenTwoSides = typeof openTwoSides === "function" ? openTwoSides : null;
  const localRenderYou = typeof renderYou === "function" ? renderYou : null;

  function html(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[char]));
  }

  async function copyText(value) {
    const text = String(value || "").trim();
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    }
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
      <div style="display:flex;align-items:center;gap:10px;margin:15px 0 12px;color:var(--ink-muted);font-size:11px;">
        <span style="height:1px;flex:1;background:var(--border);"></span>
        <span>OR</span>
        <span style="height:1px;flex:1;background:var(--border);"></span>
      </div>
      <button class="button button-secondary button-block" type="button" data-cloud-action="sign-in-google" aria-label="Continue with Google">
        <span aria-hidden="true" style="display:inline-grid;place-items:center;width:23px;height:23px;margin-right:7px;border-radius:50%;background:#fff;border:1px solid var(--border);font:700 14px Arial,sans-serif;">G</span>
        Continue with Google
      </button>
      <p class="micro muted cloud-security-note">Koi uses your browser-safe Supabase publishable key. Access to couple data is enforced in the database with Row Level Security.</p>
    `);
  }

  function anniversaryOptions(selected = "") {
    const now = new Date();
    const currentYear = now.getFullYear();
    const [selectedYear = "", selectedMonth = "", selectedDay = ""] = String(selected || "").split("-");
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const monthOptions = months.map((label, index) => {
      const value = String(index + 1).padStart(2, "0");
      return `<option value="${value}" ${value === selectedMonth ? "selected" : ""}>${label.slice(0, 3)}</option>`;
    }).join("");

    const dayOptions = Array.from({ length: 31 }, (_, index) => {
      const value = String(index + 1).padStart(2, "0");
      return `<option value="${value}" ${value === selectedDay ? "selected" : ""}>${index + 1}</option>`;
    }).join("");

    const yearOptions = Array.from({ length: 101 }, (_, index) => currentYear - index).map(year =>
      `<option value="${year}" ${String(year) === selectedYear ? "selected" : ""}>${year}</option>`
    ).join("");

    return { monthOptions, dayOptions, yearOptions };
  }

  function readAnniversary(form) {
    const month = String(form.get("anniversaryMonth") || "");
    const day = String(form.get("anniversaryDay") || "");
    const year = String(form.get("anniversaryYear") || "");

    if (!month && !day && !year) return null;
    if (!month || !day || !year) throw new Error("Choose the month, day, and year for your anniversary.");

    const iso = `${year}-${month}-${day}`;
    const candidate = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(candidate.getTime()) ||
        candidate.getFullYear() !== Number(year) ||
        candidate.getMonth() + 1 !== Number(month) ||
        candidate.getDate() !== Number(day)) {
      throw new Error("That anniversary date is not valid.");
    }

    if (candidate > new Date()) throw new Error("Your anniversary can't be in the future.");
    return iso;
  }

  function renderPairGate(message = "", anniversary = "") {
    const { monthOptions, dayOptions, yearOptions } = anniversaryOptions(anniversary);
    showGate(`
      <div class="cloud-gate-brand">Koi <span>💗</span></div>
      <p class="eyebrow">CONNECT YOUR TWO PHONES</p>
      <h1>Create your Koi, or join your partner.</h1>
      ${message ? `<div class="cloud-message">${html(message)}</div>` : ""}
      <div class="cloud-pair-grid">
        <form id="createPairForm" class="card card-pink form-grid cloud-create-pair-card">
          <h2>Create our Koi</h2>
          <p class="small muted">You'll get a one-time invite code for your partner.</p>
          <div class="field cloud-anniversary-field">
            <label>Anniversary</label>
            <div class="cloud-anniversary-picker" role="group" aria-label="Anniversary date">
              <select name="anniversaryMonth" aria-label="Anniversary month">
                <option value="">Month</option>${monthOptions}
              </select>
              <select name="anniversaryDay" aria-label="Anniversary day">
                <option value="">Day</option>${dayOptions}
              </select>
              <select name="anniversaryYear" aria-label="Anniversary year">
                <option value="">Year</option>${yearOptions}
              </select>
            </div>
          </div>
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
      <button class="card card-duo invite-code-card invite-code-copy" type="button" data-cloud-action="copy-invite" data-code="${html(code)}" aria-label="Copy invite code">
        <span class="micro muted">ONE-TIME PAIR CODE · TAP TO COPY</span>
        <strong>${html(code || "Open Pair menu to regenerate")}</strong>
        <span class="invite-copy-hint">Copy code</span>
      </button>
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
    state.pair.relationshipMode = payload.pair.relationship_mode || (payload.pair.wedding_anniversary ? "married" : (state.pair.relationshipMode || "dating"));
    state.pair.datingAnniversary = payload.pair.dating_anniversary || payload.pair.anniversary || state.pair.datingAnniversary || state.pair.anniversary;
    state.pair.weddingAnniversary = payload.pair.wedding_anniversary || "";
    state.pair.anniversary = state.pair.datingAnniversary || payload.pair.anniversary || state.pair.anniversary;
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

  function cloudMemoryToLocal(row) {
    const photos = (row.media || []).map(media => media.signed_url).filter(Boolean);
    const sides = {};
    for (const side of row.sides || []) {
      const member = cloud.runtime.members.find(item => item.user_id === side.user_id);
      const localId = side.user_id === currentSession?.user?.id ? "u1" : (member ? "u2" : "u2");
      sides[localId] = {
        text: side.side_text,
        submittedAt: new Date(side.created_at).getTime(),
        cloudUserId: side.user_id
      };
    }
    return {
      id: row.id,
      cloudId: row.id,
      type: row.memory_type === "two-sides" ? "two-sides" : "memory",
      title: row.title,
      date: row.happened_on || "",
      location: row.location || "",
      note: row.note || "",
      chapter: row.chapter || "Little Days",
      tags: row.tags || [],
      eraId: row.era_id || "",
      photo: photos[0] || "",
      photos,
      media: row.media || [],
      icon: row.memory_type === "two-sides" ? "♡♡" : "💗",
      sides,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
      syncStatus: "synced"
    };
  }

  async function refreshMemories({ quiet = false } = {}) {
    if (!cloud.runtime.ready || !activePairPayload?.pair?.id || !cloud.memories) return;
    try {
      const rows = await cloud.memories.list(activePairPayload.pair.id);
      state.memories = rows.map(cloudMemoryToLocal);
      saveState();
      render();
    } catch (error) {
      console.error("Koi memory sync failed", error);
      if (!quiet) toast(`Memory sync paused: ${error.message || "network error"}`);
    }
  }

  cloud.refreshMemories = refreshMemories;

  async function refreshPair({ quiet = true } = {}) {
    if (!currentSession) return;
    try {
      const fresh = await cloud.pairs.getMine();
      if (!fresh?.pair) return;
      await mapCloudPairToLocal(fresh);
      render();
    } catch (error) {
      console.error("Koi pair refresh failed", error);
      if (!quiet) toast(error.message || "Could not refresh your pair");
    }
  }

  cloud.refreshPair = refreshPair;

  async function connectPair(payload) {
    await mapCloudPairToLocal(payload);
    cloud.runtime.ready = true;
    document.documentElement.classList.add("koi-cloud-ready");
    hideGate();

    if (cloud.sharedState) {
      try {
        await cloud.sharedState.start(payload.pair.id, { initializeIfMissing: true });
      } catch (error) {
        console.error("Koi shared-state startup failed", error);
        toast("Some shared edits are waiting to sync");
      }
    }

    await cloud.sync.flush();
    await Promise.all([
      refreshLittleThings({ quiet: true }),
      refreshMemories({ quiet: true })
    ]);

    await cloud.littleThings.subscribe(payload.pair.id, async () => {
      await refreshLittleThings({ quiet: true });
      toast("Koi updated from your partner 💗");
    });

    if (cloud.memories) {
      await cloud.memories.subscribe(payload.pair.id, async () => {
        await refreshMemories({ quiet: true });
      });
    }

    if (cloud.pairs?.subscribe) {
      await cloud.pairs.subscribe(payload.pair.id, async () => {
        await refreshPair({ quiet: true });
      });
    }

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

  // Cloud-aware Two Sides reveal: partner text is only returned after both have submitted.
  if (localOpenTwoSides) {
    openTwoSides = async function openTwoSidesCloudAware(id) {
      if (cloud.runtime.ready && cloud.memories) {
        try {
          const revealed = await cloud.memories.getRevealedSides(id);
          if (revealed.length) {
            const item = state.memories.find(entry => entry.id === id);
            if (item) {
              item.sides ||= {};
              for (const side of revealed) {
                const localId = side.user_id === currentSession?.user?.id ? "u1" : "u2";
                item.sides[localId] = {
                  text: side.side_text,
                  submittedAt: new Date(side.created_at).getTime(),
                  cloudUserId: side.user_id
                };
              }
              saveState();
            }
          }
        } catch (error) {
          console.warn("Could not check Two Sides reveal", error);
        }
      }
      return localOpenTwoSides(id);
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
        <p class="eyebrow">KOI CLOUD</p>
        <h3>${html(cloudStatusText())}</h3>
        <p class="small muted">${cloud.runtime.ready ? "Profiles, relationship details, shared colors/wallpaper, Little Things, Memories, and several shared Koi collections now sync through your private pair. Private-answer features remain separated until their dedicated cloud flows are enabled." : "Cloud setup is optional until you fill in config/supabase-config.js."}</p>
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
        ${members.length < 2 && inviteCode ? `<button class="card card-lavender invite-code-card invite-code-copy" type="button" data-cloud-action="copy-invite" data-code="${html(inviteCode)}"><span class="micro muted">ACTIVE INVITE CODE · TAP TO COPY</span><strong>${html(inviteCode)}</strong><span class="invite-copy-hint">Copy code</span></button>` : ""}
        ${members.length < 2 ? `<button class="button button-primary button-block" data-cloud-action="regenerate-invite">Generate new invite code</button>` : ""}
        <button class="button button-ghost button-block" data-cloud-action="sign-out">Sign out</button>
      `
    });
  }

  async function signOutAndReset() {
    try {
      await Promise.all([
        cloud.memories?.unsubscribe?.(),
        cloud.sharedState?.unsubscribe?.(),
        cloud.pairs?.unsubscribe?.()
      ]);
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

  // Cloud-backed memory deletion, including private Storage cleanup.
  document.addEventListener("click", async event => {
    if (!cloud.runtime.ready || !cloud.memories) return;
    const button = event.target.closest('[data-action="delete-memory"]');
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    if (!confirm("Delete this memory and its photos from both phones?")) return;

    const id = button.dataset.id;
    const before = [...state.memories];
    state.memories = state.memories.filter(item => item.id !== id);
    saveState(); closeModal(); render();

    try {
      await cloud.memories.remove(id);
      await refreshMemories({ quiet: true });
      toast("Memory deleted from Koi Cloud");
    } catch (error) {
      state.memories = before;
      saveState(); render();
      toast(error.message || "Could not delete this memory");
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

    if (action === "copy-invite") {
      const copied = await copyText(button.dataset.code || button.querySelector("strong")?.textContent || "");
      toast(copied ? "Invite code copied 💗" : "Press and hold the code to copy");
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

    if (action === "sign-in-google") {
      const originalHTML = button.innerHTML;
      button.disabled = true;
      button.textContent = "Opening Google…";
      try {
        await cloud.auth.signInWithGoogle();
      } catch (error) {
        button.disabled = false;
        button.innerHTML = originalHTML;
        renderAuthGate(error.message || "Could not open Google sign-in.");
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
      let anniversary = null;
      try {
        anniversary = readAnniversary(form);
        const payload = await cloud.pairs.create({ anniversary });
        activePairPayload = payload;
        renderInviteReady(payload);
      } catch (error) {
        renderPairGate(error.message || "Could not create pair.", anniversary || "");
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

  async function refreshAllCloudData({ showToast = false } = {}) {
    if (!cloud.runtime.ready) return;
    await cloud.sync.flush();
    await Promise.all([
      refreshLittleThings({ quiet: true }),
      refreshMemories({ quiet: true }),
      cloud.sharedState?.refresh?.(),
      refreshPair({ quiet: true })
    ]);
    await cloud.sharedState?.flushLocal?.();
    if (showToast) toast("Koi is back online");
  }

  window.addEventListener("online", () => refreshAllCloudData({ showToast: true }));

  // iOS suspends background PWAs. Refresh immediately whenever Koi becomes visible
  // again so a partner's edits are never dependent on a still-open WebSocket.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshAllCloudData();
  });
  window.addEventListener("pageshow", () => refreshAllCloudData());

  cloud.auth.onChange(async (event, session) => {
    currentSession = session;
    if (event === "SIGNED_OUT") {
      await Promise.all([
        cloud.memories?.unsubscribe?.(),
        cloud.sharedState?.unsubscribe?.(),
        cloud.pairs?.unsubscribe?.()
      ]);
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
