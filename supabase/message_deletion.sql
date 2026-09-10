-- Deleting direct messages, in two flavours.

-- "Delete for me" hides a message from one side only. The two columns are
-- relative to each message: the party who sent it, and the party who received
-- it. That mapping works for anonymous threads too, where sender_id is null on
-- whichever side the visitor sent.
alter table public.direct_messages add column if not exists deleted_by_sender_at timestamptz;
alter table public.direct_messages add column if not exists deleted_by_recipient_at timestamptz;

-- "Delete for everyone" tombstones the row for both sides. The body and any
-- attachment are cleared at the same time, so the content is genuinely gone
-- rather than merely hidden by the client.
alter table public.direct_messages add column if not exists deleted_for_everyone_at timestamptz;

create index if not exists direct_messages_deleted_everyone_idx
  on public.direct_messages (deleted_for_everyone_at)
  where deleted_for_everyone_at is not null;

-- Deletions are applied by the server API with the service-role key, and the
-- sender learns about a tombstone through the existing realtime publication.
