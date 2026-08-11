-- Koi 💗 Step 28 — private pair chat
-- Durable messages/reactions/read state + lightweight private typing broadcasts.

begin;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  client_id text not null,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  reply_to_id uuid references public.chat_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  unique (pair_id, client_id),
  unique (id, pair_id)
);

create index if not exists chat_messages_pair_created_idx
  on public.chat_messages(pair_id, created_at desc, id desc);
create index if not exists chat_messages_reply_idx
  on public.chat_messages(reply_to_id)
  where reply_to_id is not null;

create table if not exists public.chat_message_reactions (
  message_id uuid not null,
  pair_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id),
  foreign key (message_id, pair_id)
    references public.chat_messages(id, pair_id)
    on delete cascade
);

create index if not exists chat_reactions_pair_idx
  on public.chat_message_reactions(pair_id, message_id);

create table if not exists public.chat_read_state (
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  last_read_message_id uuid references public.chat_messages(id) on delete set null,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (pair_id, user_id)
);

alter table public.chat_messages enable row level security;
alter table public.chat_message_reactions enable row level security;
alter table public.chat_read_state enable row level security;

create or replace function public.is_chat_message_in_pair(target_message_id uuid, target_pair_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_message_id is null or exists (
    select 1 from public.chat_messages m
    where m.id = target_message_id and m.pair_id = target_pair_id
  );
$$;

revoke all on function public.is_chat_message_in_pair(uuid, uuid) from public;
grant execute on function public.is_chat_message_in_pair(uuid, uuid) to authenticated;

-- Messages: both partners can read; only the sender can create/change/delete theirs.
drop policy if exists "chat_messages_select" on public.chat_messages;
create policy "chat_messages_select" on public.chat_messages
for select to authenticated
using (public.is_pair_member(pair_id));

drop policy if exists "chat_messages_insert" on public.chat_messages;
create policy "chat_messages_insert" on public.chat_messages
for insert to authenticated
with check (
  public.is_pair_member(pair_id)
  and sender_id = auth.uid()
  and public.is_chat_message_in_pair(reply_to_id, pair_id)
);

drop policy if exists "chat_messages_update" on public.chat_messages;
create policy "chat_messages_update" on public.chat_messages
for update to authenticated
using (sender_id = auth.uid() and public.is_pair_member(pair_id))
with check (sender_id = auth.uid() and public.is_pair_member(pair_id));

drop policy if exists "chat_messages_delete" on public.chat_messages;
create policy "chat_messages_delete" on public.chat_messages
for delete to authenticated
using (sender_id = auth.uid() and public.is_pair_member(pair_id));

-- Reactions: visible to the pair; each user controls only their own reaction.
drop policy if exists "chat_reactions_select" on public.chat_message_reactions;
create policy "chat_reactions_select" on public.chat_message_reactions
for select to authenticated
using (public.is_pair_member(pair_id));

drop policy if exists "chat_reactions_insert" on public.chat_message_reactions;
create policy "chat_reactions_insert" on public.chat_message_reactions
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_pair_member(pair_id)
  and exists (
    select 1 from public.chat_messages m
    where m.id = message_id and m.pair_id = pair_id
  )
);

drop policy if exists "chat_reactions_update" on public.chat_message_reactions;
create policy "chat_reactions_update" on public.chat_message_reactions
for update to authenticated
using (user_id = auth.uid() and public.is_pair_member(pair_id))
with check (user_id = auth.uid() and public.is_pair_member(pair_id));

drop policy if exists "chat_reactions_delete" on public.chat_message_reactions;
create policy "chat_reactions_delete" on public.chat_message_reactions
for delete to authenticated
using (user_id = auth.uid() and public.is_pair_member(pair_id));

-- Read cursor: both partners may read the state (future read receipts), but a user
-- can only write their own cursor.
drop policy if exists "chat_read_select" on public.chat_read_state;
create policy "chat_read_select" on public.chat_read_state
for select to authenticated
using (public.is_pair_member(pair_id));

drop policy if exists "chat_read_insert" on public.chat_read_state;
create policy "chat_read_insert" on public.chat_read_state
for insert to authenticated
with check (user_id = auth.uid() and public.is_pair_member(pair_id));

drop policy if exists "chat_read_update" on public.chat_read_state;
create policy "chat_read_update" on public.chat_read_state
for update to authenticated
using (user_id = auth.uid() and public.is_pair_member(pair_id))
with check (user_id = auth.uid() and public.is_pair_member(pair_id));

grant select, insert, update, delete on public.chat_messages to authenticated;
grant select, insert, update, delete on public.chat_message_reactions to authenticated;
grant select, insert, update on public.chat_read_state to authenticated;

drop trigger if exists set_updated_at on public.chat_messages;
create trigger set_updated_at
before update on public.chat_messages
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.chat_read_state;
create trigger set_updated_at
before update on public.chat_read_state
for each row execute function public.set_updated_at();

-- Pair-wide Step 27 sync bus: partner clients receive only a tiny "chat changed"
-- cue, then re-fetch through RLS. Message bodies are not broadcast by this trigger.
drop trigger if exists koi_sync_chat_messages on public.chat_messages;
create trigger koi_sync_chat_messages
after insert or update or delete on public.chat_messages
for each row execute function public.broadcast_koi_sync_pair_row('chat');

drop trigger if exists koi_sync_chat_reactions on public.chat_message_reactions;
create trigger koi_sync_chat_reactions
after insert or update or delete on public.chat_message_reactions
for each row execute function public.broadcast_koi_sync_pair_row('chat');

-- Backward-compatible fallback topics if the Step 27 single sync channel fails.
drop trigger if exists broadcast_chat_messages_changes on public.chat_messages;
create trigger broadcast_chat_messages_changes
after insert or update or delete on public.chat_messages
for each row execute function public.broadcast_pair_row_change();

drop trigger if exists broadcast_chat_reactions_changes on public.chat_message_reactions;
create trigger broadcast_chat_reactions_changes
after insert or update or delete on public.chat_message_reactions
for each row execute function public.broadcast_pair_row_change();

-- Clients need INSERT authorization on realtime.messages to send ephemeral typing
-- events to pair:<uuid>:chat. The existing SELECT policy already protects receiving.
drop policy if exists "koi_pair_members_send_broadcasts" on realtime.messages;
create policy "koi_pair_members_send_broadcasts"
on realtime.messages
for insert
to authenticated
with check (public.can_access_realtime_topic(realtime.topic()));

commit;
