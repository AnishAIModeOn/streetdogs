alter table public.expenses
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;

alter table public.expenses
  drop constraint if exists expenses_status_check;

alter table public.expenses
  add constraint expenses_status_check
  check (
    status in (
      'pending_approval',
      'approved',
      'rejected',
      'partially_funded',
      'funded',
      'settled',
      'cancelled',
      'closed'
    )
  );

update public.expenses
set
  status = case
    when status = 'open' then 'approved'
    else status
  end,
  approved_at = coalesce(
    approved_at,
    case
      when status in ('open', 'approved', 'partially_funded', 'funded', 'settled', 'cancelled', 'closed')
        then created_at
      else approved_at
    end
  )
where status in ('open', 'approved', 'partially_funded', 'funded', 'settled', 'cancelled', 'closed');

alter table public.expenses enable row level security;

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
      and role in ('admin', 'inventory_admin', 'superadmin')
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
      and role in ('admin', 'inventory_admin', 'superadmin')
  )
)
with check (
  raised_by_user_id = auth.uid()
  or exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'inventory_admin', 'superadmin')
  )
);
