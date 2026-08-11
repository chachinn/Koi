-- Koi 💗 Foundation 2.0
-- Production-minded schema for many independent couples.
-- First live-migrated feature: Little Things.
-- Generated 2026-08-11.

begin;

create extension if not exists pgcrypto;

-- ---------- Core identity ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Koi user' check (char_length(display_name) between 1 and 60),
  avatar text not null default '🌷' check (char_length(avatar) <= 16),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pairs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete restrict,
  anniversary date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pair_members (
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'partner' check (role in ('owner','partner')),
  joined_at timestamptz not null default now(),
  primary key (pair_id, user_id),
  unique (user_id)
);

create table if not exists public.pair_invites (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pair_members_pair_idx on public.pair_members(pair_id);
create index if not exists pair_invites_pair_idx on public.pair_invites(pair_id);
create index if not exists pair_invites_active_code_idx on public.pair_invites(code) where used_at is null;

-- ---------- Feature tables ----------

create table if not exists public.little_things (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  client_id text not null,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  about_user_id uuid references auth.users(id) on delete set null,
  text text not null check (char_length(text) between 1 and 400),
  category text not null default 'Everyday' check (char_length(category) <= 40),
  happened_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pair_id, client_id)
);
create index if not exists little_things_pair_date_idx on public.little_things(pair_id, happened_on desc, created_at desc);

create table if not exists public.question_answers (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  answer_date date not null,
  question_key text not null,
  question_text text not null,
  category text,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  answer_text text not null check (char_length(answer_text) between 1 and 1200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pair_id, answer_date, user_id)
);

create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mood text,
  energy smallint check (energy between 1 and 5),
  social_battery smallint check (social_battery between 1 and 5),
  need text,
  note text check (char_length(note) <= 800),
  created_at timestamptz not null default now()
);

