alter table public.dogs
  add column if not exists tagged_society_id uuid references public.societies (id) on delete set null,
  add column if not exists tagged_society_name text,
  add column if not exists ai_summary text,
  add column if not exists ai_condition text,
  add column if not exists ai_urgency text,
  add column if not exists ai_breed_guess text,
  add column if not exists ai_color text,
  add column if not exists ai_age_band text,
  add column if not exists ai_injuries text,
  add column if not exists ai_raw_json jsonb,
  add column if not exists ai_processed_at timestamptz;

create index if not exists dogs_tagged_society_id_idx on public.dogs (tagged_society_id);
