create table if not exists public.site_profile (
  id integer primary key,
  name text not null,
  role text not null,
  location text not null,
  email text not null,
  phone text not null,
  github text not null,
  linkedin text not null,
  avatar text not null,
  tagline text not null,
  intro text not null
);

create table if not exists public.site_navigation (
  id bigint generated always as identity primary key,
  href text not null,
  label text not null,
  sort_order integer not null default 0
);

create table if not exists public.home_stats (
  id bigint generated always as identity primary key,
  label text not null,
  value text not null,
  sort_order integer not null default 0
);

create table if not exists public.collaboration_pillars (
  id bigint generated always as identity primary key,
  title text not null,
  description text not null,
  sort_order integer not null default 0
);

create table if not exists public.skill_groups (
  id bigint generated always as identity primary key,
  title text not null,
  sort_order integer not null default 0
);

create table if not exists public.skill_items (
  id bigint generated always as identity primary key,
  group_id bigint not null references public.skill_groups(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0
);

create table if not exists public.featured_skills (
  id bigint generated always as identity primary key,
  label text not null,
  sort_order integer not null default 0
);

create table if not exists public.experiences (
  id bigint generated always as identity primary key,
  company text not null,
  role text not null,
  dates text not null,
  summary text not null,
  sort_order integer not null default 0
);

create table if not exists public.experience_highlights (
  id bigint generated always as identity primary key,
  experience_id bigint not null references public.experiences(id) on delete cascade,
  text text not null,
  sort_order integer not null default 0
);

create table if not exists public.projects (
  id bigint generated always as identity primary key,
  name text not null,
  description text not null,
  impact text not null,
  sort_order integer not null default 0
);

create table if not exists public.project_stacks (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.projects(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0
);

create table if not exists public.blog_posts (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  excerpt text not null,
  read_time text not null,
  category text not null,
  image text not null,
  content text not null,
  sort_order integer not null default 0
);

create table if not exists public.terminal_commands (
  id bigint generated always as identity primary key,
  label text not null,
  sort_order integer not null default 0
);

create table if not exists public.contact_submissions (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  company text,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_submissions enable row level security;

drop policy if exists "deny anon contact reads" on public.contact_submissions;
create policy "deny anon contact reads"
on public.contact_submissions
for select
to anon
using (false);

drop policy if exists "deny anon contact writes" on public.contact_submissions;
create policy "deny anon contact writes"
on public.contact_submissions
for insert
to anon
with check (false);
