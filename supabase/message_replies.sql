-- Replying to a specific message, WhatsApp style.

-- A reply points at the message it quotes. ON DELETE SET NULL so hard-deleting
-- an original never takes its replies with it; the quote simply disappears.
alter table public.direct_messages add column if not exists reply_to_id bigint
  references public.direct_messages(id) on delete set null;

create index if not exists direct_messages_reply_to_idx
  on public.direct_messages (reply_to_id)
  where reply_to_id is not null;
