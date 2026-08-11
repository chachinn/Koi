(() => {
  "use strict";

  const cloud = window.KoiCloud;
  if (!cloud) return;

  const BUCKET = "koi-media";
  const signedUrlCache = new Map();

  function requirePair(pairId) {
    if (!pairId) throw new Error("No Koi pair is connected.");
    return pairId;
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
  }

  function randomId() {
    return crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  async function compressToBlob(file) {
    if (typeof window.compressImageToBlob === "function") {
      return window.compressImageToBlob(file, 1600, 0.82);
    }
    if (typeof window.compressImage === "function") {
      const dataUrl = await window.compressImage(file, 1600, 0.82);
      return fetch(dataUrl).then(response => response.blob());
    }
    return file;
  }

  async function uploadPhotos(pairId, memoryId, files = []) {
    const list = Array.from(files || []).filter(file => file && String(file.type || "").startsWith("image/"));
    if (!list.length) return [];

    const existing = await cloud.client
      .from("memory_media")
      .select("sort_order")
      .eq("memory_id", memoryId)
      .order("sort_order", { ascending: false })
      .limit(1);
    if (existing.error) throw existing.error;
    let nextSort = Number(existing.data?.[0]?.sort_order ?? -1) + 1;

    const uploaded = [];
    for (const file of list) {
      const blob = await compressToBlob(file);
      const path = `${pairId}/memories/${memoryId}/${Date.now()}-${randomId()}.jpg`;

      const { error: uploadError } = await cloud.client.storage
        .from(BUCKET)
        .upload(path, blob, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/jpeg"
        });
      if (uploadError) throw uploadError;

      const { data: mediaRow, error: mediaError } = await cloud.client
        .from("memory_media")
        .insert({
          memory_id: memoryId,
          pair_id: pairId,
          media_type: "photo",
          storage_path: path,
          sort_order: nextSort++
        })
        .select("id,memory_id,pair_id,storage_path,sort_order,created_at")
        .single();

      if (mediaError) {
        await cloud.client.storage.from(BUCKET).remove([path]).catch(() => {});
        throw mediaError;
      }
      uploaded.push(mediaRow);
    }
    return uploaded;
  }

  async function signedUrlsFor(mediaRows) {
    const paths = [...new Set((mediaRows || []).map(row => row.storage_path).filter(Boolean))];
    if (!paths.length) return new Map();

    const now = Date.now();
    const map = new Map();
    const missing = [];

    for (const path of paths) {
      const cached = signedUrlCache.get(path);
      if (cached && cached.expiresAt > now + 5 * 60 * 1000) map.set(path, cached.url);
      else missing.push(path);
    }

    if (missing.length) {
      const { data, error } = await cloud.client.storage
        .from(BUCKET)
        .createSignedUrls(missing, 60 * 60 * 24);
      if (error) throw error;

      (data || []).forEach((entry, index) => {
        const path = entry.path || missing[index];
        if (!path || !entry.signedUrl) return;
        const record = { url: entry.signedUrl, expiresAt: now + 23 * 60 * 60 * 1000 };
        signedUrlCache.set(path, record);
        map.set(path, record.url);
      });
    }

    return map;
  }

  async function list(pairId) {
    requirePair(pairId);
    const [memoriesResult, sidesResult, mediaResult] = await Promise.all([
      cloud.client
        .from("memories")
        .select("id,pair_id,created_by,era_id,memory_type,title,happened_on,location,note,chapter,tags,cover_path,created_at,updated_at")
        .eq("pair_id", pairId)
        .order("happened_on", { ascending: false })
        .order("created_at", { ascending: false }),
      cloud.client
        .from("memory_sides")
        .select("id,memory_id,pair_id,user_id,side_text,created_at,updated_at")
        .eq("pair_id", pairId),
      cloud.client
        .from("memory_media")
        .select("id,memory_id,pair_id,uploaded_by,storage_path,sort_order,created_at")
        .eq("pair_id", pairId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    ]);

    if (memoriesResult.error) throw memoriesResult.error;
    if (sidesResult.error) throw sidesResult.error;
    if (mediaResult.error) throw mediaResult.error;

    const signed = await signedUrlsFor(mediaResult.data || []);
    const sidesByMemory = new Map();
    for (const side of sidesResult.data || []) {
      const rows = sidesByMemory.get(side.memory_id) || [];
      rows.push(side);
      sidesByMemory.set(side.memory_id, rows);
    }

    const mediaByMemory = new Map();
    for (const media of mediaResult.data || []) {
      const rows = mediaByMemory.get(media.memory_id) || [];
      rows.push({ ...media, signed_url: signed.get(media.storage_path) || "" });
      mediaByMemory.set(media.memory_id, rows);
    }

    return (memoriesResult.data || []).map(memory => ({
      ...memory,
      sides: sidesByMemory.get(memory.id) || [],
      media: mediaByMemory.get(memory.id) || []
    }));
  }

  async function create(pairId, payload, files = []) {
    requirePair(pairId);
    const { data: memory, error } = await cloud.client
      .from("memories")
      .insert({
        pair_id: pairId,
        era_id: isUuid(payload.eraId) ? payload.eraId : null,
        memory_type: payload.type === "two-sides" ? "two-sides" : "memory",
        title: payload.title,
        happened_on: payload.date || null,
        location: payload.location || null,
        note: payload.note || null,
        chapter: payload.chapter || null,
        tags: payload.tags || []
      })
      .select("id")
      .single();
    if (error) throw error;

    if (payload.type === "two-sides" && payload.sideText) {
      const { error: sideError } = await cloud.client
        .from("memory_sides")
        .insert({
          memory_id: memory.id,
          pair_id: pairId,
          side_text: payload.sideText
        });
      if (sideError) throw sideError;
    }

    await uploadPhotos(pairId, memory.id, files);
    return memory.id;
  }

  async function update(pairId, memoryId, payload, files = []) {
    requirePair(pairId);
    const { error } = await cloud.client
      .from("memories")
      .update({
        era_id: isUuid(payload.eraId) ? payload.eraId : null,
        memory_type: payload.type === "two-sides" ? "two-sides" : "memory",
        title: payload.title,
        happened_on: payload.date || null,
        location: payload.location || null,
        note: payload.note || null,
        chapter: payload.chapter || null,
        tags: payload.tags || []
      })
      .eq("id", memoryId)
      .eq("pair_id", pairId);
    if (error) throw error;

    if (payload.type === "two-sides" && payload.sideText) {
      const session = cloud.runtime.session;
      const userId = session?.user?.id;
      if (!userId) throw new Error("Your Koi session expired. Sign in again.");
      const { error: sideError } = await cloud.client
        .from("memory_sides")
        .upsert({
          memory_id: memoryId,
          pair_id: pairId,
          user_id: userId,
          side_text: payload.sideText
        }, { onConflict: "memory_id,user_id" });
      if (sideError) throw sideError;
    }

    await uploadPhotos(pairId, memoryId, files);
    return memoryId;
  }

  async function remove(memoryId) {
    const { data: media, error: mediaError } = await cloud.client
      .from("memory_media")
      .select("storage_path")
      .eq("memory_id", memoryId);
    if (mediaError) throw mediaError;

    const paths = (media || []).map(row => row.storage_path).filter(Boolean);
    if (paths.length) {
      const { error: storageError } = await cloud.client.storage.from(BUCKET).remove(paths);
      if (storageError) console.warn("Koi photo cleanup warning", storageError);
    }

    const { error } = await cloud.client.from("memories").delete().eq("id", memoryId);
    if (error) throw error;
  }

  async function getRevealedSides(memoryId) {
    const { data, error } = await cloud.client.rpc("get_memory_sides_if_complete", {
      p_memory_id: memoryId
    });
    if (error) throw error;
    return data || [];
  }

  async function subscribe(pairId, onChange) {
    requirePair(pairId);
    await cloud.memories.unsubscribe();
    await cloud.client.realtime.setAuth();

    const tables = ["memories", "memory_sides", "memory_media"];
    const channels = tables.map(table => cloud.client
      .channel(`pair:${pairId}:${table}`, { config: { private: true } })
      .on("broadcast", { event: "*" }, payload => onChange?.(payload))
      .subscribe());

    cloud.runtime.memoryChannels = channels;
    return channels;
  }

  async function unsubscribe() {
    const channels = cloud.runtime.memoryChannels || [];
    await Promise.all(channels.map(channel => cloud.client.removeChannel(channel).catch(() => {})));
    cloud.runtime.memoryChannels = [];
  }

  cloud.memories = {
    list,
    create,
    update,
    remove,
    getRevealedSides,
    subscribe,
    unsubscribe,
    uploadPhotos
  };
})();
