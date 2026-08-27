alter table public.discussion_comments add column if not exists parent_comment_id uuid references public.discussion_comments(id) on delete set null;

create or replace function public.discussion_subscriber_ids()
returns table(user_id uuid) language sql stable security definer set search_path='' as $$
  select distinct subscription.user_id from public.user_subscriptions subscription
  join public.subscription_plans plan on plan.id=subscription.plan_id
  where subscription.status='active' and subscription.starts_at<=now() and subscription.ends_at>now() and plan.is_active
$$;
grant execute on function public.discussion_subscriber_ids() to authenticated;

create or replace function public.admin_moderate_account(target_user_id uuid,suspension_minutes integer default null)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'Bu işlem yalnızca yöneticilere açıktır'; end if;
  if target_user_id=(select auth.uid()) then raise exception 'Kendi hesabınızı kısıtlayamazsınız'; end if;
  if exists(select 1 from public.profiles where id=target_user_id and is_super_admin) then raise exception 'Ana yönetici hesabı kısıtlanamaz'; end if;
  update public.profiles set account_status=case when suspension_minutes is null or suspension_minutes>0 then 'suspended' else 'active' end,
    suspended_until=case when suspension_minutes is null then 'infinity'::timestamptz when suspension_minutes>0 then now()+make_interval(mins=>suspension_minutes) else null end,updated_at=now()
  where id=target_user_id;
  if not found then raise exception 'Kullanıcı bulunamadı'; end if;
end $$;
grant execute on function public.admin_moderate_account(uuid,integer) to authenticated;

do $$ begin alter publication supabase_realtime add table public.discussion_posts; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.discussion_comments; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.discussion_votes; exception when duplicate_object then null; end $$;
