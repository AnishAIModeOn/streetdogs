alter table public.dogs
  add column if not exists society_status text
    check (society_status in ('pending', 'confirmed', 'rejected') or society_status is null);

create index if not exists dogs_area_society_status_idx
  on public.dogs (area_id, society_status);
