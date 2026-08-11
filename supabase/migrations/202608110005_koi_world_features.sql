-- Koi 💗 Step 24 — Koi World feature store
-- A generic, pair-scoped store for shared, private, scheduled, and reveal-together features.

begin;

create table if not exists public.couple_feature_items (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  feature_key text not null check (char_length(feature_key) between 1 and 80),
  slot_key text,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipient_id uuid references auth.users(id) on delete set null,
  title text,
  payload jsonb not null default '{}'::jsonb,
  visibility text not null default 'shared'
    check (visibility in ('shared','pair','owner','recipient','scheduled','round')),
  reveal_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists couple_feature_items_pair_feature_idx
  on public.couple_feature_items(pair_id, feature_key, created_at desc);
create index if not exists couple_feature_items_round_idx
  on public.couple_feature_items(pair_id, feature_key, slot_key, owner_id)
  where slot_key is not null;

alter table public.couple_feature_items enable row level security;

-- App access is intentionally through security-definer RPCs below so private
-- and scheduled payloads can be redacted before reaching the browser.
revoke all on public.couple_feature_items from anon, authenticated;

drop trigger if exists set_updated_at on public.couple_feature_items;
create trigger set_updated_at
before update on public.couple_feature_items
for each row execute function public.set_updated_at();

create or replace function public.koi_feature_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
  result jsonb;
begin
  if uid is null then return '[]'::jsonb; end if;

  select pm.pair_id into pid
  from public.pair_members pm
  where pm.user_id = uid
  limit 1;

  if pid is null then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(rendered order by created_at desc), '[]'::jsonb)
  into result
  from (
    select
      cfi.created_at,
      jsonb_build_object(
        'id', cfi.id,
        'pair_id', cfi.pair_id,
        'feature_key', cfi.feature_key,
        'slot_key', cfi.slot_key,
        'owner_id', cfi.owner_id,
        'recipient_id', cfi.recipient_id,
        'title', case when cfi.visibility = 'scheduled' and cfi.owner_id <> uid and cfi.reveal_at is not null and cfi.reveal_at > now() then 'Locked for later' else cfi.title end,
        'visibility', cfi.visibility,
        'reveal_at', cfi.reveal_at,
        'created_at', cfi.created_at,
        'updated_at', cfi.updated_at,
        'locked',
          case
            when cfi.visibility = 'scheduled'
              and cfi.owner_id <> uid
              and cfi.reveal_at is not null
              and cfi.reveal_at > now() then true
            when cfi.visibility = 'round'
              and cfi.owner_id <> uid
              and (
                select count(distinct x.owner_id)
                from public.couple_feature_items x
                where x.pair_id = cfi.pair_id
                  and x.feature_key = cfi.feature_key
                  and x.slot_key = cfi.slot_key
              ) < 2 then true
            else false
          end,
        'payload',
          case
            when cfi.visibility = 'scheduled'
              and cfi.owner_id <> uid
              and cfi.reveal_at is not null
              and cfi.reveal_at > now()
              then jsonb_build_object('teaser', coalesce(cfi.payload->>'teaser', 'Something is waiting for you 💗'))
            when cfi.visibility = 'round'
              and cfi.owner_id <> uid
              and (
                select count(distinct x.owner_id)
                from public.couple_feature_items x
                where x.pair_id = cfi.pair_id
                  and x.feature_key = cfi.feature_key
                  and x.slot_key = cfi.slot_key
              ) < 2 then '{}'::jsonb
            else cfi.payload
          end
      ) as rendered
    from public.couple_feature_items cfi
    where cfi.pair_id = pid
      and (
        cfi.visibility <> 'owner'
        or cfi.owner_id = uid
      )
      and (
        cfi.visibility <> 'recipient'
        or cfi.owner_id = uid
        or cfi.recipient_id = uid
      )
  ) q;

  return result;
end;
$$;

grant execute on function public.koi_feature_list() to authenticated;

