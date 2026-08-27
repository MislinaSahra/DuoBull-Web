create or replace function public.claim_mission(target_mission_id text)
returns table(balance integer, loyalty_xp integer)
language plpgsql security definer set search_path = '' as $$
declare mission_row public.missions; progress_row public.user_missions; plan public.subscription_plans; bp_amount integer := 0; today_in_turkey date := (now() at time zone 'Europe/Istanbul')::date;
begin
  select * into mission_row from public.missions where id=target_mission_id and is_active;
  select * into progress_row from public.user_missions where user_id=(select auth.uid()) and mission_id=target_mission_id for update;
  if mission_row.id is null or progress_row.mission_date <> today_in_turkey or progress_row.progress < mission_row.target or progress_row.is_claimed then raise exception 'Görev ödülü alınamaz'; end if;
  select * into plan from public.active_subscription((select auth.uid()));
  if plan.id is not null and plan.bp_enabled then bp_amount := mission_row.bp_reward; end if;
  update public.user_missions set is_claimed=true, claimed_at=now(), updated_at=now() where user_id=(select auth.uid()) and mission_id=target_mission_id;
  return query update public.profiles set balance=profiles.balance+bp_amount, loyalty_xp=profiles.loyalty_xp+mission_row.xp_reward where id=(select auth.uid()) returning profiles.balance,profiles.loyalty_xp;
end $$;
grant execute on function public.claim_mission(text) to authenticated;
drop policy if exists "admins update products" on public.products;
create policy "admins update products" on public.products for update to authenticated using(public.is_admin()) with check(public.is_admin());
