create table if not exists public.things_posts (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 2000),
  image_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.things_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.things_posts(id) on delete cascade,
  author_name text not null default 'Ghost' check (char_length(author_name) between 1 and 40),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.things_likes (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.things_posts(id) on delete cascade,
  visitor_id uuid not null,
  created_at timestamptz not null default now(),
  unique (post_id, visitor_id)
);

create index if not exists things_posts_created_at_idx on public.things_posts (created_at desc);
create index if not exists things_comments_post_id_idx on public.things_comments (post_id, created_at asc);
create index if not exists things_likes_post_id_idx on public.things_likes (post_id);

alter table public.things_posts enable row level security;
alter table public.things_comments enable row level security;
alter table public.things_likes enable row level security;

-- All writes go through the app's server API using the service-role key.
-- Direct public access stays disabled.

create table if not exists public.community_messages (
  id bigint generated always as identity primary key,
  parent_id bigint references public.community_messages(id) on delete cascade,
  author_name text not null default 'Ghost' check (char_length(author_name) between 1 and 40),
  body text not null check (char_length(body) between 1 and 1000),
  is_owner boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists community_messages_created_at_idx on public.community_messages (created_at desc);
create index if not exists community_messages_parent_id_idx on public.community_messages (parent_id, created_at asc);
alter table public.community_messages enable row level security;

create table if not exists public.direct_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists direct_messages_sender_idx on public.direct_messages (sender_id, created_at desc);
create index if not exists direct_messages_recipient_idx on public.direct_messages (recipient_id, created_at desc);
alter table public.direct_messages enable row level security;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Guest' check (char_length(display_name) between 1 and 40),
  role text not null default 'guest' check (role in ('admin', 'guest')),
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists is_super_admin boolean not null default false;
create unique index if not exists one_super_admin_profile_idx on public.profiles ((is_super_admin)) where is_super_admin;

create or replace function public.create_profile_for_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Guest'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.create_profile_for_user();

alter table public.profiles enable row level security;
grant select on public.profiles, public.direct_messages to authenticated;
grant update (display_name) on public.profiles to authenticated;

drop policy if exists "users can read profiles" on public.profiles;
create policy "users can read profiles" on public.profiles for select to authenticated using (true);
drop policy if exists "users can edit own display name" on public.profiles;
create policy "users can edit own display name" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "participants can read direct messages" on public.direct_messages;
create policy "participants can read direct messages" on public.direct_messages for select to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);

alter table public.direct_messages replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end;
$$;
