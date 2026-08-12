import { createClient } from "npm:@supabase/supabase-js@2.111.0";
import * as webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function bearerToken(req: Request) {
  const value = req.headers.get("Authorization") || "";
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
}

function statusCodeOf(error: unknown) {
  const candidate = error as { statusCode?: number; status?: number } | null;
  return Number(candidate?.statusCode || candidate?.status || 0) || 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let input: { action?: string; messageId?: string; pairId?: string } = {};
  try { input = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || "";
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "";

  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server configuration is incomplete" }, 500);

  // The config response contains only the public VAPID key. In normal Koi use the
  // signed-in client calls it, so it also works with the default JWT verification.
  if (input.action === "config") {
    if (!vapidPublicKey) return json({ error: "Push notifications are not configured yet" }, 503);
    return json({ publicKey: vapidPublicKey });
  }

  const token = bearerToken(req);
  if (!token) return json({ error: "Unauthorized" }, 401);

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: userData, error: userError } = await service.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  if (input.action === "status") {
    const { count, error } = await service
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (error) return json({ error: error.message }, 500);
    return json({ configured: Boolean(vapidPublicKey && vapidPrivateKey && vapidSubject), subscriptionCount: count || 0 });
  }

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return json({ error: "Push notifications are not configured yet" }, 503);
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  async function sendToSubscriptions(subscriptions: any[], payload: string) {
    if (!subscriptions?.length) return { sent: 0, attempted: 0, staleRemoved: 0 };
    let sent = 0;
    const staleIds: string[] = [];
    const results = await Promise.allSettled(subscriptions.map(async subscription => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth_key }
        }, payload, { TTL: 60 * 60 * 24, urgency: "high" });
        sent += 1;
      } catch (error) {
        const status = statusCodeOf(error);
        if (status === 404 || status === 410) staleIds.push(subscription.id);
        else console.error("Koi web push delivery failed", status, String((error as Error)?.message || error));
      }
    }));
    if (staleIds.length) await service.from("push_subscriptions").delete().in("id", staleIds);
    return { sent, attempted: results.length, staleRemoved: staleIds.length };
  }

  if (input.action === "test") {
    const { data: subscriptions, error } = await service
      .from("push_subscriptions")
      .select("id,user_id,endpoint,p256dh,auth_key")
      .eq("user_id", user.id);
    if (error) return json({ error: error.message }, 500);
    if (!subscriptions?.length) return json({ sent: 0, reason: "This phone has no saved push subscription yet" });
    const payload = JSON.stringify({
      type: "chat-message",
      title: "Koi 💗",
      body: "Notifications are working on this phone 🔔",
      url: "./#chat",
      tag: `koi-test-${user.id}`
    });
    return json(await sendToSubscriptions(subscriptions, payload));
  }

  if (input.action === "send-note") {
    const pairId = String(input.pairId || "").trim();
    if (!pairId) return json({ error: "pairId is required" }, 400);

    const { data: note, error: noteError } = await service
      .from("pair_notes")
      .select("pair_id,body,author_id,updated_at")
      .eq("pair_id", pairId)
      .maybeSingle();
    if (noteError) return json({ error: noteError.message }, 500);
    if (!note || !note.body) return json({ sent: 0, reason: "No active note" });
    if (note.author_id !== user.id) return json({ error: "Only the latest note author can trigger this notification" }, 403);

    const { data: members, error: membersError } = await service.from("pair_members").select("user_id").eq("pair_id", pairId);
    if (membersError) return json({ error: membersError.message }, 500);
    const memberIds = (members || []).map(row => row.user_id);
    if (!memberIds.includes(user.id)) return json({ error: "Not a member of this pair" }, 403);
    const recipientIds = memberIds.filter(id => id !== user.id);
    if (!recipientIds.length) return json({ sent: 0, reason: "No partner connected" });

    const [{ data: profile }, { data: subscriptions, error: subError }] = await Promise.all([
      service.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      service.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth_key").eq("pair_id", pairId).in("user_id", recipientIds)
    ]);
    if (subError) return json({ error: subError.message }, 500);
    if (!subscriptions?.length) return json({ sent: 0, reason: "Partner has not enabled notifications" });
    const senderName = String(profile?.display_name || user.user_metadata?.display_name || "Your person").slice(0, 60);
    const payload = JSON.stringify({
      type: "koi-note",
      title: "Koi 💗",
      body: `${senderName} left you a Koi Note 💌`,
      url: "./#home",
      tag: `koi-note-${pairId}`,
      createdAt: note.updated_at
    });
    return json(await sendToSubscriptions(subscriptions, payload));
  }

  if (input.action !== "send") return json({ error: "Unknown action" }, 400);

  const messageId = String(input.messageId || "").trim();
  if (!messageId) return json({ error: "messageId is required" }, 400);

  const { data: message, error: messageError } = await service
    .from("chat_messages")
    .select("id,pair_id,sender_id,body,created_at")
    .eq("id", messageId)
    .maybeSingle();
  if (messageError) return json({ error: messageError.message }, 500);
  if (!message) return json({ error: "Message not found" }, 404);
  if (message.sender_id !== user.id) return json({ error: "Only the sender can trigger this notification" }, 403);

  const { data: members, error: membersError } = await service.from("pair_members").select("user_id").eq("pair_id", message.pair_id);
  if (membersError) return json({ error: membersError.message }, 500);
  const memberIds = (members || []).map(row => row.user_id);
  if (!memberIds.includes(user.id)) return json({ error: "Not a member of this pair" }, 403);
  const recipientIds = memberIds.filter(id => id !== user.id);
  if (!recipientIds.length) return json({ sent: 0, reason: "No partner connected" });

  const [{ data: profile }, { data: subscriptions, error: subscriptionError }] = await Promise.all([
    service.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    service.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth_key").eq("pair_id", message.pair_id).in("user_id", recipientIds)
  ]);
  if (subscriptionError) return json({ error: subscriptionError.message }, 500);
  if (!subscriptions?.length) return json({ sent: 0, reason: "Partner has not enabled notifications" });

  const senderName = String(profile?.display_name || user.user_metadata?.display_name || "Your person").slice(0, 60);
  const payload = JSON.stringify({
    type: "chat-message",
    title: "Koi 💗",
    body: `${senderName} sent you a message 💬`,
    url: "./#chat",
    tag: `koi-chat-${message.pair_id}`,
    messageId: message.id,
    createdAt: message.created_at
  });
  return json(await sendToSubscriptions(subscriptions, payload));
});
