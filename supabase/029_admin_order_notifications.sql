create or replace function public.notify_admins_about_new_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  customer_name text;
begin
  select coalesce(nullif(username, ''), email)
    into customer_name
    from public.profiles
   where id = new.user_id;

  insert into public.notifications (recipient_id, message, notification_type, entity_id)
  select admin_profile.id,
         coalesce(customer_name, 'Bir kullanıcı') || ' yeni bir sipariş verdi.',
         'admin_order',
         new.id
    from public.profiles admin_profile
   where admin_profile.role = 'admin'
     and coalesce(admin_profile.account_status, 'active') = 'active';

  return new;
end;
$$;

drop trigger if exists notify_admins_about_new_order on public.orders;
create trigger notify_admins_about_new_order
after insert on public.orders
for each row execute function public.notify_admins_about_new_order();

