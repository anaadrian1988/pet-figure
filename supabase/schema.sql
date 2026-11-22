-- Run in the Supabase SQL editor.

create table if not exists public.generations (
  id           uuid primary key,
  created_at   timestamptz not null default now(),
  pet_name     text not null,
  preset       text not null,
  age_label    text not null default '3+',
  preview_url  text not null,
  hd_path      text not null,
  ip_hash      text,
  is_paid      boolean not null default false,
  paid_at      timestamptz,
  order_id     text
);

create index if not exists generations_created_at_idx on public.generations (created_at desc);

-- Only the server (service role) touches this table; no public access.
alter table public.generations enable row level security;

-- Storage buckets: public watermarked previews, private HD files.
insert into storage.buckets (id, name, public)
values ('previews', 'previews', true), ('hd', 'hd', false)
on conflict (id) do nothing;
