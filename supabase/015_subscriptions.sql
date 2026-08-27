-- Subscription plans and feature entitlements.
create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  description text not null default '',
  price_try numeric(10,2) not null default 0 check (price_try >= 0),
  duration_days integer not null default 30 check (duration_days > 0),
  bp_enabled boolean not null default true,
  tournament_creation boolean not null default false,
  multiple_teams boolean not null default false,
  loyalty_shop boolean not null default false,
  max_teams integer not null default 1 check (max_teams > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null references public.subscription_plans(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','active','rejected','expired','cancelled')),
  requested_at timestamptz not null default now(),
  starts_at timestamptz,
  ends_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

alter table public.subscription_plans enable row level security;
alter table public.user_subscriptions enable row level security;
create policy "plans are public" on public.subscription_plans for select to anon, authenticated using (is_active or public.is_admin());
create policy "admins insert plans" on public.subscription_plans for insert to authenticated with check (public.is_admin());
create policy "admins update plans" on public.subscription_plans for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete plans" on public.subscription_plans for delete to authenticated using (public.is_admin());
create policy "users view own subscriptions" on public.user_subscriptions for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "users request subscriptions" on public.user_subscriptions for insert to authenticated with check (user_id = (select auth.uid()) and status = 'pending');

insert into public.subscription_plans (id,name,description,price_try,duration_days,bp_enabled,tournament_creation,multiple_teams,loyalty_shop,max_teams,sort_order)
values
('starter','DuoBull Plus','Görevlerden BP kazanma ve sadakat mağazası erişimi.',149.90,30,true,false,false,true,1,10),
('captain','Kaptan Plus','Turnuva oluşturma ve birden fazla takım yönetme hakları.',249.90,30,true,true,true,true,5,20)
on conflict (id) do nothing;

create or replace function public.active_subscription(target_user uuid default null)
returns public.subscription_plans language sql stable security definer set search_path = '' as $$
  select plan.* from public.user_subscriptions subscription
  join public.subscription_plans plan on plan.id = subscription.plan_id
  where subscription.user_id = coalesce(target_user, (select auth.uid())) and subscription.status = 'active'
    and subscription.starts_at <= now() and subscription.ends_at > now() and plan.is_active
  order by subscription.ends_at desc limit 1
$$;

create or replace function public.request_subscription(requested_plan text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare created_id uuid;
begin
  if not exists (select 1 from public.subscription_plans where id=requested_plan and is_active) then raise exception 'Abonelik paketi bulunamadı'; end if;
  if exists (select 1 from public.user_subscriptions where user_id=(select auth.uid()) and status in ('pending','active') and (status='pending' or ends_at > now())) then raise exception 'Zaten bekleyen veya aktif bir aboneliğiniz var'; end if;
  insert into public.user_subscriptions(user_id,plan_id) values ((select auth.uid()),requested_plan) returning id into created_id;
  return created_id;
end $$;

create or replace function public.review_subscription(subscription_id uuid, decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare subscription public.user_subscriptions; duration integer;
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  if decision not in ('active','rejected') then raise exception 'Geçersiz karar'; end if;
  select * into subscription from public.user_subscriptions where id=subscription_id for update;
  if subscription.id is null or subscription.status <> 'pending' then raise exception 'Bekleyen abonelik bulunamadı'; end if;
  select duration_days into duration from public.subscription_plans where id=subscription.plan_id;
  update public.user_subscriptions set status=decision, starts_at=case when decision='active' then now() end,
    ends_at=case when decision='active' then now() + make_interval(days=>duration) end,
    reviewed_at=now(), reviewed_by=(select auth.uid()) where id=subscription_id;
  insert into public.notifications(recipient_id,message,notification_type,entity_id)
  values(subscription.user_id,case when decision='active' then 'Aboneliğiniz aktifleştirildi.' else 'Abonelik talebiniz reddedildi.' end,'subscription_review',subscription.id);
end $$;

create or replace function public.guard_subscription_team_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare plan public.subscription_plans; team_limit integer := 1; current_count integer;
begin
  select * into plan from public.active_subscription(new.captain_id);
  if plan.id is not null and plan.multiple_teams then team_limit := plan.max_teams; end if;
  select count(*) into current_count from public.teams where captain_id=new.captain_id and status in ('pending','approved');
  if current_count >= team_limit then raise exception 'Takım oluşturma limitinize ulaştınız'; end if;
  return new;
end $$;
drop trigger if exists before_team_subscription_limit on public.teams;
create trigger before_team_subscription_limit before insert on public.teams for each row execute procedure public.guard_subscription_team_limit();

create or replace function public.guard_tournament_subscription()
returns trigger language plpgsql security definer set search_path = '' as $$
declare plan public.subscription_plans;
begin
  select * into plan from public.active_subscription(new.requester_id);
  if plan.id is null or not plan.tournament_creation then raise exception 'Turnuva oluşturmak için uygun abonelik gerekir'; end if;
  return new;
end $$;
drop trigger if exists before_tournament_subscription_guard on public.tournament_requests;
create trigger before_tournament_subscription_guard before insert on public.tournament_requests for each row execute procedure public.guard_tournament_subscription();

create or replace function public.guard_loyalty_shop_checkout()
returns trigger language plpgsql security definer set search_path = '' as $$
declare plan public.subscription_plans;
begin
  select * into plan from public.active_subscription(new.user_id);
  if plan.id is null or not plan.loyalty_shop then raise exception 'Sadakat mağazasından alışveriş için uygun abonelik gerekir'; end if;
  return new;
end $$;
drop trigger if exists before_loyalty_shop_checkout on public.orders;
create trigger before_loyalty_shop_checkout before insert on public.orders for each row execute procedure public.guard_loyalty_shop_checkout();

create or replace function public.claim_mission(target_mission_id text)
returns table(balance integer, loyalty_xp integer) language plpgsql security definer set search_path = '' as $$
declare mission_row public.missions; progress_row public.user_missions; bp_amount integer := 0; plan public.subscription_plans;
begin
  select * into mission_row from public.missions where id=target_mission_id and is_active;
  select * into progress_row from public.user_missions where user_id=(select auth.uid()) and mission_id=target_mission_id for update;
  if progress_row.progress < mission_row.target or progress_row.claimed_at is not null then raise exception 'Görev ödülü alınamaz'; end if;
  select * into plan from public.active_subscription((select auth.uid()));
  if plan.id is not null and plan.bp_enabled then bp_amount := mission_row.bp_reward; end if;
  update public.user_missions set claimed_at=now() where user_id=(select auth.uid()) and mission_id=target_mission_id;
  return query update public.profiles set balance=profiles.balance+bp_amount, loyalty_xp=profiles.loyalty_xp+mission_row.xp_reward
  where id=(select auth.uid()) returning profiles.balance,profiles.loyalty_xp;
end $$;

grant execute on function public.active_subscription(uuid) to authenticated;
grant execute on function public.request_subscription(text) to authenticated;
grant execute on function public.review_subscription(uuid,text) to authenticated;
grant execute on function public.claim_mission(text) to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='subscription_plans') then alter publication supabase_realtime add table public.subscription_plans; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='user_subscriptions') then alter publication supabase_realtime add table public.user_subscriptions; end if;
end $$;
