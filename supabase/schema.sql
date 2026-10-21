-- Show Me Once — run once in the Supabase SQL editor (Dashboard → SQL Editor → New query → Run).
-- Safe to re-run.

create table if not exists public.guides (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  steps             jsonb not null default '[]'::jsonb,
  edit_token_hash   text not null,
  status            text not null default 'draft' check (status in ('draft', 'published')),
  sensitive_warning boolean not null default false,
  frame_count       int not null check (frame_count between 1 and 24),
  created_at        timestamptz not null default now()
);

-- RLS on with NO policies: the publishable/anon key can read and write nothing.
-- All access goes through the app's server routes using the secret key.
alter table public.guides enable row level security;

-- Private bucket for screenshots. No storage policies: uploads use signed upload
-- tokens issued by the server, reads use short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('guides', 'guides', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
