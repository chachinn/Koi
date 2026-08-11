(() => {
  "use strict";
  const cloud = window.KoiCloud;
  if (!cloud) return;

  function requirePair(pairId) {
    if (!pairId) throw new Error("No Koi pair is connected.");
    return pairId;
  }

  cloud.littleThings = {
    async list(pairId) {
      requirePair(pairId);
      const { data, error } = await cloud.client
        .from("little_things")
        .select("id,pair_id,client_id,created_by,about_user_id,text,category,happened_on,created_at,updated_at")
        .eq("pair_id", pairId)
        .order("happened_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async create(pairId, item) {
      requirePair(pairId);
      const payload = {
        pair_id: pairId,
        client_id: item.clientId,
        about_user_id: item.aboutUserId || null,
        text: item.text,
        category: item.category || "Everyday",
        happened_on: item.date
      };

      const { data, error } = await cloud.client
        .from("little_things")
        .upsert(payload, { onConflict: "pair_id,client_id" })
        .select("id,pair_id,client_id,created_by,about_user_id,text,category,happened_on,created_at,updated_at")
        .single();

      if (error) throw error;
      return data;
    },

    async remove(id) {
      const { error } = await cloud.client
        .from("little_things")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },

    async subscribe(pairId, onChange) {
      requirePair(pairId);
      await cloud.littleThings.unsubscribe();
      await cloud.client.realtime.setAuth();

      const topic = `pair:${pairId}:little_things`;
      const channel = cloud.client
        .channel(topic, { config: { private: true } })
        .on("broadcast", { event: "*" }, payload => onChange?.(payload))
        .subscribe((status, error) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("Koi Little Things realtime channel", status, error || "");
          }
        });

      cloud.runtime.channel = channel;
      return channel;
    },

    async unsubscribe() {
      if (!cloud.runtime.channel) return;
      await cloud.client.removeChannel(cloud.runtime.channel).catch(() => {});
      cloud.runtime.channel = null;
    }
  };
})();
