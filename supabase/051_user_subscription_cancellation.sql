alter table public.user_subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;

create or replace function public.cancel_user_subscription(target_subscription_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  subscription_row public.user_subscriptions;
  requester uuid := (select auth.uid());
begin
  select * into subscription_row from public.user_subscriptions where id = target_subscription_id for update;
  if subscription_row.id is null or subscription_row.status <> 'active' then raise exception 'Aktif abonelik bulunamadı'; end if;
  if subscription_row.user_id <> requester and not public.is_admin() then raise exception 'Bu aboneliği yönetme yetkiniz yok'; end if;

  if subscription_row.user_id = requester then
    update public.user_subscriptions set cancel_at_period_end = true, reviewed_at = now() where id = target_subscription_id;
    insert into public.notifications(recipient_id, message, notification_type, entity_id)
    values (subscription_row.user_id, 'Abonelik yenilemeniz durduruldu. Paket ayrıcalıklarınız mevcut dönem sonuna kadar devam edecek.', 'subscription_cancellation_scheduled', subscription_row.id);
  else
    update public.user_subscriptions set status = 'cancelled', ends_at = now(), reviewed_at = now(), reviewed_by = requester where id = target_subscription_id;
    insert into public.notifications(recipient_id, message, notification_type, entity_id)
    values (subscription_row.user_id, 'Aboneliğiniz yönetici tarafından sonlandırıldı.', 'subscription_cancelled', subscription_row.id);
  end if;
end;
$$;

grant execute on function public.cancel_user_subscription(uuid) to authenticated;
