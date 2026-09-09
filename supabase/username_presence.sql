-- Usernames, presence, and read receipts.

-- 1. Usernames -------------------------------------------------------------
-- Nullable on purpose: accounts created before this migration have none and
-- fall back to their email until they claim one.
alter table public.profiles add column if not exists username text;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[A-Za-z0-9_.-]{3,20}$');

-- A stored lowercase copy gives case-insensitive uniqueness AND lets the API
-- filter on an exact value. Filtering with ilike would be wrong here, because
-- underscores are legal in usernames but act as LIKE wildcards.
alter table public.profiles add column if not exists username_lower text
  generated always as (lower(username)) stored;

create unique index if not exists profiles_username_lower_idx
  on public.profiles (username_lower)
  where username_lower is not null;

-- 2. Presence --------------------------------------------------------------
alter table public.profiles add column if not exists last_seen_at timestamptz;

-- 3. Signup trigger --------------------------------------------------------
-- Claims the username supplied at signup, but only when it is well formed and
-- still free, so a race for the same name can never fail the signup itself.
create or replace function public.create_profile_for_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  claimed text := null;
begin
  if requested is not null
     and requested ~ '^[A-Za-z0-9_.-]{3,20}$'
     and not exists (select 1 from public.profiles p where lower(p.username) = lower(requested))
  then
    claimed := requested;
  end if;

  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(claimed, nullif(split_part(new.email, '@', 1), ''), 'Guest'),
    claimed
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.create_profile_for_user();

-- 4. Read receipts ---------------------------------------------------------
-- direct_messages.read_at already exists; index the lookup used to mark a
-- conversation read.
create index if not exists direct_messages_unread_idx
  on public.direct_messages (recipient_id, sender_id)
  where read_at is null;

-- Recipients update read_at through the server API (service role), and the
-- sender learns about it through the existing realtime publication.
alter table public.direct_messages replica identity full;
