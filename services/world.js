(() => {
  "use strict";

  const cloud = window.KoiCloud;
  if (!cloud) return;

  function pairId() {
    return cloud.runtime?.pair?.id || null;
  }

  async function list() {
    const { data, error } = await cloud.client.rpc("koi_feature_list");
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  async function save({
    id = null,
    featureKey,
    slotKey = null,
    title = "",
    payload = {},
    visibility = "shared",
    recipientId = null,
    revealAt = null
  } = {}) {
    if (!pairId()) throw new Error("No Koi pair is connected.");
    const { data, error } = await cloud.client.rpc("koi_feature_save", {
      p_id: id || null,
      p_feature_key: featureKey,
      p_slot_key: slotKey || null,
      p_title: title || null,
      p_payload: payload || {},
      p_visibility: visibility,
      p_recipient_id: recipientId || null,
      p_reveal_at: revealAt || null
    });
    if (error) throw error;
    return data;
  }

  async function remove(id) {
    const { data, error } = await cloud.client.rpc("koi_feature_delete", { p_id: id });
    if (error) throw error;
    return Boolean(data);
  }

  async function subscribe(activePairId, onChange) {
    await unsubscribe();
    if (!activePairId) return null;
    await cloud.client.realtime.setAuth();
    const channel = cloud.client
      .channel(`pair:${activePairId}:couple_feature_items`, { config: { private: true } })
      .on("broadcast", { event: "*" }, payload => onChange?.(payload))
      .subscribe();
    cloud.runtime.worldChannel = channel;
    return channel;
  }

  async function unsubscribe() {
    const channel = cloud.runtime.worldChannel;
    if (channel) await cloud.client.removeChannel(channel).catch(() => {});
    cloud.runtime.worldChannel = null;
  }

  cloud.world = { list, save, remove, subscribe, unsubscribe };
})();
