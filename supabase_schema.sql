-- Career Asset OS v5
-- SQL Editor에서 그대로 실행

create extension if not exists pgcrypto;

create table if not exists public.works (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  work_date date,
  project text not null default '',
  category text not null default '',
  summary text not null default '',
  role text not null default '',
  tools text not null default '',
  link text not null default '',
  problem text not null default '',
  action text not null default '',
  result text not null default '',
  lesson text not null default '',
  skills text[] not null default '{}',
  asset jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists works_user_id_idx on public.works (user_id);
create index if not exists works_work_date_idx on public.works (work_date desc);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_works_updated_at on public.works;
create trigger set_works_updated_at
before update on public.works
for each row
execute procedure public.set_current_timestamp_updated_at();

alter table public.works enable row level security;

drop policy if exists "works_select_own" on public.works;
create policy "works_select_own"
on public.works
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "works_insert_own" on public.works;
create policy "works_insert_own"
on public.works
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "works_update_own" on public.works;
create policy "works_update_own"
on public.works
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "works_delete_own" on public.works;
create policy "works_delete_own"
on public.works
for delete
to authenticated
using (auth.uid() = user_id);
