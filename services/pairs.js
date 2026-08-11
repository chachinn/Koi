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
    }
  };
})();
