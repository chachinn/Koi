-- Koi 💗 Step 27 — Stability / pair-wide live sync bus
-- Adds one lightweight private Realtime topic per pair. Existing older broadcast
-- triggers are intentionally left in place for backward compatibility; Step 27
-- clients subscribe only to the new :sync topic.

begin;

create or replace function public.broadcast_koi_sync_pair_row()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  target_pair_id uuid;
  target_id uuid;
  sync_domain text := coalesce(nullif(tg_argv[0], ''), tg_table_name);
begin
  target_pair_id := coalesce(new.pair_id, old.pair_id);
  target_id := coalesce(new.id, old.id);

  if target_pair_id is null then
    return null;
  end if;

  perform realtime.send(
    jsonb_build_object(
      'domain', sync_domain,
      'table', tg_table_name,
      'operation', tg_op,
      'row_id', target_id,
      'actor_id', auth.uid()
    ),
    'sync',
    'pair:' || target_pair_id::text || ':sync',
    true
  );

  return null;
end;
$$;

create or replace function public.broadcast_koi_sync_pair_record()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  target_pair_id uuid := coalesce(new.id, old.id);
begin
  if target_pair_id is null then return null; end if;

  perform realtime.send(
    jsonb_build_object(
      'domain', 'pair',
      'table', 'pairs',
      'operation', tg_op,
      'row_id', target_pair_id,
      'actor_id', auth.uid()
    ),
    'sync',
    'pair:' || target_pair_id::text || ':sync',
    true
  );
  return null;
end;
$$;

create or replace function public.broadcast_koi_sync_profile()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  target_user uuid := coalesce(new.id, old.id);
  member_row record;
begin
  if target_user is null then return null; end if;

  for member_row in
    select pm.pair_id
    from public.pair_members pm
    where pm.user_id = target_user
  loop
    perform realtime.send(
      jsonb_build_object(
        'domain', 'pair',
        'table', 'profiles',
        'operation', tg_op,
        'row_id', target_user,
        'actor_id', auth.uid()
      ),
      'sync',
      'pair:' || member_row.pair_id::text || ':sync',
      true
    );
  end loop;

  return null;
end;
$$;

-- The features actively used by the current Koi client.
drop trigger if exists koi_sync_little_things on public.little_things;
create trigger koi_sync_little_things
after insert or update or delete on public.little_things
for each row execute function public.broadcast_koi_sync_pair_row('littleThings');

drop trigger if exists koi_sync_memories on public.memories;
create trigger koi_sync_memories
after insert or update or delete on public.memories
for each row execute function public.broadcast_koi_sync_pair_row('memories');

drop trigger if exists koi_sync_memory_sides on public.memory_sides;
create trigger koi_sync_memory_sides
after insert or update or delete on public.memory_sides
for each row execute function public.broadcast_koi_sync_pair_row('memories');

drop trigger if exists koi_sync_memory_media on public.memory_media;
create trigger koi_sync_memory_media
after insert or update or delete on public.memory_media
for each row execute function public.broadcast_koi_sync_pair_row('memories');

drop trigger if exists koi_sync_shared_state on public.pair_shared_state;
create trigger koi_sync_shared_state
after insert or update or delete on public.pair_shared_state
for each row execute function public.broadcast_koi_sync_pair_row('sharedState');

drop trigger if exists koi_sync_world on public.couple_feature_items;
create trigger koi_sync_world
after insert or update or delete on public.couple_feature_items
for each row execute function public.broadcast_koi_sync_pair_row('world');

drop trigger if exists koi_sync_pair_members on public.pair_members;
create trigger koi_sync_pair_members
after insert or update or delete on public.pair_members
for each row execute function public.broadcast_koi_sync_pair_row('pair');

drop trigger if exists koi_sync_pairs on public.pairs;
create trigger koi_sync_pairs
after update on public.pairs
for each row execute function public.broadcast_koi_sync_pair_record();

drop trigger if exists koi_sync_profiles on public.profiles;
create trigger koi_sync_profiles
after update on public.profiles
for each row execute function public.broadcast_koi_sync_profile();

-- Prepare the already-existing private feature tables for the next migrations.
-- These events are harmless if the current client has no handler yet.
drop trigger if exists koi_sync_question_answers on public.question_answers;
create trigger koi_sync_question_answers
after insert or update or delete on public.question_answers
for each row execute function public.broadcast_koi_sync_pair_row('questions');

drop trigger if exists koi_sync_check_ins on public.check_ins;
create trigger koi_sync_check_ins
after insert or update or delete on public.check_ins
for each row execute function public.broadcast_koi_sync_pair_row('checkins');

commit;
