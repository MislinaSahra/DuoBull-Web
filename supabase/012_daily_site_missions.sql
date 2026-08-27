alter table public.user_missions
add column if not exists mission_date date not null default ((now() at time zone 'Europe/Istanbul')::date);

delete from public.missions;
insert into public.missions (id, title, bp_reward, xp_reward, target, is_active) values
('visit-team-finder', 'Takım ilanlarını incele', 75, 80, 1, true),
('visit-tournaments', 'Turnuvaları keşfet', 75, 80, 1, true),
('visit-social', 'Sosyal merkeze uğra', 100, 100, 1, true),
('visit-profile', 'Profilini kontrol et', 50, 60, 1, true);

create or replace function public.prepare_daily_missions()
returns void language plpgsql security definer set search_path = public as $$
declare today_in_turkey date := (now() at time zone 'Europe/Istanbul')::date;
begin
  insert into public.user_missions (user_id, mission_id, progress, is_claimed, mission_date)
  select (select auth.uid()), m.id, 0, false, today_in_turkey from public.missions m where m.is_active
  on conflict (user_id, mission_id) do update
  set progress = case when user_missions.mission_date <> today_in_turkey then 0 else user_missions.progress end,
      is_claimed = case when user_missions.mission_date <> today_in_turkey then false else user_missions.is_claimed end,
      claimed_at = case when user_missions.mission_date <> today_in_turkey then null else user_missions.claimed_at end,
      mission_date = today_in_turkey,
      updated_at = now()
  where user_missions.mission_date <> today_in_turkey;
end; $$;

create or replace function public.record_daily_mission(target_mission_id text)
returns void language plpgsql security definer set search_path = public as $$
declare today_in_turkey date := (now() at time zone 'Europe/Istanbul')::date;
begin
  if not exists (select 1 from public.missions where id = target_mission_id and is_active) then return; end if;
  insert into public.user_missions (user_id, mission_id, progress, is_claimed, mission_date)
  values ((select auth.uid()), target_mission_id, 1, false, today_in_turkey)
  on conflict (user_id, mission_id) do update
  set progress = case when user_missions.mission_date = today_in_turkey then greatest(user_missions.progress, 1) else 1 end,
      is_claimed = case when user_missions.mission_date = today_in_turkey then user_missions.is_claimed else false end,
      claimed_at = case when user_missions.mission_date = today_in_turkey then user_missions.claimed_at else null end,
      mission_date = today_in_turkey,
      updated_at = now();
end; $$;

create or replace function public.claim_mission(target_mission_id text)
returns table(balance integer, loyalty_xp integer)
language plpgsql security definer set search_path = public as $$
declare mission_row public.missions; progress_row public.user_missions; today_in_turkey date := (now() at time zone 'Europe/Istanbul')::date;
begin
  select * into mission_row from public.missions where id = target_mission_id and is_active;
  select * into progress_row from public.user_missions where user_id = (select auth.uid()) and mission_id = target_mission_id for update;
  if mission_row.id is null or progress_row.mission_date <> today_in_turkey or progress_row.progress < mission_row.target or progress_row.is_claimed then
    raise exception 'Görev ödülü alınamaz';
  end if;
  update public.user_missions set is_claimed = true, claimed_at = now(), updated_at = now()
  where user_id = (select auth.uid()) and mission_id = target_mission_id;
  return query update public.profiles
  set balance = profiles.balance + mission_row.bp_reward, loyalty_xp = profiles.loyalty_xp + mission_row.xp_reward
  where id = (select auth.uid()) returning profiles.balance, profiles.loyalty_xp;
end; $$;

grant execute on function public.prepare_daily_missions() to authenticated;
grant execute on function public.record_daily_mission(text) to authenticated;
grant execute on function public.claim_mission(text) to authenticated;
