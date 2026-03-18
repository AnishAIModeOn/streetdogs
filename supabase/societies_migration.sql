-- ============================================================
-- StreetDog App – Societies + Pincode Visibility Migration
-- Run this in your Supabase SQL editor (once, in order)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. SOCIETIES TABLE
-- ────────────────────────────────────────────────────────────
create table if not exists public.societies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  pincode       text not null,
  neighbourhood text,
  coordinates   point,               -- PostGIS-compatible (lng, lat)
  created_at    timestamptz not null default now(),

  -- prevent duplicate name+pincode combos (app normalises casing before insert)
  unique (name, pincode)
);

comment on table public.societies is
  'Residential societies / localities keyed by postal code. Used to group users and dogs by area.';

-- fast lookups when filtering by pincode
create index if not exists societies_pincode_idx on public.societies (pincode);

-- ────────────────────────────────────────────────────────────
-- 2. PROFILES – add society_id
-- ────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists society_id uuid references public.societies (id) on delete set null;

create index if not exists profiles_society_id_idx on public.profiles (society_id);

-- ────────────────────────────────────────────────────────────
-- 3. DOGS – add pincode tagging columns
-- ────────────────────────────────────────────────────────────
alter table public.dogs
  add column if not exists tagged_area_pincode       text,
  add column if not exists tagged_area_neighbourhood text,
  add column if not exists tagged_by_user_id         uuid references public.profiles (id) on delete set null;

create index if not exists dogs_tagged_area_pincode_idx  on public.dogs (tagged_area_pincode);
create index if not exists dogs_tagged_by_user_id_idx    on public.dogs (tagged_by_user_id);

-- ────────────────────────────────────────────────────────────
-- 4. RLS – SOCIETIES
-- ────────────────────────────────────────────────────────────
alter table public.societies enable row level security;

-- Anyone (including unauthenticated users on sign-in/sign-up pages) can read societies
create policy "societies_select_authenticated"
  on public.societies for select
  to authenticated
  using (true);

create policy "societies_select_anon"
  on public.societies for select
  to anon
  using (true);

-- Any authenticated user can insert (app-level dedup prevents noise)
create policy "societies_insert_authenticated"
  on public.societies for insert
  to authenticated
  with check (true);

-- Only the app (service role) or superadmins update/delete societies
create policy "societies_update_superadmin"
  on public.societies for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'superadmin'
    )
  );

-- ────────────────────────────────────────────────────────────
-- 5. RLS – DOGS  (pincode-scoped visibility)
-- ────────────────────────────────────────────────────────────
-- Helper function: returns the society pincode for the signed-in user.
-- Returns NULL if the user has no society set.
create or replace function public.my_society_pincode()
returns text
language sql
stable
security definer
as $$
  select s.pincode
  from   public.profiles p
  join   public.societies s on s.id = p.society_id
  where  p.id = auth.uid()
  limit  1;
$$;

-- Drop old permissive policy if it exists, then add the new one.
-- (Adjust the policy name below if yours is different.)
do $$
begin
  -- Remove any existing catch-all SELECT policy on dogs so the new one takes over
  execute 'drop policy if exists "dogs_select_all" on public.dogs';
  execute 'drop policy if exists "Allow authenticated users to read dogs" on public.dogs';
  execute 'drop policy if exists "Users can view all dogs" on public.dogs';
exception when others then null;
end
$$;

-- New pincode-aware SELECT policy:
-- A dog is visible if EITHER:
--   (a) the dog's tagged_area_pincode matches the user's own society pincode, OR
--   (b) the user is the one who tagged the dog (always sees their own tags), OR
--   (c) the dog has no pincode yet (legacy records – still fully visible), OR
--   (d) the user has no society yet (graceful fallback – sees everything)
create policy "dogs_select_pincode_scoped"
  on public.dogs for select
  to authenticated
  using (
    -- legacy / no pincode set → visible to everyone
    tagged_area_pincode is null
    -- user has no society yet → graceful fallback, see all
    or public.my_society_pincode() is null
    -- user's society pincode matches the dog's tagged pincode
    or tagged_area_pincode = public.my_society_pincode()
    -- user tagged this dog themselves (even in a different pincode)
    or tagged_by_user_id = auth.uid()
  );

-- ────────────────────────────────────────────────────────────
-- 6. HELPER VIEW – out-of-area dogs the current user tagged
-- ────────────────────────────────────────────────────────────
create or replace view public.my_out_of_area_dogs as
  select d.*
  from   public.dogs d
  where  d.tagged_by_user_id = auth.uid()
    and  d.tagged_area_pincode is not null
    and  d.tagged_area_pincode <> coalesce(public.my_society_pincode(), '');

comment on view public.my_out_of_area_dogs is
  'Dogs the current user tagged outside their home society pincode.';

-- ────────────────────────────────────────────────────────────
-- 7. GRANT SELECT on the view to authenticated users
-- ────────────────────────────────────────────────────────────
grant select on public.my_out_of_area_dogs to authenticated;
