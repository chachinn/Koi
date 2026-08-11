-- Koi 💗 Step 30 — Web Push subscriptions for chat notifications
-- Stores each signed-in device's push endpoint privately. Only the owner can
-- manage their endpoint; the server-side Edge Function reads them with the
-- service role when delivering a partner chat notification.

begin;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pair_id uuid not null references public.pairs(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (endpoint)
);

create index if not exists push_subscriptions_user_pair_idx
  on public.push_subscriptions(user_id, pair_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_pair_member(pair_id)
);

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own" on public.push_subscriptions
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and public.is_pair_member(pair_id)
);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions
for delete to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;

commit;
