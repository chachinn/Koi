-- Koi 💗 Foundation 2.2 — pair-wide shared edits + stronger realtime refresh
-- Keeps private features private while syncing shared appearance/content/preferences.

begin;

create table if not exists public.pair_shared_state (
  pair_id uuid primary key references public.pairs(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.pair_shared_state enable row level security;

drop policy if exists "pair_shared_state_select" on public.pair_shared_state;
create policy "pair_shared_state_select" on public.pair_shared_state
for select to authenticated
using (public.is_pair_member(pair_id));

drop policy if exists "pair_shared_state_insert" on public.pair_shared_state;
create policy "pair_shared_state_insert" on public.pair_shared_state
for insert to authenticated
with check (public.is_pair_member(pair_id) and updated_by = auth.uid());

drop policy if exists "pair_shared_state_update" on public.pair_shared_state;
create policy "pair_shared_state_update" on public.pair_shared_state
for update to authenticated
using (public.is_pair_member(pair_id))
with check (public.is_pair_member(pair_id) and updated_by = auth.uid());

grant select, insert, update, delete on public.pair_shared_state to authenticated;

drop trigger if exists set_updated_at on public.pair_shared_state;
create trigger set_updated_at
before update on public.pair_shared_state
for each row execute function public.set_updated_at();

-- Atomic top-level JSON patch. Different shared domains can be updated without
-- replacing the whole document, reducing accidental last-write-wins conflicts.
create or replace function public.patch_pair_shared_state(
  p_pair_id uuid,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  if not public.is_pair_member(p_pair_id) then
    raise exception 'You do not have access to this Koi pair.';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Shared state patch must be a JSON object.';
  end if;

  insert into public.pair_shared_state(pair_id, data, updated_by)
  values (p_pair_id, p_patch, uid)
  on conflict (pair_id) do update
    set data = public.pair_shared_state.data || excluded.data,
        updated_by = uid,
        updated_at = now()
  returning data into result;

  return result;
end;
$$;

grant execute on function public.patch_pair_shared_state(uuid, jsonb) to authenticated;

-- Generic pair-row Broadcast already exists from Foundation 2.0.
drop trigger if exists broadcast_pair_shared_state_changes on public.pair_shared_state;
create trigger broadcast_pair_shared_state_changes
after insert or update or delete on public.pair_shared_state
for each row execute function public.broadcast_pair_row_change();

-- Pair rows use id rather than pair_id, so they need their own trigger helper.
create or replace function public.broadcast_pair_record_change()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  target_pair_id uuid;
begin
  target_pair_id := coalesce(new.id, old.id);
  perform realtime.broadcast_changes(
    'pair:' || target_pair_id::text || ':pairs',
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return null;
end;
$$;

drop trigger if exists broadcast_pairs_changes on public.pairs;
create trigger broadcast_pairs_changes
after update on public.pairs
for each row execute function public.broadcast_pair_record_change();

-- Membership changes tell the creator immediately when their partner joins.
drop trigger if exists broadcast_pair_members_changes on public.pair_members;
create trigger broadcast_pair_members_changes
after insert or update or delete on public.pair_members
for each row execute function public.broadcast_pair_row_change();

-- Profile rows have no pair_id. Broadcast an update to each pair the profile belongs to.
create or replace function public.broadcast_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  member_row record;
  target_user uuid;
begin
  target_user := coalesce(new.id, old.id);

  for member_row in
    select pm.pair_id
    from public.pair_members pm
    where pm.user_id = target_user
  loop
    perform realtime.broadcast_changes(
      'pair:' || member_row.pair_id::text || ':profiles',
      tg_op,
      tg_op,
      tg_table_name,
      tg_table_schema,
      new,
      old
    );
  end loop;

  return null;
end;
$$;

drop trigger if exists broadcast_profiles_changes on public.profiles;
create trigger broadcast_profiles_changes
after update on public.profiles
for each row execute function public.broadcast_profile_change();

commit;