create or replace function public.koi_feature_save(
  p_id uuid default null,
  p_feature_key text default null,
  p_slot_key text default null,
  p_title text default null,
  p_payload jsonb default '{}'::jsonb,
  p_visibility text default 'shared',
  p_recipient_id uuid default null,
  p_reveal_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
  target_id uuid;
  existing public.couple_feature_items%rowtype;
  normalized_visibility text := lower(trim(coalesce(p_visibility, 'shared')));
begin
  if uid is null then raise exception 'You must be signed in.'; end if;

  select pm.pair_id into pid
  from public.pair_members pm
  where pm.user_id = uid
  limit 1;

  if pid is null then raise exception 'No Koi pair found.'; end if;
  if coalesce(trim(p_feature_key), '') = '' then raise exception 'Feature key is required.'; end if;
  if normalized_visibility not in ('shared','pair','owner','recipient','scheduled','round') then
    raise exception 'Unsupported visibility.';
  end if;

  if p_recipient_id is not null and not exists (
    select 1 from public.pair_members pm where pm.pair_id = pid and pm.user_id = p_recipient_id
  ) then
    raise exception 'Recipient is not in your Koi pair.';
  end if;

  if p_id is not null then
    select * into existing
    from public.couple_feature_items
    where id = p_id and pair_id = pid;

    if existing.id is null then raise exception 'Feature item not found.'; end if;
    if existing.owner_id <> uid and existing.visibility <> 'shared' then
      raise exception 'Only the creator can edit this item.';
    end if;

    update public.couple_feature_items
    set title = p_title,
        payload = coalesce(p_payload, '{}'::jsonb),
        visibility = normalized_visibility,
        recipient_id = p_recipient_id,
        reveal_at = p_reveal_at,
        slot_key = p_slot_key,
        updated_at = now()
    where id = existing.id
    returning id into target_id;

    return target_id;
  end if;

  -- Shared singleton/slot: either partner can update the same row.
  if p_slot_key is not null and normalized_visibility = 'shared' then
    select * into existing
    from public.couple_feature_items
    where pair_id = pid
      and feature_key = p_feature_key
      and slot_key = p_slot_key
      and visibility = 'shared'
    order by created_at
    limit 1;

    if existing.id is not null then
      update public.couple_feature_items
      set title = p_title,
          payload = coalesce(p_payload, '{}'::jsonb),
          recipient_id = p_recipient_id,
          reveal_at = p_reveal_at,
          updated_at = now()
      where id = existing.id
      returning id into target_id;
      return target_id;
    end if;
  end if;

  -- Per-person singleton/slot (mood, one-line today, private round answer, etc.).
  if p_slot_key is not null and normalized_visibility <> 'shared' then
    select * into existing
    from public.couple_feature_items
    where pair_id = pid
      and feature_key = p_feature_key
      and slot_key = p_slot_key
      and owner_id = uid
    order by created_at
    limit 1;

    if existing.id is not null then
      update public.couple_feature_items
      set title = p_title,
          payload = coalesce(p_payload, '{}'::jsonb),
          visibility = normalized_visibility,
          recipient_id = p_recipient_id,
          reveal_at = p_reveal_at,
          updated_at = now()
      where id = existing.id
      returning id into target_id;
      return target_id;
    end if;
  end if;

  insert into public.couple_feature_items(
    pair_id, feature_key, slot_key, owner_id, recipient_id, title, payload, visibility, reveal_at
  ) values (
    pid, p_feature_key, p_slot_key, uid, p_recipient_id, p_title,
    coalesce(p_payload, '{}'::jsonb), normalized_visibility, p_reveal_at
  ) returning id into target_id;

  return target_id;
end;
$$;

grant execute on function public.koi_feature_save(uuid, text, text, text, jsonb, text, uuid, timestamptz) to authenticated;

create or replace function public.koi_feature_delete(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
  row_item public.couple_feature_items%rowtype;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  select pm.pair_id into pid from public.pair_members pm where pm.user_id = uid limit 1;
  if pid is null then raise exception 'No Koi pair found.'; end if;

  select * into row_item from public.couple_feature_items where id = p_id and pair_id = pid;
  if row_item.id is null then return false; end if;
  if row_item.owner_id <> uid and row_item.visibility <> 'shared' then
    raise exception 'Only the creator can delete this item.';
  end if;

  delete from public.couple_feature_items where id = p_id;
  return true;
end;
$$;

grant execute on function public.koi_feature_delete(uuid) to authenticated;

-- Send lightweight pair-private realtime refresh signals without broadcasting
-- private/scheduled feature payloads. The client treats this event only as a cue
-- to re-fetch the correctly redacted data through koi_feature_list().
create or replace function public.broadcast_koi_feature_item_change()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  target_pair_id uuid;
  target_id uuid;
  target_feature text;
begin
  target_pair_id := coalesce(new.pair_id, old.pair_id);
  target_id := coalesce(new.id, old.id);
  target_feature := coalesce(new.feature_key, old.feature_key);

  perform realtime.send(
    jsonb_build_object(
      'id', target_id,
      'feature_key', target_feature,
      'operation', tg_op
    ),
    'feature_changed',
    'pair:' || target_pair_id::text || ':couple_feature_items',
    true
  );

  return null;
end;
$$;

drop trigger if exists broadcast_couple_feature_items_changes on public.couple_feature_items;
create trigger broadcast_couple_feature_items_changes
after insert or update or delete on public.couple_feature_items
for each row execute function public.broadcast_koi_feature_item_change();

commit;
