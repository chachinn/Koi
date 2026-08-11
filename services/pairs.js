(() => {
  "use strict";
  const cloud = window.KoiCloud;
  if (!cloud) return;

  async function rpc(name, args = {}) {
    const { data, error } = await cloud.client.rpc(name, args);
    if (error) throw error;
    return data;
  }

  cloud.pairs = {
    async getMine() {
      if (!cloud.configured) return null;
      const data = await rpc("get_my_pair");
      cloud.runtime.pair = data?.pair || null;
      cloud.runtime.members = data?.members || [];
      return data || null;
    },

    async create({ anniversary = null } = {}) {
      const data = await rpc("create_koi_pair", {
        p_anniversary: anniversary || null
      });
      cloud.runtime.pair = data?.pair || null;
      cloud.runtime.members = data?.members || [];
      return data;
    },

    async join(inviteCode) {
      const data = await rpc("join_koi_pair", {
        p_invite_code: String(inviteCode || "").trim().toUpperCase()
      });
      cloud.runtime.pair = data?.pair || null;
      cloud.runtime.members = data?.members || [];
      return data;
    },

    async regenerateInvite() {
      const data = await rpc("regenerate_pair_invite");
      cloud.runtime.pair = data?.pair || cloud.runtime.pair;
      return data;
    },

    async updateRelationship({ relationshipMode = "dating", datingAnniversary = null, weddingAnniversary = null } = {}) {
      const data = await rpc("update_koi_relationship_settings", {
        p_relationship_mode: relationshipMode || "dating",
        p_dating_anniversary: datingAnniversary || null,
        p_wedding_anniversary: relationshipMode === "married" ? (weddingAnniversary || null) : null
      });
      cloud.runtime.pair = data?.pair || cloud.runtime.pair;
      cloud.runtime.members = data?.members || cloud.runtime.members;
      return data;
    },

    async updateMyProfile({ displayName = "", avatar = "" } = {}) {
      const userId = cloud.runtime.session?.user?.id;
      if (!userId) throw new Error("Your Koi session expired. Sign in again.");
      const payload = {};
      if (String(displayName || "").trim()) payload.display_name = String(displayName).trim();
      if (String(avatar || "").trim()) payload.avatar = String(avatar).trim();
      if (!Object.keys(payload).length) return null;
      const { data, error } = await cloud.client
        .from("profiles")
        .update(payload)
        .eq("id", userId)
        .select("id,display_name,avatar")
        .single();
      if (error) throw error;
      return data;
    }
  };
})();
