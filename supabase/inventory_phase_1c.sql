drop policy if exists "signed in users can view requests in their own area" on public.inventory_requests;
create policy "inventory admins and superadmins can view reporting requests"
on public.inventory_requests
for select
to authenticated
using (
  public.is_superadmin()
  or (
    public.can_manage_inventory()
    and area_id = public.viewer_primary_area_id()
  )
  or area_id = public.viewer_primary_area_id()
);

drop policy if exists "signed in users can view request items in their own area" on public.inventory_request_items;
create policy "inventory request items follow visible requests"
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

drop policy if exists "signed in users can view commitments in their own area" on public.inventory_commitments;
create policy "inventory commitments follow visible requests"
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

drop policy if exists "inventory admins and superadmins can update request status" on public.inventory_requests;
create policy "inventory admins and superadmins can update request status"
on public.inventory_requests
for update
to authenticated
using (
  public.is_superadmin()
  or (
    public.can_manage_inventory()
    and created_by_user_id = auth.uid()
    and area_id = public.viewer_primary_area_id()
  )
)
with check (
  public.is_superadmin()
  or (
    public.can_manage_inventory()
    and created_by_user_id = auth.uid()
    and area_id = public.viewer_primary_area_id()
  )
);