create table if not exists public.eras (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  emoji text,
  start_date date,
  end_date date,
  description text,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  era_id uuid references public.eras(id) on delete set null,
  memory_type text not null default 'memory' check (memory_type in ('memory','two-sides')),
  title text not null,
  happened_on date,
  location text,
  note text,
  chapter text,
  tags text[] not null default '{}',
  cover_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memory_sides (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  side_text text not null check (char_length(side_text) between 1 and 1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (memory_id, user_id)
);

create table if not exists public.lore (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  era_id uuid references public.eras(id) on delete set null,
  title text not null,
  category text,
  origin text,
  current_meaning text,
  tags text[] not null default '{}',
  photo_path text,
  happened_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.date_ideas (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  category text,
  budget_band text,
  setting text,
  duration text,
  location text,
  completed boolean not null default false,
  completed_at timestamptz,
  rating text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.canon_entries (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null,
  text text not null,
  status text not null default 'official',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.canon_challenges (
  id uuid primary key default gen_random_uuid(),
  canon_entry_id uuid not null references public.canon_entries(id) on delete cascade,
  pair_id uuid not null references public.pairs(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  proposed_text text not null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.traditions (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  cadence text,
  start_date date,
  count integer not null default 0 check (count >= 0),
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prediction_rounds (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  predictor_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  guess text not null,
  actual text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.blind_date_preferences (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (pair_id, user_id)
);

create table if not exists public.then_now (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  prompt text not null,
  old_answer text not null,
  old_date date not null,
  new_answer text,
  revisit_date date,
  completed_at date,
  created_at timestamptz not null default now()
);

create table if not exists public.room_states (
  pair_id uuid primary key references public.pairs(id) on delete cascade,
  level integer not null default 1,
  points integer not null default 0,
  decor_ids text[] not null default '{}',
  unlocked_ids text[] not null default '{}',
  pink_koi_name text not null default 'Pink Koi',
  lavender_koi_name text not null default 'Lavender Koi',
  updated_at timestamptz not null default now()
);

create table if not exists public.theme_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pink_variant text not null default 'wedding',
  lavender_variant text not null default 'wedding',
  wallpaper_id text not null default 'petals',
  updated_at timestamptz not null default now()
);

-- ---------- Timestamp helper ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','pairs','little_things','question_answers','eras','memories',
    'memory_sides','lore','date_ideas','canon_entries','traditions',
    'blind_date_preferences','room_states','theme_preferences'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end $$;

-- ---------- Auth profile creation ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, 'Koi user'), '@', 1)),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'avatar'), ''), '🌷')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------- Authorization helpers ----------

create or replace function public.is_pair_member(target_pair_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pair_members pm
    where pm.pair_id = target_pair_id
      and pm.user_id = (select auth.uid())
  );
$$;

create or replace function public.shares_pair_with(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pair_members mine
    join public.pair_members theirs on theirs.pair_id = mine.pair_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = other_user_id
  );
$$;

create or replace function public.can_access_realtime_topic(topic_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_pair uuid;
begin
  if topic_name !~ '^pair:[0-9a-fA-F-]{36}:[a-z_]+$' then
    return false;
  end if;
  target_pair := split_part(topic_name, ':', 2)::uuid;
  return public.is_pair_member(target_pair);
exception when others then
  return false;
end;
$$;

create or replace function public.can_access_storage_path(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_pair uuid;
begin
  target_pair := split_part(object_name, '/', 1)::uuid;
  return public.is_pair_member(target_pair);
exception when others then
  return false;
end;
$$;

revoke all on function public.is_pair_member(uuid) from public;
revoke all on function public.shares_pair_with(uuid) from public;
revoke all on function public.can_access_realtime_topic(text) from public;
revoke all on function public.can_access_storage_path(text) from public;

grant execute on function public.is_pair_member(uuid) to authenticated;
grant execute on function public.shares_pair_with(uuid) to authenticated;
grant execute on function public.can_access_realtime_topic(text) to authenticated;
grant execute on function public.can_access_storage_path(text) to authenticated;

-- ---------- Pair RPCs ----------

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

create or replace function public.create_koi_pair(p_anniversary date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
  invite_code text;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  if exists (select 1 from public.pair_members where user_id = uid) then
    raise exception 'This account already belongs to a Koi pair.';
  end if;

  insert into public.pairs(created_by, anniversary)
  values (uid, p_anniversary)
  returning id into pid;

  insert into public.pair_members(pair_id, user_id, role)
  values (pid, uid, 'owner');

  loop
    invite_code := 'KOI-' || upper(encode(gen_random_bytes(6), 'hex'));
    begin
      insert into public.pair_invites(pair_id, code, created_by, expires_at)
      values (pid, invite_code, uid, now() + interval '7 days');
      exit;
    exception when unique_violation then
      -- generate another code
    end;
  end loop;

  return public.get_my_pair();
end;
$$;

create or replace function public.join_koi_pair(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inv public.pair_invites%rowtype;
  member_count integer;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  if exists (select 1 from public.pair_members where user_id = uid) then
    raise exception 'This account already belongs to a Koi pair.';
  end if;

  select * into inv
  from public.pair_invites
  where upper(code) = upper(trim(p_invite_code))
    and used_at is null
    and expires_at > now()
  for update;

  if inv.id is null then raise exception 'That invite code is invalid or expired.'; end if;

  select count(*) into member_count
  from public.pair_members
  where pair_id = inv.pair_id;

  if member_count >= 2 then
    raise exception 'This Koi pair already has two people.';
  end if;

  insert into public.pair_members(pair_id, user_id, role)
  values (inv.pair_id, uid, 'partner');

  update public.pair_invites set used_at = now() where id = inv.id;

  return public.get_my_pair();
end;
$$;

create or replace function public.regenerate_pair_invite()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
  member_count integer;
  invite_code text;
begin
  select pair_id into pid from public.pair_members where user_id = uid limit 1;
  if pid is null then raise exception 'No Koi pair found.'; end if;

  select count(*) into member_count from public.pair_members where pair_id = pid;
  if member_count >= 2 then raise exception 'Your pair is already complete.'; end if;

  update public.pair_invites
  set used_at = coalesce(used_at, now())
  where pair_id = pid and used_at is null;

  loop
    invite_code := 'KOI-' || upper(encode(gen_random_bytes(6), 'hex'));
    begin
      insert into public.pair_invites(pair_id, code, created_by, expires_at)
      values (pid, invite_code, uid, now() + interval '7 days');
      exit;
    exception when unique_violation then
    end;
  end loop;

  return public.get_my_pair();
end;
$$;

grant execute on function public.get_my_pair() to authenticated;
grant execute on function public.create_koi_pair(date) to authenticated;
grant execute on function public.join_koi_pair(text) to authenticated;
grant execute on function public.regenerate_pair_invite() to authenticated;

-- ---------- Secure reveal RPC example for Daily Questions ----------
-- Pair members cannot directly SELECT their partner's private answer.
-- This RPC reveals both only after both members have answered.

create or replace function public.get_daily_question_answers(p_pair_id uuid, p_answer_date date)
returns table (
  user_id uuid,
  answer_text text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  answer_count integer;
  member_count integer;
begin
  if not public.is_pair_member(p_pair_id) then
    raise exception 'Not authorized for this pair.';
  end if;

  select count(*) into answer_count
  from public.question_answers
  where pair_id = p_pair_id and answer_date = p_answer_date;

  select count(*) into member_count
  from public.pair_members
  where pair_id = p_pair_id;

  if member_count >= 2 and answer_count >= member_count then
    return query
      select qa.user_id, qa.answer_text, qa.created_at
      from public.question_answers qa
      where qa.pair_id = p_pair_id and qa.answer_date = p_answer_date;
  else
    return query
      select qa.user_id, qa.answer_text, qa.created_at
      from public.question_answers qa
      where qa.pair_id = p_pair_id
        and qa.answer_date = p_answer_date
        and qa.user_id = auth.uid();
  end if;
end;
$$;

grant execute on function public.get_daily_question_answers(uuid, date) to authenticated;

-- ---------- RLS ----------

alter table public.profiles enable row level security;
alter table public.pairs enable row level security;
alter table public.pair_members enable row level security;
alter table public.pair_invites enable row level security;
alter table public.little_things enable row level security;
alter table public.question_answers enable row level security;
alter table public.check_ins enable row level security;
alter table public.eras enable row level security;
alter table public.memories enable row level security;
alter table public.memory_sides enable row level security;
alter table public.lore enable row level security;
alter table public.date_ideas enable row level security;
alter table public.canon_entries enable row level security;
alter table public.canon_challenges enable row level security;
alter table public.traditions enable row level security;
alter table public.prediction_rounds enable row level security;
alter table public.blind_date_preferences enable row level security;
alter table public.then_now enable row level security;
alter table public.room_states enable row level security;
alter table public.theme_preferences enable row level security;

-- profiles
create policy "profiles_select_self_or_partner" on public.profiles
for select to authenticated
using (id = auth.uid() or public.shares_pair_with(id));

create policy "profiles_update_self" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- pairs
create policy "pairs_select_members" on public.pairs
for select to authenticated
using (public.is_pair_member(id));

create policy "pairs_update_members" on public.pairs
for update to authenticated
using (public.is_pair_member(id))
with check (public.is_pair_member(id));

create policy "pairs_delete_owner" on public.pairs
for delete to authenticated
using (created_by = auth.uid());

-- pair_members
create policy "pair_members_select_pair" on public.pair_members
for select to authenticated
using (public.is_pair_member(pair_id));

-- pair_invites
create policy "pair_invites_select_pair" on public.pair_invites
for select to authenticated
using (public.is_pair_member(pair_id));

-- helper for common pair-shared tables
create policy "little_things_select_pair" on public.little_things
for select to authenticated using (public.is_pair_member(pair_id));
create policy "little_things_insert_pair" on public.little_things
for insert to authenticated with check (public.is_pair_member(pair_id) and created_by = auth.uid());
create policy "little_things_update_creator" on public.little_things
for update to authenticated using (created_by = auth.uid()) with check (public.is_pair_member(pair_id) and created_by = auth.uid());
create policy "little_things_delete_creator" on public.little_things
for delete to authenticated using (created_by = auth.uid());

create policy "question_answers_select_own" on public.question_answers
for select to authenticated using (user_id = auth.uid() and public.is_pair_member(pair_id));
create policy "question_answers_insert_own" on public.question_answers
for insert to authenticated with check (user_id = auth.uid() and public.is_pair_member(pair_id));
create policy "question_answers_update_own" on public.question_answers
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_pair_member(pair_id));
create policy "question_answers_delete_own" on public.question_answers
for delete to authenticated using (user_id = auth.uid());

create policy "check_ins_select_pair" on public.check_ins
for select to authenticated using (public.is_pair_member(pair_id));
create policy "check_ins_insert_own" on public.check_ins
for insert to authenticated with check (user_id = auth.uid() and public.is_pair_member(pair_id));
create policy "check_ins_update_own" on public.check_ins
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "check_ins_delete_own" on public.check_ins
for delete to authenticated using (user_id = auth.uid());

create policy "eras_pair_all" on public.eras
for all to authenticated
using (public.is_pair_member(pair_id))
with check (public.is_pair_member(pair_id));

create policy "memories_pair_all" on public.memories
for all to authenticated
using (public.is_pair_member(pair_id))
with check (public.is_pair_member(pair_id));

create policy "memory_sides_select_own" on public.memory_sides
for select to authenticated using (user_id = auth.uid() and public.is_pair_member(pair_id));
create policy "memory_sides_insert_own" on public.memory_sides
for insert to authenticated with check (user_id = auth.uid() and public.is_pair_member(pair_id));
create policy "memory_sides_update_own" on public.memory_sides
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "memory_sides_delete_own" on public.memory_sides
for delete to authenticated using (user_id = auth.uid());

create policy "lore_pair_all" on public.lore
for all to authenticated using (public.is_pair_member(pair_id)) with check (public.is_pair_member(pair_id));

create policy "date_ideas_pair_all" on public.date_ideas
for all to authenticated using (public.is_pair_member(pair_id)) with check (public.is_pair_member(pair_id));

create policy "canon_entries_pair_all" on public.canon_entries
for all to authenticated using (public.is_pair_member(pair_id)) with check (public.is_pair_member(pair_id));

create policy "canon_challenges_pair_all" on public.canon_challenges
for all to authenticated using (public.is_pair_member(pair_id)) with check (public.is_pair_member(pair_id));

create policy "traditions_pair_all" on public.traditions
for all to authenticated using (public.is_pair_member(pair_id)) with check (public.is_pair_member(pair_id));

create policy "prediction_rounds_pair_select" on public.prediction_rounds
for select to authenticated using (public.is_pair_member(pair_id));
create policy "prediction_rounds_pair_insert" on public.prediction_rounds
for insert to authenticated with check (public.is_pair_member(pair_id) and predictor_user_id = auth.uid());
create policy "prediction_rounds_pair_update_target" on public.prediction_rounds
for update to authenticated
using (public.is_pair_member(pair_id) and (predictor_user_id = auth.uid() or target_user_id = auth.uid()))
with check (public.is_pair_member(pair_id));

create policy "blind_date_select_own" on public.blind_date_preferences
for select to authenticated using (user_id = auth.uid() and public.is_pair_member(pair_id));
create policy "blind_date_insert_own" on public.blind_date_preferences
for insert to authenticated with check (user_id = auth.uid() and public.is_pair_member(pair_id));
create policy "blind_date_update_own" on public.blind_date_preferences
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "then_now_own" on public.then_now
for all to authenticated using (user_id = auth.uid() and public.is_pair_member(pair_id))
with check (user_id = auth.uid() and public.is_pair_member(pair_id));

create policy "room_states_pair_all" on public.room_states
for all to authenticated using (public.is_pair_member(pair_id)) with check (public.is_pair_member(pair_id));

create policy "theme_preferences_own" on public.theme_preferences
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Data API grants ----------
-- RLS remains the real authorization boundary.

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.pairs,
  public.pair_members,
  public.pair_invites,
  public.little_things,
  public.question_answers,
  public.check_ins,
  public.eras,
  public.memories,
  public.memory_sides,
  public.lore,
  public.date_ideas,
  public.canon_entries,
  public.canon_challenges,
  public.traditions,
  public.prediction_rounds,
  public.blind_date_preferences,
  public.then_now,
  public.room_states,
  public.theme_preferences
to authenticated;

-- ---------- Private storage ----------
-- Path convention: <pair_uuid>/<feature>/<filename>

insert into storage.buckets (id, name, public)
values ('koi-media', 'koi-media', false)
on conflict (id) do update set public = false;

drop policy if exists "koi_media_select" on storage.objects;
create policy "koi_media_select" on storage.objects
for select to authenticated
using (bucket_id = 'koi-media' and public.can_access_storage_path(name));

drop policy if exists "koi_media_insert" on storage.objects;
create policy "koi_media_insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'koi-media' and public.can_access_storage_path(name));

drop policy if exists "koi_media_update" on storage.objects;
create policy "koi_media_update" on storage.objects
for update to authenticated
using (bucket_id = 'koi-media' and public.can_access_storage_path(name))
with check (bucket_id = 'koi-media' and public.can_access_storage_path(name));

drop policy if exists "koi_media_delete" on storage.objects;
create policy "koi_media_delete" on storage.objects
for delete to authenticated
using (bucket_id = 'koi-media' and public.can_access_storage_path(name));

-- ---------- Scalable Realtime: Broadcast ----------
-- Supabase recommends Broadcast for scalability/security over Postgres Changes.

drop policy if exists "koi_pair_members_receive_broadcasts" on realtime.messages;
create policy "koi_pair_members_receive_broadcasts"
on realtime.messages
for select
to authenticated
using (public.can_access_realtime_topic(realtime.topic()));

create or replace function public.broadcast_pair_row_change()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  target_pair_id uuid;
begin
  target_pair_id := coalesce(new.pair_id, old.pair_id);

  perform realtime.broadcast_changes(
    'pair:' || target_pair_id::text || ':' || tg_table_name,
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

drop trigger if exists broadcast_little_things_changes on public.little_things;
create trigger broadcast_little_things_changes
after insert or update or delete on public.little_things
for each row execute function public.broadcast_pair_row_change();

commit;
