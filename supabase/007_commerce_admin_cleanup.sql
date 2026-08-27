create or replace function public.delete_completed_order(target_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  delete from public.orders where id = target_order_id and status = 'completed';
end; $$;

create or replace function public.clear_completed_orders()
returns integer language plpgsql security definer set search_path = '' as $$
declare removed integer;
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  delete from public.orders where status = 'completed';
  get diagnostics removed = row_count;
  return removed;
end; $$;

grant execute on function public.delete_completed_order(uuid) to authenticated;
grant execute on function public.clear_completed_orders() to authenticated;
