(() => {
  "use strict";

  const config = window.KOI_CONFIG || {};
  const validUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl || "");
  const validKey = typeof config.supabasePublishableKey === "string" &&
    config.supabasePublishableKey.length > 20;

  const configured = config.cloudMode !== "off" &&
    validUrl &&
    validKey &&
    Boolean(window.supabase?.createClient);

  let client = null;

  if (configured) {
    client = window.supabase.createClient(
      config.supabaseUrl,
      config.supabasePublishableKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        },
        global: {
          headers: { "x-client-info": `koi-pwa/${config.appVersion || "2"}` }
        }
      }
    );
  }

  window.KoiCloud = {
    configured,
    client,
    config,
    runtime: {
      session: null,
      pair: null,
      members: [],
      channel: null,
      ready: false,
      syncing: false
    }
  };
})();
