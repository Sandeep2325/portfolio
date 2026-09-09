-- Generic direct-message attachments: images, voice notes and documents.

-- 1. A private bucket ------------------------------------------------------
-- Direct messages are private, so their attachments must not be world
-- readable. The app hands out short-lived signed URLs instead.
insert into storage.buckets (id, name, public)
values ('dm-attachments', 'dm-attachments', false)
on conflict (id) do update set public = false;

-- 2. Columns ---------------------------------------------------------------
alter table public.direct_messages add column if not exists attachment_bucket text;
alter table public.direct_messages add column if not exists attachment_path text;
alter table public.direct_messages add column if not exists attachment_name text;
alter table public.direct_messages add column if not exists attachment_mime text;
alter table public.direct_messages add column if not exists attachment_size bigint;
alter table public.direct_messages add column if not exists attachment_duration_ms integer;

alter table public.direct_messages drop constraint if exists direct_messages_attachment_kind;
alter table public.direct_messages add column if not exists attachment_kind text;
alter table public.direct_messages add constraint direct_messages_attachment_kind
  check (attachment_kind is null or attachment_kind in ('image', 'audio', 'file'));

-- 3. Backfill --------------------------------------------------------------
-- Existing image attachments live in the public portfolio bucket; record that
-- so signed URLs are generated against the right bucket.
update public.direct_messages
set attachment_bucket = coalesce(attachment_bucket, 'portfolio-assets'),
    attachment_path   = coalesce(attachment_path, image_path),
    attachment_kind   = coalesce(attachment_kind, 'image')
where image_path is not null
  and attachment_path is null;

create index if not exists direct_messages_attachment_idx
  on public.direct_messages (id)
  where attachment_path is not null;
