-- Call history, stored as rows in the conversation itself.

-- A call event is a direct_messages row with no body: the columns below carry
-- everything the UI renders. Keeping it in the same table means calls sort
-- into the thread by time and inherit read state, deletion and cascades.
alter table public.direct_messages add column if not exists call_kind text;
alter table public.direct_messages add column if not exists call_status text;
alter table public.direct_messages add column if not exists call_duration_seconds integer;

alter table public.direct_messages drop constraint if exists direct_messages_call_kind;
alter table public.direct_messages add constraint direct_messages_call_kind
  check (call_kind is null or call_kind in ('voice', 'video'));

alter table public.direct_messages drop constraint if exists direct_messages_call_status;
alter table public.direct_messages add constraint direct_messages_call_status
  check (call_status is null or call_status in ('completed', 'missed', 'declined'));

create index if not exists direct_messages_call_idx
  on public.direct_messages (call_kind)
  where call_kind is not null;
