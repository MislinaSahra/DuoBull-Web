create or replace function public.claim_loyalty_reward(requested_tier text)
returns table(balance integer, loyalty_xp integer, reward integer)
language plpgsql security definer set search_path = '' as $$
declare
  reward_amount integer;
  required_xp integer;
  active_plan public.subscription_plans%rowtype;
begin
  select * into active_plan from public.active_subscription((select auth.uid())) limit 1;
  if active_plan.id is null or not active_plan.bp_enabled then
    raise exception 'BP sadakat ödülleri için aktif abonelik gereklidir';
  end if;
  select case requested_tier when 'Gümüş' then 500 when 'Altın' then 1000 when 'Elmas' then 2000 when 'Efsane' then 4000 else null end,
         case requested_tier when 'Gümüş' then 1000 when 'Altın' then 2500 when 'Elmas' then 5000 when 'Efsane' then 10000 else null end
    into reward_amount, required_xp;
  if reward_amount is null then raise exception 'Geçersiz sadakat seviyesi'; end if;
  if not exists(select 1 from public.profiles where id=(select auth.uid()) and loyalty_xp >= required_xp) then raise exception 'Bu ödül henüz açılmadı'; end if;
  insert into public.user_loyalty_rewards(user_id,tier_name) values((select auth.uid()),requested_tier);
  return query update public.profiles p set balance=p.balance+reward_amount,updated_at=now()
    where p.id=(select auth.uid()) returning p.balance,p.loyalty_xp,reward_amount;
end $$;
grant execute on function public.claim_loyalty_reward(text) to authenticated;
