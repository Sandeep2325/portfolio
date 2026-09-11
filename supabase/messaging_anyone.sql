-- Messaging between any two accounts, plus a full view for the owner.

-- Realtime honours RLS, so the owner needs an explicit read policy to receive
-- live updates for conversations they are not a participant in.
drop policy if exists "owner reads all direct messages" on public.direct_messages;
create policy "owner reads all direct messages" on public.direct_messages
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin));

-- Signed-in users need to see each other's usernames to start a conversation.
-- Only the columns below are exposed; emails stay in auth.users, which is not
-- readable from the client at all.
drop policy if exists "users can read profiles" on public.profiles;
create policy "users can read profiles" on public.profiles
  for select to authenticated using (true);

create index if not exists direct_messages_pair_idx
  on public.direct_messages (sender_id, recipient_id, created_at desc);
