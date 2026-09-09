-- Add image support to community messages
alter table public.community_messages add column if not exists image_path text;
