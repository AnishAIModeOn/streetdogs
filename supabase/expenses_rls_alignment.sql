-- Align expense RLS with the actual expenses table used by the app.
-- The live app writes ownership through raised_by_user_id, not created_by.

alter table public.expenses enable row level security;

drop policy if exists "expenses read authenticated" on public.expenses;
create policy "expenses read authenticated"
on public.expenses
for select
to authenticated
using (true);

drop policy if exists "expenses insert creator or admin" on public.expenses;
drop policy if exists "expenses insert owner or admin" on public.expenses;
create policy "expenses insert owner or admin"
on public.expenses
for insert
to authenticated
with check (
  raised_by_user_id = auth.uid()
  or exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'superadmin')
  )
);

drop policy if exists "expenses update creator or admin" on public.expenses;
drop policy if exists "expenses update owner or admin" on public.expenses;
create policy "expenses update owner or admin"
on public.expenses
for update
to authenticated
using (
  raised_by_user_id = auth.uid()
  or exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'superadmin')
  )
)
with check (
  raised_by_user_id = auth.uid()
  or exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'superadmin')
  )
);
