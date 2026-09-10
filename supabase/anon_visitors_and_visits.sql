-- Anonymous direct messages, and a visit log for the owner.

-- 1. Visitors --------------------------------------------------------------
-- One row per anonymous visitor. The IP is the identifier the owner asked for;
-- a cookie token is kept alongside it so a person keeps the same thread when
-- their IP changes (mobile networks) and so two people behind one NAT are not
-- silently merged into a single conversation.
create table if not exists public.anon_visitors (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  ip text,
  label text not null,
  user_agent text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists anon_visitors_ip_idx on public.anon_visitors (ip);
alter table public.anon_visitors enable row level security;

-- 2. Visit log -------------------------------------------------------------
create table if not exists public.visits (
  id bigint generated always as identity primary key,
  ip text,
  visitor_token text,
  user_id uuid references auth.users(id) on delete set null,
  path text,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists visits_created_at_idx on public.visits (created_at desc);
create index if not exists visits_ip_idx on public.visits (ip, created_at desc);
alter table public.visits enable row level security;

-- Both tables are written and read only through the server API using the
-- service-role key. No public policies on purpose.

-- 3. Anonymous messages ----------------------------------------------------
-- An anonymous thread has the owner on one side and an anon_visitor on the
-- other, so one of sender_id / recipient_id is null.
alter table public.direct_messages alter column sender_id drop not null;
alter table public.direct_messages alter column recipient_id drop not null;
alter table public.direct_messages add column if not exists anon_visitor_id uuid
  references public.anon_visitors(id) on delete cascade;

alter table public.direct_messages drop constraint if exists direct_messages_participants;
alter table public.direct_messages add constraint direct_messages_participants check (
  -- account to account
  (anon_visitor_id is null and sender_id is not null and recipient_id is not null)
  -- anonymous visitor -> owner
  or (anon_visitor_id is not null and sender_id is null and recipient_id is not null)
  -- owner -> anonymous visitor
  or (anon_visitor_id is not null and sender_id is not null and recipient_id is null)
);

create index if not exists direct_messages_anon_idx
  on public.direct_messages (anon_visitor_id, created_at)
  where anon_visitor_id is not null;

-- The owner still reads anonymous threads through the existing policy, because
-- they are always the non-null side of the pair.

-- 4. Retention -------------------------------------------------------------
-- IP addresses are personal data. Keep the log short by running this
-- periodically (pg_cron, or manually):
--   delete from public.visits where created_at < now() - interval '90 days';
