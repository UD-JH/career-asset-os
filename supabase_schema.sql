create extension if not exists pgcrypto;

create table if not exists public.works (
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, work_id)
);

alter table public.works enable row level security;

drop policy if exists "users can read own works" on public.works;
drop policy if exists "users can insert own works" on public.works;
drop policy if exists "users can update own works" on public.works;
drop policy if exists "users can delete own works" on public.works;

create policy "users can read own works"
on public.works
for select
using (auth.uid() = user_id);

create policy "users can insert own works"
on public.works
for insert
with check (auth.uid() = user_id);

create policy "users can update own works"
on public.works
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can delete own works"
on public.works
for delete
using (auth.uid() = user_id);
