-- Koi 💗 Foundation 2.1 — relationship modes + cloud memory media
-- Adds married mode / two anniversaries and multiple private photos per memory.

begin;

-- ---------- Relationship mode + two anniversaries ----------

alter table public.pairs
  add column if not exists relationship_mode text,
  add column if not exists dating_anniversary date,
  add column if not exists wedding_anniversary date;

update public.pairs
set dating_anniversary = coalesce(dating_anniversary, anniversary),
    relationship_mode = coalesce(nullif(relationship_mode, ''), case when wedding_anniversary is not null then 'married' else 'dating' end);

alter table public.pairs
  alter column relationship_mode set default 'dating';

update public.pairs set relationship_mode = 'dating' where relationship_mode is null;

alter table public.pairs
  alter column relationship_mode set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pairs_relationship_mode_check'
      and conrelid = 'public.pairs'::regclass
  ) then
    alter table public.pairs
      add constraint pairs_relationship_mode_check
      check (relationship_mode in ('dating', 'married'));
  end if;
end $$;

-- ---------- Multiple private media items per memory ----------

create table if not exists public.memory_media (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  pair_id uuid not null references public.pairs(id) on delete cascade,
  uploaded_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  media_type text not null default 'photo' check (media_type in ('photo')),
  storage_path text not null unique,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memory_media_memory_idx on public.memory_media(memory_id, sort_order, created_at);
create index if not exists memory_media_pair_idx on public.memory_media(pair_id);

alter table public.memory_media enable row level security;

drop policy if exists "memory_media_pair_all" on public.memory_media;
create policy "memory_media_pair_all" on public.memory_media
for all to authenticated
using (public.is_pair_member(pair_id))
with check (public.is_pair_member(pair_id));

drop trigger if exists set_updated_at on public.memory_media;
create trigger set_updated_at
before update on public.memory_media
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.memory_media to authenticated;

-- ---------- Pair payload now includes relationship fields ----------

create or replace function public.get_my_pair()
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
  if uid is null then return null; end if;

  select pm.pair_id into pid
  from public.pair_members pm
  where pm.user_id = uid
  limit 1;

  if pid is null then return null; end if;

  select jsonb_build_object(
    'pair', jsonb_build_object(
      'id', p.id,
      'anniversary', p.anniversary,
      'relationship_mode', p.relationship_mode,
      'dating_anniversary', p.dating_anniversary,
      'wedding_anniversary', p.wedding_anniversary,
      'created_by', p.created_by,
      'created_at', p.created_at
    ),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', pm.user_id,
        'role', pm.role,
        'joined_at', pm.joined_at,
        'display_name', pr.display_name,
        'avatar', pr.avatar
      ) order by pm.joined_at)
      from public.pair_members pm
      join public.profiles pr on pr.id = pm.user_id
      where pm.pair_id = pid
    ), '[]'::jsonb),
    'invite', (
      select jsonb_build_object('code', pi.code, 'expires_at', pi.expires_at)
      from public.pair_invites pi
      where pi.pair_id = pid and pi.used_at is null and pi.expires_at > now()
      order by pi.created_at desc
      limit 1
    )
  )
  into result
  from public.pairs p
  where p.id = pid;

  return result;
end;
$$;

grant execute on function public.get_my_pair() to authenticated;

create or replace function public.update_koi_relationship_settings(
  p_relationship_mode text,
  p_dating_anniversary date default null,
  p_wedding_anniversary date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
  normalized_mode text := lower(trim(coalesce(p_relationship_mode, 'dating')));
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  if normalized_mode not in ('dating', 'married') then
    raise exception 'Choose Dating or Married.';
  end if;

  select pair_id into pid
  from public.pair_members
  where user_id = uid
  limit 1;

  if pid is null then raise exception 'No Koi pair found.'; end if;

  if p_dating_anniversary is not null and p_dating_anniversary > current_date then
    raise exception 'Dating anniversary cannot be in the future.';
  end if;

  if p_wedding_anniversary is not null and p_wedding_anniversary > current_date then
    raise exception 'Wedding anniversary cannot be in the future.';
  end if;

  update public.pairs
  set relationship_mode = normalized_mode,
      dating_anniversary = p_dating_anniversary,
      wedding_anniversary = case when normalized_mode = 'married' then p_wedding_anniversary else null end,
      anniversary = coalesce(p_dating_anniversary, anniversary)
  where id = pid;

  return public.get_my_pair();
end;
$$;

grant execute on function public.update_koi_relationship_settings(text, date, date) to authenticated;

-- Reveal both private sides only after both pair members have submitted.
create or replace function public.get_memory_sides_if_complete(p_memory_id uuid)
returns table (
  user_id uuid,
  side_text text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  pid uuid;
  side_count integer;
begin
  select m.pair_id into pid
  from public.memories m
  where m.id = p_memory_id;

  if pid is null or not public.is_pair_member(pid) then
    raise exception 'You do not have access to this memory.';
  end if;

  select count(distinct ms.user_id) into side_count
  from public.memory_sides ms
  where ms.memory_id = p_memory_id;

  if side_count < 2 then
    return;
  end if;

  return query
  select ms.user_id, ms.side_text, ms.created_at
  from public.memory_sides ms
  where ms.memory_id = p_memory_id
  order by ms.created_at;
end;
$$;

grant execute on function public.get_memory_sides_if_complete(uuid) to authenticated;

-- Realtime refresh signals for cloud-backed memories and media.
drop trigger if exists broadcast_memories_changes on public.memories;
create trigger broadcast_memories_changes
after insert or update or delete on public.memories
for each row execute function public.broadcast_pair_row_change();

drop trigger if exists broadcast_memory_sides_changes on public.memory_sides;
create trigger broadcast_memory_sides_changes
after insert or update or delete on public.memory_sides
for each row execute function public.broadcast_pair_row_change();

drop trigger if exists broadcast_memory_media_changes on public.memory_media;
create trigger broadcast_memory_media_changes
after insert or update or delete on public.memory_media
for each row execute function public.broadcast_pair_row_change();

commit;
