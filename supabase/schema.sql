create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email text unique,
  role text not null default 'member' check (role in ('member', 'admin', 'volunteer')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.donation_appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  requester_name text not null,
  requester_email text,
  title text not null,
  reason text not null,
  amount_needed numeric(10, 2) not null check (amount_needed > 0),
  status text not null default 'open' check (status in ('open', 'funded', 'closed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  appeal_id uuid not null references public.donation_appeals(id) on delete cascade,
  contributor_name text not null,
  contributor_email text,
  amount numeric(10, 2) not null check (amount > 0),
  status text not null default 'pledged' check (status in ('pledged', 'received', 'cancelled')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  details text,
  area text,
  assignee_name text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  due_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.food_commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  volunteer_name text not null,
  item_name text not null,
  quantity numeric(10, 2) not null check (quantity > 0),
  unit text not null,
  needed_by date,
  status text not null default 'planned' check (status in ('planned', 'procured', 'delivered')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists donation_appeals_set_updated_at on public.donation_appeals;
create trigger donation_appeals_set_updated_at
before update on public.donation_appeals
for each row
execute function public.set_updated_at();

drop trigger if exists contributions_set_updated_at on public.contributions;
create trigger contributions_set_updated_at
before update on public.contributions
for each row
execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

drop trigger if exists food_commitments_set_updated_at on public.food_commitments;
create trigger food_commitments_set_updated_at
before update on public.food_commitments
for each row
execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.donation_appeals enable row level security;
alter table public.contributions enable row level security;
alter table public.tasks enable row level security;
alter table public.food_commitments enable row level security;

drop policy if exists "public read users" on public.users;
create policy "public read users"
on public.users for select
to anon, authenticated
using (true);

drop policy if exists "public write users" on public.users;
create policy "public write users"
on public.users for insert
to anon, authenticated
with check (true);

drop policy if exists "public update users" on public.users;
create policy "public update users"
on public.users for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public read donation appeals" on public.donation_appeals;
create policy "public read donation appeals"
on public.donation_appeals for select
to anon, authenticated
using (true);

drop policy if exists "public write donation appeals" on public.donation_appeals;
create policy "public write donation appeals"
on public.donation_appeals for insert
to anon, authenticated
with check (true);

drop policy if exists "public update donation appeals" on public.donation_appeals;
create policy "public update donation appeals"
on public.donation_appeals for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public read contributions" on public.contributions;
create policy "public read contributions"
on public.contributions for select
to anon, authenticated
using (true);

drop policy if exists "public write contributions" on public.contributions;
create policy "public write contributions"
on public.contributions for insert
to anon, authenticated
with check (true);

drop policy if exists "public update contributions" on public.contributions;
create policy "public update contributions"
on public.contributions for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public read tasks" on public.tasks;
create policy "public read tasks"
on public.tasks for select
to anon, authenticated
using (true);

drop policy if exists "public write tasks" on public.tasks;
create policy "public write tasks"
on public.tasks for insert
to anon, authenticated
with check (true);

drop policy if exists "public update tasks" on public.tasks;
create policy "public update tasks"
on public.tasks for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public read food commitments" on public.food_commitments;
create policy "public read food commitments"
on public.food_commitments for select
to anon, authenticated
using (true);

drop policy if exists "public write food commitments" on public.food_commitments;
create policy "public write food commitments"
on public.food_commitments for insert
to anon, authenticated
with check (true);

drop policy if exists "public update food commitments" on public.food_commitments;
create policy "public update food commitments"
on public.food_commitments for update
to anon, authenticated
using (true)
with check (true);
