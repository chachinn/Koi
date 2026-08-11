-- Koi 💗 Step 29 — bug/stability fixes
-- 1) Make the Step 27 generic sync trigger safe for tables without an `id` column.
--    Affected examples: pair_shared_state, pair_members, chat_message_reactions.
-- 2) Tighten chat reply/read-state pair consistency.

begin;

create or replace function public.broadcast_koi_sync_pair_row()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  row_data jsonb;
  target_pair_id uuid;
  target_row_id text;
  sync_domain text := coalesce(nullif(tg_argv[0], ''), tg_table_name);
begin
  -- Do not directly reference NEW.id / OLD.id here: this trigger is intentionally
  -- shared by tables whose primary key is not named `id`.
  if tg_op = 'DELETE' then
    row_data := to_jsonb(old);
  else
    row_data := to_jsonb(new);
  end if;

  begin
    target_pair_id := nullif(row_data ->> 'pair_id', '')::uuid;
  exception when others then
    target_pair_id := null;
  end;

  if target_pair_id is null then
    return null;
  end if;

  target_row_id := coalesce(
    nullif(row_data ->> 'id', ''),
    nullif(row_data ->> 'message_id', ''),
    nullif(row_data ->> 'user_id', ''),
    nullif(row_data ->> 'pair_id', '')
  );

  perform realtime.send(
    jsonb_build_object(
      'domain', sync_domain,
      'table', tg_table_name,
      'operation', tg_op,
      'row_id', target_row_id,
      'actor_id', auth.uid()
    ),
    'sync',
    'pair:' || target_pair_id::text || ':sync',
    true
  );

  return null;
end;
$$;

-- A sender may only keep a reply attached to a message from the same Koi pair.
drop policy if exists "chat_messages_update" on public.chat_messages;
create policy "chat_messages_update" on public.chat_messages
for update to authenticated
using (sender_id = auth.uid() and public.is_pair_member(pair_id))
with check (
  sender_id = auth.uid()
  and public.is_pair_member(pair_id)
  and public.is_chat_message_in_pair(reply_to_id, pair_id)
);

-- A read cursor may only point at a message from that same pair.
drop policy if exists "chat_read_insert" on public.chat_read_state;
create policy "chat_read_insert" on public.chat_read_state
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_pair_member(pair_id)
  and public.is_chat_message_in_pair(last_read_message_id, pair_id)
);

drop policy if exists "chat_read_update" on public.chat_read_state;
create policy "chat_read_update" on public.chat_read_state
for update to authenticated
using (user_id = auth.uid() and public.is_pair_member(pair_id))
with check (
  user_id = auth.uid()
  and public.is_pair_member(pair_id)
  and public.is_chat_message_in_pair(last_read_message_id, pair_id)
);

commit;
