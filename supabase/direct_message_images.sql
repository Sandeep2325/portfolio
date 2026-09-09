-- Image attachments on direct messages.
-- Files live in the shared public asset bucket under dm/, same as community images.
alter table public.direct_messages add column if not exists image_path text;

-- Image-only messages are stored with a single-space body so the existing
-- char_length(body) between 1 and 2000 check still holds.
