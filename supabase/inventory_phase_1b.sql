create or replace function public.viewer_primary_area_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select primary_area_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

drop policy if exists "inventory managers can view requests in their own area" on public.inventory_requests;
create policy "signed in users can view requests in their own area"
on public.inventory_requests
for select
to authenticated
using (
  public.is_superadmin()
  or area_id = public.viewer_primary_area_id()
);

drop policy if exists "inventory managers can view request items in visible requests" on public.inventory_request_items;
create policy "signed in users can view request items in their own area"
on public.inventory_request_items
for select
to authenticated
using (
  exists (
    select 1
    from public.inventory_requests r
    where r.id = inventory_request_id
      and (
        public.is_superadmin()
        or r.area_id = public.viewer_primary_area_id()
      )
  )
);

drop policy if exists "inventory managers can view commitments in visible requests" on public.inventory_commitments;
create policy "signed in users can view commitments in their own area"
on public.inventory_commitments
for select
to authenticated
using (
  exists (
    select 1
    from public.inventory_request_items i
    join public.inventory_requests r on r.id = i.inventory_request_id
    where i.id = inventory_request_item_id
      and (
        public.is_superadmin()
        or r.area_id = public.viewer_primary_area_id()
      )
  )
);

create or replace function public.record_inventory_commitment(
  request_item_row_id uuid,
  commitment_quantity numeric,
  commitment_notes text default null
)
returns public.inventory_request_items
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  viewer_area_id uuid;
  target_item public.inventory_request_items%rowtype;
  target_request public.inventory_requests%rowtype;
  updated_item public.inventory_request_items%rowtype;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'You must be signed in to commit inventory.';
  end if;

  viewer_area_id := public.viewer_primary_area_id();

  select *
  into target_item
  from public.inventory_request_items
  where id = request_item_row_id
  for update;

  if not found then
    raise exception 'Inventory item not found.';
  end if;

  select *
  into target_request
  from public.inventory_requests
  where id = target_item.inventory_request_id;

  if not found then
    raise exception 'Inventory request not found.';
  end if;

  if target_request.area_id is distinct from viewer_area_id then
    raise exception 'You can only commit inventory in your own area.';
  end if;

  if target_request.status <> 'open' then
    raise exception 'This inventory request is not open for commitments.';
  end if;

  if commitment_quantity is null or commitment_quantity <= 0 then
    raise exception 'Commitment quantity must be greater than 0.';
  end if;

  if commitment_quantity > target_item.quantity_remaining then
    raise exception 'Commitment quantity cannot exceed the remaining quantity.';
  end if;

  insert into public.inventory_commitments (
    inventory_request_item_id,
    committed_by_user_id,
    quantity,
    status,
    notes
  )
  values (
    target_item.id,
    current_user_id,
    commitment_quantity,
    'committed',
    nullif(trim(commitment_notes), '')
  );

  update public.inventory_request_items
  set
    quantity_committed = target_item.quantity_committed + commitment_quantity,
    quantity_remaining = target_item.quantity_remaining - commitment_quantity
  where id = target_item.id
  returning *
  into updated_item;

  return updated_item;
end;
$$;

grant execute on function public.record_inventory_commitment(uuid, numeric, text) to authenticated;
