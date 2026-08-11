-- Koi 💗 Foundation 2.0 — pair invite hotfix
-- Fixes invite-code generation on Supabase projects where pgcrypto lives in
-- the standard `extensions` schema rather than `public`.

begin;

create extension if not exists pgcrypto;

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
    invite_code := 'KOI-' || upper(encode(extensions.gen_random_bytes(6), 'hex'));
    begin
      insert into public.pair_invites(pair_id, code, created_by, expires_at)
      values (pid, invite_code, uid, now() + interval '7 days');
      exit;
    exception when unique_violation then
      -- Extremely unlikely collision; generate another code.
    end;
  end loop;

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
    invite_code := 'KOI-' || upper(encode(extensions.gen_random_bytes(6), 'hex'));
    begin
      insert into public.pair_invites(pair_id, code, created_by, expires_at)
      values (pid, invite_code, uid, now() + interval '7 days');
      exit;
    exception when unique_violation then
      -- Extremely unlikely collision; generate another code.
    end;
  end loop;

  return public.get_my_pair();
end;
$$;

grant execute on function public.create_koi_pair(date) to authenticated;
grant execute on function public.regenerate_pair_invite() to authenticated;

commit;
