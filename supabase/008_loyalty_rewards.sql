create table if not exists public.user_loyalty_rewards (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier_name text not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, tier_name)
);

alter table public.user_loyalty_rewards enable row level security;
create policy "users view own loyalty rewards" on public.user_loyalty_rewards
for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.claim_loyalty_reward(requested_tier text)
returns table(balance integer, loyalty_xp integer, reward integer)
language plpgsql security definer set search_path = public
as $$
declare required_xp integer; reward_bp integer;
begin
  select case requested_tier
    when 'Gümüş' then 1000 when 'Altın' then 2500 when 'Elmas' then 5000 when 'Efsane' then 10000
  end,
  case requested_tier
    when 'Gümüş' then 500 when 'Altın' then 1000 when 'Elmas' then 2000 when 'Efsane' then 4000
  end into required_xp, reward_bp;

  if required_xp is null then raise exception 'Geçersiz sadakat seviyesi'; end if;
  if not exists (select 1 from public.profiles where id = (select auth.uid()) and profiles.loyalty_xp >= required_xp) then
    raise exception 'Bu seviye henüz açılmadı';
  end if;

  insert into public.user_loyalty_rewards (user_id, tier_name) values ((select auth.uid()), requested_tier);
  return query update public.profiles p set balance = p.balance + reward_bp
    where p.id = (select auth.uid()) returning p.balance, p.loyalty_xp, reward_bp;
end;
$$;

grant execute on function public.claim_loyalty_reward(text) to authenticated;
alter publication supabase_realtime add table public.user_loyalty_rewards;
