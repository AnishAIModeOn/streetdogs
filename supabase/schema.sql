create extension if not exists pgcrypto;

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  primary_area_id uuid references public.areas(id) on delete set null,
  upi_id text,
  role text not null default 'end_user' check (role in ('end_user', 'inventory_admin', 'superadmin')),
  created_at timestamptz not null default timezone('utc', now()),
  status text not null default 'active' check (status in ('active', 'inactive'))
);

create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  dog_name text not null,
  area_id uuid not null references public.areas(id) on delete restrict,
  added_by_user_id uuid references public.profiles(id) on delete set null,
  added_by_guest boolean not null default false,
  guest_contact text,
  photo_url text,
  location_description text,
  gender text not null default 'unknown' check (gender in ('male', 'female', 'unknown')),
  approx_age text,
  vaccination_status text not null default 'unknown' check (
    vaccination_status in ('unknown', 'not_vaccinated', 'partially_vaccinated', 'vaccinated')
  ),
  sterilization_status text not null default 'unknown' check (
    sterilization_status in ('unknown', 'not_sterilized', 'scheduled', 'sterilized')
  ),
  health_notes text,
  temperament text,
  visibility_type text not null default 'community' check (
    visibility_type in ('community', 'private', 'reported')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  check (
    (added_by_guest = true and added_by_user_id is null)
    or (added_by_guest = false)
  )
);

create table if not exists public.dog_sightings (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  spotted_by_user_id uuid references public.profiles(id) on delete set null,
  spotted_by_guest boolean not null default false,
  spotted_area_id uuid references public.areas(id) on delete set null,
  photo_url text,
  notes text,
  sighted_at timestamptz not null default timezone('utc', now()),
  check (
    (spotted_by_guest = true and spotted_by_user_id is null)
    or (spotted_by_guest = false)
  )
);

create index if not exists areas_city_idx on public.areas(city);
create index if not exists profiles_primary_area_id_idx on public.profiles(primary_area_id);
create index if not exists dogs_area_id_idx on public.dogs(area_id);
create index if not exists dogs_added_by_user_id_idx on public.dogs(added_by_user_id);
create index if not exists dog_sightings_dog_id_idx on public.dog_sightings(dog_id);
create index if not exists dog_sightings_spotted_area_id_idx on public.dog_sightings(spotted_area_id);
create index if not exists dog_sightings_spotted_by_user_id_idx on public.dog_sightings(spotted_by_user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'superadmin'
  );
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.areas enable row level security;
alter table public.profiles enable row level security;
alter table public.dogs enable row level security;
alter table public.dog_sightings enable row level security;

drop policy if exists "areas are readable by everyone" on public.areas;
create policy "areas are readable by everyone"
on public.areas for select
to anon, authenticated
using (true);

drop policy if exists "superadmins can insert areas" on public.areas;
create policy "superadmins can insert areas"
on public.areas for insert
to authenticated
with check (public.is_superadmin());

drop policy if exists "superadmins can update areas" on public.areas;
create policy "superadmins can update areas"
on public.areas for update
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "superadmins can delete areas" on public.areas;
create policy "superadmins can delete areas"
on public.areas for delete
to authenticated
using (public.is_superadmin());

drop policy if exists "users can read their own profile" on public.profiles;
create policy "users can read their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id or public.is_superadmin());

drop policy if exists "users can insert their own profile" on public.profiles;
create policy "users can insert their own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id or public.is_superadmin())
with check (
  (
    auth.uid() = id
    and role = (select profiles.role from public.profiles where profiles.id = auth.uid())
  )
  or public.is_superadmin()
);

drop policy if exists "users can view dogs in their area or added by them" on public.dogs;
create policy "users can view dogs in their area or added by them"
on public.dogs for select
to authenticated
using (
  public.is_superadmin()
  or added_by_user_id = auth.uid()
  or area_id = (
    select profiles.primary_area_id
    from public.profiles
    where profiles.id = auth.uid()
  )
);

drop policy if exists "guests can create dog reports" on public.dogs;
create policy "guests can create dog reports"
on public.dogs for insert
to anon
with check (
  added_by_guest = true
  and added_by_user_id is null
);

drop policy if exists "authenticated users can create dogs for themselves" on public.dogs;
create policy "authenticated users can create dogs for themselves"
on public.dogs for insert
to authenticated
with check (
  public.is_superadmin()
  or (
    added_by_guest = false
    and added_by_user_id = auth.uid()
  )
  or (
    added_by_guest = true
    and added_by_user_id is null
  )
);

drop policy if exists "authenticated users can update dogs they added" on public.dogs;
create policy "authenticated users can update dogs they added"
on public.dogs for update
to authenticated
using (
  public.is_superadmin()
  or added_by_user_id = auth.uid()
)
with check (
  public.is_superadmin()
  or added_by_user_id = auth.uid()
);

drop policy if exists "users can view sightings for visible dogs" on public.dog_sightings;
create policy "users can view sightings for visible dogs"
on public.dog_sightings for select
to authenticated
using (
  public.is_superadmin()
  or spotted_by_user_id = auth.uid()
  or exists (
    select 1
    from public.dogs
    join public.profiles on public.profiles.id = auth.uid()
    where public.dogs.id = dog_sightings.dog_id
      and (
        public.dogs.added_by_user_id = auth.uid()
        or public.dogs.area_id = public.profiles.primary_area_id
      )
  )
);

drop policy if exists "guests can create sightings" on public.dog_sightings;
create policy "guests can create sightings"
on public.dog_sightings for insert
to anon
with check (
  spotted_by_guest = true
  and spotted_by_user_id is null
);

drop policy if exists "authenticated users can create sightings for themselves" on public.dog_sightings;
create policy "authenticated users can create sightings for themselves"
on public.dog_sightings for insert
to authenticated
with check (
  public.is_superadmin()
  or (
    spotted_by_guest = false
    and spotted_by_user_id = auth.uid()
  )
  or (
    spotted_by_guest = true
    and spotted_by_user_id is null
  )
);

drop policy if exists "authenticated users can update sightings they added" on public.dog_sightings;
create policy "authenticated users can update sightings they added"
on public.dog_sightings for update
to authenticated
using (
  public.is_superadmin()
  or spotted_by_user_id = auth.uid()
)
with check (
  public.is_superadmin()
  or spotted_by_user_id = auth.uid()
);
