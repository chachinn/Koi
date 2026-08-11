(() => {
  "use strict";

  const cloud = window.KoiCloud;
  if (!cloud) return;

  const BUCKET = "koi-media";
  let activePairId = null;
  let channel = null;
  let syncTimer = null;
  let lastSnapshot = null;
  let wallpaperPath = "";
  let applyingRemote = false;
  let syncInFlight = false;
  let syncAgain = false;

  function api() {
    return window.KoiLocalState || null;
  }

  function getState() {
    return api()?.get?.() || null;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeLore(items = []) {
    return items.map(item => {
      const copy = { ...item };
      // Lore photos are still local for now. Avoid storing large data URLs in Postgres.
      delete copy.photo;
      return copy;
    });
  }

  function snapshotFromLocal() {
    const state = getState();
    if (!state) return {};

    return {
      us_details: {
        currentEra: state.pair?.currentEra || "",
        comfortFood: state.pair?.comfortFood || "",
        song: state.pair?.song || "",
        nextDate: state.pair?.nextDate || "",
        nextDateLabel: state.pair?.nextDateLabel || ""
      },
      appearance: {
        themePair: state.settings?.themePair || "wedding",
        customColorOne: state.settings?.customColorOne || "#F3B8D0",
        customColorTwo: state.settings?.customColorTwo || "#D7C4F2",
        wallpaper: state.settings?.wallpaper || "petals",
        customWallpaperEnabled: Boolean(state.settings?.customWallpaperEnabled && wallpaperPath),
        customWallpaperOverlay: state.settings?.customWallpaperOverlay || "medium",
        customWallpaperPosition: state.settings?.customWallpaperPosition || "center",
        customWallpaperPath: wallpaperPath || ""
      },
      questions: {
        questionPack: state.settings?.questionPack || "all",
        customQuestions: clone(state.customQuestions || []),
        dailyQuestionOverrides: clone(state.dailyQuestionOverrides || {})
      },
      lore: safeLore(clone(state.lore || [])),
      dates: {
        dateIdeas: clone(state.dateIdeas || []),
        dateCompletions: clone(state.dateCompletions || [])
      },
      eras: {
        eras: clone(state.eras || []),
        activeEraId: state.activeEraId || ""
      },
      traditions: {
        traditions: clone(state.traditions || []),
        dismissedTraditionSuggestions: clone(state.dismissedTraditionSuggestions || [])
      },
      museum: clone(state.museum || { featuredIds: [] }),
      room: clone(state.room || {})
    };
  }

  function domainChanged(a, b) {
    return JSON.stringify(a) !== JSON.stringify(b);
  }

  function diffSnapshot(next, previous) {
    if (!previous) return next;
    const patch = {};
    Object.keys(next).forEach(key => {
      if (domainChanged(next[key], previous[key])) patch[key] = next[key];
    });
    return patch;
  }

  async function signedWallpaperUrl(path) {
    if (!path) return "";
    const { data, error } = await cloud.client.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (error) throw error;
    return data?.signedUrl || "";
  }

  async function applyRemote(data = {}, { persist = true } = {}) {
    const state = getState();
    if (!state) return;

    applyingRemote = true;
    cloud.runtime.applyingRemote = true;
    try {
      if (data.us_details) {
        const details = data.us_details;
        ["currentEra", "comfortFood", "song", "nextDate", "nextDateLabel"].forEach(key => {
          if (key in details) state.pair[key] = details[key] ?? "";
        });
      }

      if (data.appearance) {
        const appearance = data.appearance;
        wallpaperPath = appearance.customWallpaperPath || "";
        if (appearance.themePair) state.settings.themePair = appearance.themePair;
        if (appearance.customColorOne) state.settings.customColorOne = appearance.customColorOne;
        if (appearance.customColorTwo) state.settings.customColorTwo = appearance.customColorTwo;
        if (appearance.wallpaper) state.settings.wallpaper = appearance.wallpaper;
        if (appearance.customWallpaperOverlay) state.settings.customWallpaperOverlay = appearance.customWallpaperOverlay;
        if (appearance.customWallpaperPosition) state.settings.customWallpaperPosition = appearance.customWallpaperPosition;
        state.settings.customWallpaperEnabled = Boolean(appearance.customWallpaperEnabled && wallpaperPath);
        if (wallpaperPath) {
          try {
            state.settings.customWallpaperPhoto = await signedWallpaperUrl(wallpaperPath);
          } catch (error) {
            console.warn("Koi wallpaper signed URL refresh failed", error);
            state.settings.customWallpaperPhoto = "";
            state.settings.customWallpaperEnabled = false;
          }
        } else {
          state.settings.customWallpaperPhoto = "";
          state.settings.customWallpaperEnabled = false;
        }
      }

      if (data.questions) {
        if (data.questions.questionPack) state.settings.questionPack = data.questions.questionPack;
        if (Array.isArray(data.questions.customQuestions)) state.customQuestions = clone(data.questions.customQuestions);
        if (data.questions.dailyQuestionOverrides && typeof data.questions.dailyQuestionOverrides === "object") {
          state.dailyQuestionOverrides = clone(data.questions.dailyQuestionOverrides);
        }
      }

      if (Array.isArray(data.lore)) {
        const localPhotos = new Map((state.lore || []).map(item => [item.id, item.photo || ""]));
        state.lore = clone(data.lore).map(item => ({ ...item, photo: localPhotos.get(item.id) || "" }));
      }

      if (data.dates) {
        if (Array.isArray(data.dates.dateIdeas)) state.dateIdeas = clone(data.dates.dateIdeas);
        if (Array.isArray(data.dates.dateCompletions)) state.dateCompletions = clone(data.dates.dateCompletions);
      }

      if (data.eras) {
        if (Array.isArray(data.eras.eras)) state.eras = clone(data.eras.eras);
        if (typeof data.eras.activeEraId === "string") state.activeEraId = data.eras.activeEraId;
      }

      if (data.traditions) {
        if (Array.isArray(data.traditions.traditions)) state.traditions = clone(data.traditions.traditions);
        if (Array.isArray(data.traditions.dismissedTraditionSuggestions)) {
          state.dismissedTraditionSuggestions = clone(data.traditions.dismissedTraditionSuggestions);
        }
      }

      if (data.museum && typeof data.museum === "object") state.museum = clone(data.museum);
      if (data.room && typeof data.room === "object") state.room = clone(data.room);

      lastSnapshot = snapshotFromLocal();
      if (persist) api()?.persistRemote?.();
      api()?.render?.();
    } finally {
      applyingRemote = false;
      cloud.runtime.applyingRemote = false;
    }
  }

  async function readRow(pairId) {
    const { data, error } = await cloud.client
      .from("pair_shared_state")
      .select("pair_id,data,updated_at,updated_by")
      .eq("pair_id", pairId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function patch(pairId, patchData) {
    if (!pairId || !patchData || !Object.keys(patchData).length) return null;
    const { data, error } = await cloud.client.rpc("patch_pair_shared_state", {
      p_pair_id: pairId,
      p_patch: patchData
    });
    if (error) throw error;
    return data || {};
  }

  async function flushLocal() {
    if (!cloud.runtime.ready || !activePairId || applyingRemote || cloud.runtime.applyingRemote) return;
    if (syncInFlight) {
      syncAgain = true;
      return;
    }

    syncInFlight = true;
    try {
      const next = snapshotFromLocal();
      const patchData = diffSnapshot(next, lastSnapshot);
      if (!Object.keys(patchData).length) return;
      const merged = await patch(activePairId, patchData);
      lastSnapshot = next;
      if (merged && typeof merged === "object") {
        // Keep the local baseline aligned with the merged server document without
        // re-applying it; our local edit already contains the same changed domains.
        lastSnapshot = snapshotFromLocal();
      }
    } catch (error) {
      console.error("Koi shared edit sync failed", error);
    } finally {
      syncInFlight = false;
      if (syncAgain) {
        syncAgain = false;
        setTimeout(flushLocal, 120);
      }
    }
  }

  function scheduleFromLocal() {
    if (!cloud.runtime.ready || !activePairId || applyingRemote || cloud.runtime.applyingRemote) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(flushLocal, 260);
  }

  async function load(pairId, { initializeIfMissing = true } = {}) {
    activePairId = pairId;
    const row = await readRow(pairId);
    if (row?.data && Object.keys(row.data).length) {
      await applyRemote(row.data);
      return row.data;
    }

    const initial = snapshotFromLocal();
    lastSnapshot = initial;
    if (initializeIfMissing) {
      const merged = await patch(pairId, initial);
      if (merged) lastSnapshot = snapshotFromLocal();
    }
    return initial;
  }

  async function refresh() {
    if (!activePairId) return;
    const row = await readRow(activePairId);
    if (row?.data) await applyRemote(row.data);
  }

  async function subscribe(pairId, onChange) {
    await unsubscribe();
    activePairId = pairId;
    await cloud.client.realtime.setAuth();
    channel = cloud.client
      .channel(`pair:${pairId}:pair_shared_state`, { config: { private: true } })
      .on("broadcast", { event: "*" }, async payload => {
        await refresh();
        onChange?.(payload);
      })
      .subscribe();
    cloud.runtime.sharedStateChannel = channel;
    return channel;
  }

  async function start(pairId, options = {}) {
    await load(pairId, options);
    await subscribe(pairId);
  }

  async function unsubscribe() {
    clearTimeout(syncTimer);
    syncTimer = null;
    if (channel) {
      await cloud.client.removeChannel(channel).catch(() => {});
      channel = null;
    }
    cloud.runtime.sharedStateChannel = null;
  }

  async function uploadWallpaper(file) {
    if (!activePairId) throw new Error("No Koi pair is connected.");
    if (!file || !String(file.type || "").startsWith("image/")) throw new Error("Choose an image file.");

    let blob = file;
    if (typeof window.compressImage === "function") {
      const dataUrl = await window.compressImage(file, 1600, 0.78);
      blob = await fetch(dataUrl).then(response => response.blob());
    }

    const oldPath = wallpaperPath;
    const path = `${activePairId}/appearance/wallpaper-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}.jpg`;
    const { error: uploadError } = await cloud.client.storage
      .from(BUCKET)
      .upload(path, blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/jpeg"
      });
    if (uploadError) throw uploadError;

    wallpaperPath = path;
    const state = getState();
    if (state) {
      state.settings.customWallpaperEnabled = true;
      state.settings.customWallpaperPhoto = await signedWallpaperUrl(path);
    }

    const appearance = snapshotFromLocal().appearance;
    appearance.customWallpaperEnabled = true;
    appearance.customWallpaperPath = path;
    await patch(activePairId, { appearance });
    lastSnapshot = snapshotFromLocal();

    if (oldPath && oldPath !== path) {
      cloud.client.storage.from(BUCKET).remove([oldPath]).catch(() => {});
    }

    return { path, signedUrl: state?.settings?.customWallpaperPhoto || "" };
  }

  async function removeWallpaper() {
    if (!activePairId) return;
    const oldPath = wallpaperPath;
    wallpaperPath = "";
    const state = getState();
    if (state) {
      state.settings.customWallpaperPhoto = "";
      state.settings.customWallpaperEnabled = false;
    }
    const appearance = snapshotFromLocal().appearance;
    appearance.customWallpaperEnabled = false;
    appearance.customWallpaperPath = "";
    await patch(activePairId, { appearance });
    lastSnapshot = snapshotFromLocal();
    if (oldPath) await cloud.client.storage.from(BUCKET).remove([oldPath]).catch(() => {});
  }

  cloud.sharedState = {
    start,
    load,
    refresh,
    subscribe,
    unsubscribe,
    scheduleFromLocal,
    flushLocal,
    uploadWallpaper,
    removeWallpaper,
    getWallpaperPath: () => wallpaperPath,
    get applyingRemote() { return applyingRemote; }
  };
})();
