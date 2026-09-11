-- Connection requests. Two ordinary accounts must be connected before they can
-- message each other; the owner is exempt in both directions.

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint connections_distinct check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create index if not exists connections_requester_idx on public.connections (requester_id, status);
create index if not exists connections_addressee_idx on public.connections (addressee_id, status);

alter table public.connections enable row level security;

-- Writes go through the server API with the service-role key. Reads are
-- allowed for the two participants so realtime can deliver requests live, and
-- for the owner so the admin view stays complete.
drop policy if exists "participants read connections" on public.connections;
create policy "participants read connections" on public.connections
  for select to authenticated
  using (
    auth.uid() = requester_id
    or auth.uid() = addressee_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin)
  );

alter table public.connections replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'connections'
  ) then
    alter publication supabase_realtime add table public.connections;
  end if;
end;
$$;
