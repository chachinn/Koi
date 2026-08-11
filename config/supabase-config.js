/*
  Koi 💗 — Supabase configuration
  --------------------------------
  Browser-safe project values only.

  IMPORTANT:
  - NEVER paste a secret key (sb_secret_...) or service_role key here.
*/
window.KOI_CONFIG = Object.freeze({
  supabaseUrl: "https://uohbafyufeirmftnbiia.supabase.co",
  supabasePublishableKey: "sb_publishable_hDO3perqJKsLGv-JPCwmlQ__ofbjB4F",

  // "auto" = cloud activates as soon as both values above are filled in.
  cloudMode: "auto",

  // Used by email confirmation / password reset flows.
  authRedirectUrl: `${window.location.origin}${window.location.pathname}`,

  appVersion: "2.0.0-foundation"
});