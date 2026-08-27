-- Game-specific team capacity, optional reserve roster and super-admin cache invalidation.
alter table public.game_catalog add column if not exists team_size integer not null default 5 check (team_size > 0);
alter table public.teams add column if not exists team_size integer not null default 5 check (team_size > 0);
alter table public.teams add column if not exists reserve_enabled boolean not null default false;
alter table public.teams add column if not exists reserve_size integer not null default 0 check (reserve_size >= 0);
alter table public.team_members add column if not exists roster_type text not null default 'main' check (roster_type in ('main','reserve'));
alter table public.team_applications add column if not exists roster_type text not null default 'main' check (roster_type in ('main','reserve'));

update public.game_catalog set team_size=case name
  when 'PUBG Mobile' then 4 when 'Free Fire' then 4 when 'Fortnite' then 4
  when 'Valorant' then 5 when 'League of Legends' then 5 when 'Counter-Strike 2' then 5
  else team_size end;

create or replace function public.set_team_capacity_from_game()
returns trigger language plpgsql security definer set search_path='' as $$
declare configured_size integer;
begin
  select team_size into configured_size from public.game_catalog where name=new.game;
  new.team_size=coalesce(configured_size,5);
  if not new.reserve_enabled then new.reserve_size=0; end if;
  if new.reserve_enabled and new.reserve_size<1 then new.reserve_size=1; end if;
  return new;
end $$;
drop trigger if exists before_team_capacity on public.teams;
create trigger before_team_capacity before insert or update of game,reserve_enabled,reserve_size on public.teams for each row execute procedure public.set_team_capacity_from_game();

update public.teams t set team_size=coalesce((select g.team_size from public.game_catalog g where g.name=t.game),5);
grant update(reserve_enabled,reserve_size) on public.teams to authenticated;

create or replace function public.review_team_application(application_id uuid, decision text)
returns void language plpgsql security definer set search_path='' as $$
declare app public.team_applications; team_record public.teams; destination text; main_count integer; reserve_count integer;
begin
  if decision not in ('approved','rejected') then raise exception 'Geçersiz karar'; end if;
  select * into app from public.team_applications where id=application_id for update;
  if app.id is null then raise exception 'Başvuru bulunamadı'; end if;
  select * into team_record from public.teams where id=app.team_id for update;
  if team_record.captain_id<>(select auth.uid()) and not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  if decision='approved' then
    select count(*) into main_count from public.team_members where team_id=app.team_id and roster_type='main';
    select count(*) into reserve_count from public.team_members where team_id=app.team_id and roster_type='reserve';
    if main_count<team_record.team_size then destination='main';
    elsif team_record.reserve_enabled and reserve_count<team_record.reserve_size then destination='reserve';
    else raise exception 'Takım ve yedek kadro kapasitesi dolu'; end if;
    insert into public.team_members(team_id,user_id,member_role,rank,roster_type) values(app.team_id,app.applicant_id,app.player_role,app.rank,destination) on conflict(team_id,user_id) do nothing;
    update public.team_applications set status=decision,roster_type=destination,reviewed_at=now() where id=application_id;
  else
    update public.team_applications set status=decision,reviewed_at=now() where id=application_id;
  end if;
end $$;
grant execute on function public.review_team_application(uuid,text) to authenticated;

create table if not exists public.app_cache_state(
  id boolean primary key default true check(id),
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
insert into public.app_cache_state(id) values(true) on conflict(id) do nothing;
alter table public.app_cache_state enable row level security;
drop policy if exists "cache state public read" on public.app_cache_state;
create policy "cache state public read" on public.app_cache_state for select to anon,authenticated using(true);

create or replace function public.clear_application_cache()
returns bigint language plpgsql security definer set search_path='' as $$
declare next_version bigint;
begin
  if not exists(select 1 from public.profiles where id=(select auth.uid()) and is_super_admin=true) then raise exception 'Bu işlem yalnızca ana yönetici tarafından kullanılabilir'; end if;
  update public.app_cache_state set version=version+1,updated_at=now(),updated_by=(select auth.uid()) where id=true returning version into next_version;
  return next_version;
end $$;
revoke all on function public.clear_application_cache() from public;
grant execute on function public.clear_application_cache() to authenticated;
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='app_cache_state') then alter publication supabase_realtime add table public.app_cache_state; end if;
end $$;
