create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  phone text,
  role text not null default 'volunteer' check (role in ('volunteer', 'admin')),
  city text,
  area_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  dog_name_or_temp_name text,
  slug text unique,
  city text,
  area_name text,
  location_description text not null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  dog_status text not null default 'active' check (dog_status in ('active', 'adopted', 'missing', 'deceased')),
  vaccination_status text not null default 'unknown' check (vaccination_status in ('unknown', 'not_vaccinated', 'partially_vaccinated', 'vaccinated')),
  sterilization_status text not null default 'unknown' check (sterilization_status in ('unknown', 'not_sterilized', 'scheduled', 'sterilized')),
  health_status text not null default 'observation' check (health_status in ('observation', 'needs_food', 'medical_attention', 'stable')),
  notes text,
  photo_path text,
  photo_url text,
  last_seen_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid references public.dogs(id) on delete cascade,
  target_scope text not null default 'dog' check (target_scope in ('dog', 'area', 'society')),
  target_society_id uuid,
  target_society_name text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text,
  amount numeric(12, 2) not null check (amount >= 0),
  expense_status text not null default 'open' check (expense_status in ('open', 'funded', 'settled', 'cancelled')),
  incurred_at timestamptz not null default timezone('utc', now()),
  receipt_path text,
  receipt_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  contributor_id uuid references public.profiles(id) on delete set null,
  contributor_name text,
  contributor_email text,
  amount numeric(12, 2) not null check (amount > 0),
  payment_method text not null default 'upi',
  contribution_status text not null default 'pending' check (contribution_status in ('pending', 'confirmed', 'refunded')),
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists dogs_created_at_idx on public.dogs(created_at desc);
create index if not exists dogs_city_area_idx on public.dogs(city, area_name);
create index if not exists expenses_dog_id_idx on public.expenses(dog_id);
create index if not exists contributions_expense_id_idx on public.contributions(expense_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists dogs_set_updated_at on public.dogs;
create trigger dogs_set_updated_at
before update on public.dogs
for each row execute function public.set_updated_at();

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

drop trigger if exists contributions_set_updated_at on public.contributions;
create trigger contributions_set_updated_at
before update on public.contributions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.dogs enable row level security;
alter table public.expenses enable row level security;
alter table public.contributions enable row level security;

drop policy if exists "profiles select self or admin" on public.profiles;
create policy "profiles select self or admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles update self or admin" on public.profiles;
create policy "profiles update self or admin"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "dogs read authenticated" on public.dogs;
create policy "dogs read authenticated"
on public.dogs
for select
to authenticated
using (true);

drop policy if exists "dogs insert authenticated" on public.dogs;
create policy "dogs insert authenticated"
on public.dogs
for insert
to authenticated
with check (created_by = auth.uid() or public.is_admin());

drop policy if exists "dogs update creator or admin" on public.dogs;
create policy "dogs update creator or admin"
on public.dogs
for update
to authenticated
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());

drop policy if exists "expenses read authenticated" on public.expenses;
create policy "expenses read authenticated"
on public.expenses
for select
to authenticated
using (true);

drop policy if exists "expenses insert creator or admin" on public.expenses;
create policy "expenses insert creator or admin"
on public.expenses
for insert
to authenticated
with check (created_by = auth.uid() or public.is_admin());

drop policy if exists "expenses update creator or admin" on public.expenses;
create policy "expenses update creator or admin"
on public.expenses
for update
to authenticated
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());

drop policy if exists "contributions read authenticated" on public.contributions;
create policy "contributions read authenticated"
on public.contributions
for select
to authenticated
using (true);

drop policy if exists "contributions insert authenticated" on public.contributions;
create policy "contributions insert authenticated"
on public.contributions
for insert
to authenticated
with check (contributor_id = auth.uid() or contributor_id is null or public.is_admin());

drop policy if exists "contributions update contributor or admin" on public.contributions;
create policy "contributions update contributor or admin"
on public.contributions
for update
to authenticated
using (contributor_id = auth.uid() or public.is_admin())
with check (contributor_id = auth.uid() or public.is_admin());

insert into storage.buckets (id, name, public)
values ('dog-photos', 'dog-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('expense-receipts', 'expense-receipts', false)
on conflict (id) do nothing;

drop policy if exists "dog photos read" on storage.objects;
create policy "dog photos read"
on storage.objects
for select
to public
using (bucket_id = 'dog-photos');

drop policy if exists "dog photos upload own folder" on storage.objects;
create policy "dog photos upload own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'dog-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "dog photos update own folder" on storage.objects;
create policy "dog photos update own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'dog-photos'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'dog-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "receipts read owner or admin" on storage.objects;
create policy "receipts read owner or admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'expense-receipts'
  and (split_part(name, '/', 1) = auth.uid()::text or public.is_admin())
);

drop policy if exists "receipts upload own folder" on storage.objects;
create policy "receipts upload own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'expense-receipts'
  and split_part(name, '/', 1) = auth.uid()::text
);
