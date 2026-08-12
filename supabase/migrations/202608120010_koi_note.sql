-- Koi 💗 Step 31 — shared Koi Note / future widget data
begin;

create table if not exists public.pair_notes (
  pair_id uuid primary key references public.pairs(id) on delete cascade,
  body text not null default '',
  emoji text not null default '💗',
  style_key text not null default 'blush',
  author_id uuid references auth.users(id) on delete set null,
  version bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint pair_notes_body_len check (char_length(body) <= 220),
  constraint pair_notes_emoji_len check (char_length(emoji) <= 16),
  constraint pair_notes_style check (style_key in ('blush','lavender','cream','sky','mint','sunny'))
);

create table if not exists public.pair_note_history (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  body text not null,
  emoji text not null default '💗',
  style_key text not null default 'blush',
  author_id uuid references auth.users(id) on delete set null,
  is_kept boolean not null default false,
  created_at timestamptz not null default now(),
  constraint pair_note_history_body_len check (char_length(body) between 1 and 220),
  constraint pair_note_history_emoji_len check (char_length(emoji) <= 16),
  constraint pair_note_history_style check (style_key in ('blush','lavender','cream','sky','mint','sunny'))
);

create index if not exists pair_note_history_pair_created_idx
  on public.pair_note_history(pair_id, created_at desc);

alter table public.pair_notes enable row level security;
alter table public.pair_note_history enable row level security;

-- Both paired users may read the active note and history.
drop policy if exists "pair_notes_select_pair" on public.pair_notes;
create policy "pair_notes_select_pair" on public.pair_notes
for select to authenticated using (public.is_pair_member(pair_id));

drop policy if exists "pair_note_history_select_pair" on public.pair_note_history;
create policy "pair_note_history_select_pair" on public.pair_note_history
for select to authenticated using (public.is_pair_member(pair_id));

-- Active-note writes go through set_koi_note() so validation/history stay atomic.
grant select on public.pair_notes to authenticated;
grant select on public.pair_note_history to authenticated;

create or replace function public.set_koi_note(
  p_pair_id uuid,
  p_body text,
  p_emoji text default '💗',
  p_style_key text default 'blush'
)
returns public.pair_notes
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  clean_body text := btrim(coalesce(p_body, ''));
  clean_emoji text := left(coalesce(nullif(btrim(p_emoji), ''), '💗'), 16);
  clean_style text := coalesce(nullif(btrim(p_style_key), ''), 'blush');
  result public.pair_notes;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_pair_id is null or not public.is_pair_member(p_pair_id) then
    raise exception 'Not a member of this Koi pair';
  end if;
  if char_length(clean_body) > 220 then raise exception 'Koi Notes can be up to 220 characters'; end if;
  if clean_style not in ('blush','lavender','cream','sky','mint','sunny') then clean_style := 'blush'; end if;

  insert into public.pair_notes(pair_id, body, emoji, style_key, author_id, version, updated_at)
  values (p_pair_id, clean_body, clean_emoji, clean_style, uid, 1, now())
  on conflict (pair_id) do update
    set body = excluded.body,
        emoji = excluded.emoji,
        style_key = excluded.style_key,
        author_id = uid,
        version = public.pair_notes.version + 1,
        updated_at = now()
  returning * into result;

  if clean_body <> '' then
    insert into public.pair_note_history(pair_id, body, emoji, style_key, author_id)
    values (p_pair_id, clean_body, clean_emoji, clean_style, uid);

    -- Keep history lightweight: retain all explicitly kept notes plus the newest
    -- 100 ordinary notes. This prevents the tiny widget feature from growing forever.
    delete from public.pair_note_history h
    where h.pair_id = p_pair_id
      and h.is_kept = false
      and h.id in (
        select id from public.pair_note_history
        where pair_id = p_pair_id and is_kept = false
        order by created_at desc
        offset 100
      );
  end if;

  return result;
end;
$$;

grant execute on function public.set_koi_note(uuid,text,text,text) to authenticated;

create or replace function public.toggle_koi_note_keep(p_history_id uuid, p_keep boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_pair uuid;
begin
  select pair_id into target_pair from public.pair_note_history where id = p_history_id;
  if target_pair is null then raise exception 'Note history item not found'; end if;
  if auth.uid() is null or not public.is_pair_member(target_pair) then raise exception 'Not a member of this Koi pair'; end if;
  update public.pair_note_history set is_kept = coalesce(p_keep, false) where id = p_history_id;
end;
$$;

grant execute on function public.toggle_koi_note_keep(uuid,boolean) to authenticated;

-- Reuse the Step 27/29 pair-wide sync bus so Koi Note does not open another
-- realtime channel or add extra background load to the phones.
drop trigger if exists koi_sync_pair_notes on public.pair_notes;
create trigger koi_sync_pair_notes
after insert or update or delete on public.pair_notes
for each row execute function public.broadcast_koi_sync_pair_row('note');

drop trigger if exists koi_sync_pair_note_history on public.pair_note_history;
create trigger koi_sync_pair_note_history
after insert or update or delete on public.pair_note_history
for each row execute function public.broadcast_koi_sync_pair_row('note');

commit;
