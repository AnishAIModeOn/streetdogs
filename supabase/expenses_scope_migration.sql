alter table public.expenses
  alter column dog_id drop not null;

alter table public.expenses
  add column if not exists target_scope text not null default 'dog'
    check (target_scope in ('dog', 'area', 'society')),
  add column if not exists target_society_id uuid,
  add column if not exists target_society_name text;

update public.expenses
set target_scope = case
  when dog_id is not null then 'dog'
  else 'area'
end
where target_scope is null;
