create or replace function public.claim_loyalty_reward(requested_tier text)
returns table(balance integer, loyalty_xp integer, reward integer)
language plpgsql security definer set search_path = '' as $$
declare reward_amount integer; required_xp integer; active_plan public.subscription_plans%rowtype; current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then raise exception 'Ödül almak için giriş yapmalısınız'; end if;
  select * into active_plan from public.active_subscription(current_user_id) limit 1;
  if active_plan.id is null or not active_plan.bp_enabled then raise exception 'BP seviye ödülü için aktif abonelik gereklidir'; end if;
  select case requested_tier when 'Gümüş' then 500 when 'Altın' then 1000 when 'Elmas' then 2000 when 'Efsane' then 4000 else null end,
         case requested_tier when 'Gümüş' then 1000 when 'Altın' then 2500 when 'Elmas' then 5000 when 'Efsane' then 10000 else null end into reward_amount, required_xp;
  if reward_amount is null then raise exception 'Geçersiz sadakat seviyesi'; end if;
  if not exists(select 1 from public.profiles where id=current_user_id and profiles.loyalty_xp >= required_xp) then raise exception 'Bu seviye ödülü henüz açılmadı'; end if;
  if exists(select 1 from public.user_loyalty_rewards where user_id=current_user_id and tier_name=requested_tier) then raise exception 'Bu seviye ödülü daha önce alındı'; end if;
  insert into public.user_loyalty_rewards(user_id,tier_name) values(current_user_id,requested_tier);
  return query update public.profiles p set balance=p.balance+reward_amount,updated_at=now() where p.id=current_user_id returning p.balance,p.loyalty_xp,reward_amount;
end; $$;

create or replace function public.claim_mission(target_mission_id text)
returns table(balance integer, loyalty_xp integer)
language plpgsql security definer set search_path = '' as $$
declare mission_row public.missions; progress_row public.user_missions; plan public.subscription_plans; current_xp integer := 0; bp_amount integer := 0; xp_amount integer := 0; bp_multiplier numeric := 1; xp_multiplier numeric := 1; today_in_turkey date := (now() at time zone 'Europe/Istanbul')::date;
begin
  select * into mission_row from public.missions where id=target_mission_id and is_active;
  select * into progress_row from public.user_missions where user_id=(select auth.uid()) and mission_id=target_mission_id for update;
  if mission_row.id is null or progress_row.mission_date <> today_in_turkey or progress_row.progress < mission_row.target or progress_row.is_claimed then raise exception 'Görev ödülü alınamaz'; end if;
  select loyalty_xp into current_xp from public.profiles where id=(select auth.uid());
  select * into plan from public.active_subscription((select auth.uid()));
  if plan.id is not null and plan.bp_enabled then bp_amount := mission_row.bp_reward; end if;
  xp_amount := mission_row.xp_reward;
  if current_xp >= 1000 then bp_multiplier := 1.05; xp_multiplier := 1.05; end if;
  if current_xp >= 5000 then bp_multiplier := 1.20; end if;
  bp_amount := ceil(bp_amount * bp_multiplier)::integer; xp_amount := ceil(xp_amount * xp_multiplier)::integer;
  update public.user_missions set is_claimed=true,claimed_at=now(),updated_at=now() where user_id=(select auth.uid()) and mission_id=target_mission_id;
  return query update public.profiles set balance=profiles.balance+bp_amount,loyalty_xp=profiles.loyalty_xp+xp_amount where id=(select auth.uid()) returning profiles.balance,profiles.loyalty_xp;
end; $$;

grant execute on function public.claim_loyalty_reward(text) to authenticated;
grant execute on function public.claim_mission(text) to authenticated;
