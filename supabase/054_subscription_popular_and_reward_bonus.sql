alter table public.subscription_plans
  add column if not exists is_popular boolean not null default false;

create unique index if not exists subscription_plans_one_popular
  on public.subscription_plans (is_popular)
  where is_popular;

comment on column public.subscription_plans.is_popular is
  'Yönetici tarafından abonelik sayfasında En Popüler olarak işaretlenen paket.';

create or replace function public.claim_mission(target_mission_id text)
returns table(balance integer, loyalty_xp integer)
language plpgsql security definer set search_path = '' as $$
declare
  mission_row public.missions%rowtype;
  progress_row public.user_missions%rowtype;
  plan public.subscription_plans%rowtype;
  current_user_id uuid := (select auth.uid());
  current_xp integer := 0;
  bp_amount integer := 0;
  xp_amount integer := 0;
  bp_multiplier numeric := 1;
  xp_multiplier numeric := 1;
  today_in_turkey date := (now() at time zone 'Europe/Istanbul')::date;
begin
  if current_user_id is null then raise exception 'Görev ödülünü almak için giriş yapmalısınız'; end if;
  select m.* into mission_row from public.missions m where m.id = target_mission_id and m.is_active;
  select um.* into progress_row from public.user_missions um where um.user_id = current_user_id and um.mission_id = target_mission_id for update;
  if mission_row.id is null then raise exception 'Görev bulunamadı'; end if;
  if progress_row.mission_id is null or progress_row.mission_date <> today_in_turkey then raise exception 'Bugüne ait görev ilerlemesi bulunamadı'; end if;
  if progress_row.progress < mission_row.target then raise exception 'Görev henüz tamamlanmadı'; end if;
  if progress_row.is_claimed then raise exception 'Bu görev ödülü daha önce alındı'; end if;
  select p.loyalty_xp into current_xp from public.profiles p where p.id = current_user_id;
  select active_plan.* into plan from public.active_subscription(current_user_id) active_plan;
  if plan.id is not null and plan.bp_enabled then bp_amount := mission_row.bp_reward; end if;
  xp_amount := mission_row.xp_reward;
  if current_xp >= 1000 then bp_multiplier := 1.05; xp_multiplier := 1.05; end if;
  if current_xp >= 5000 then bp_multiplier := 1.20; end if;
  bp_amount := ceil(bp_amount * bp_multiplier)::integer;
  xp_amount := ceil(xp_amount * xp_multiplier)::integer;
  update public.user_missions um set is_claimed = true, claimed_at = now(), updated_at = now() where um.user_id = current_user_id and um.mission_id = target_mission_id;
  return query update public.profiles p set balance = p.balance + bp_amount, loyalty_xp = p.loyalty_xp + xp_amount, updated_at = now() where p.id = current_user_id returning p.balance, p.loyalty_xp;
end; $$;

revoke all on function public.claim_mission(text) from public;
grant execute on function public.claim_mission(text) to authenticated;
