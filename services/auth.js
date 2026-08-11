(() => {
  "use strict";
  const cloud = window.KoiCloud;
  if (!cloud) return;

  function requireClient() {
    if (!cloud.configured || !cloud.client) {
      throw new Error("Koi Cloud is not configured yet.");
    }
    return cloud.client;
  }

  cloud.auth = {
    async getSession() {
      const client = requireClient();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      cloud.runtime.session = data.session || null;
      return data.session || null;
    },

    async signUp({ email, password, displayName }) {
      const client = requireClient();
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: cloud.config.authRedirectUrl,
          data: { display_name: displayName || "" }
        }
      });
      if (error) throw error;
      return data;
    },

    async signIn({ email, password }) {
      const client = requireClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      cloud.runtime.session = data.session || null;
      return data;
    },

    async signInWithGoogle() {
      const client = requireClient();
      const { data, error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: cloud.config.authRedirectUrl
        }
      });
      if (error) throw error;
      return data;
    },

    async signOut() {
      const client = requireClient();
      if (cloud.runtime.channel) {
        await client.removeChannel(cloud.runtime.channel);
        cloud.runtime.channel = null;
      }
      const { error } = await client.auth.signOut();
      if (error) throw error;
      cloud.runtime.session = null;
      cloud.runtime.pair = null;
      cloud.runtime.members = [];
      cloud.runtime.ready = false;
    },

    async requestPasswordReset(email) {
      const client = requireClient();
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: cloud.config.authRedirectUrl
      });
      if (error) throw error;
    },

    onChange(callback) {
      if (!cloud.configured || !cloud.client) return { unsubscribe() {} };
      const { data } = cloud.client.auth.onAuthStateChange((event, session) => {
        cloud.runtime.session = session || null;
        callback?.(event, session || null);
      });
      return data.subscription;
    }
  };
})();
