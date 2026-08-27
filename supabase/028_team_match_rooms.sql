create table if not exists public.team_match_rooms (
  team_id uuid primary key references public.teams(id) on delete cascade,
  room_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  created_at timestamptz not null default now()
);
create table if not exists public.team_member_codes (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  player_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  created_at timestamptz not null default now(), primary key(team_id,user_id)
);
create table if not exists public.team_match_confirmations (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
  submitter_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), unique(team_id,submitter_id,target_user_id),
  check(submitter_id<>target_user_id)
);
alter table public.team_match_rooms enable row level security;
alter table public.team_member_codes enable row level security;
alter table public.team_match_confirmations enable row level security;
insert into public.team_match_rooms(team_id) select distinct team_id from public.team_members on conflict(team_id) do nothing;
insert into public.team_member_codes(team_id,user_id) select team_id,user_id from public.team_members on conflict(team_id,user_id) do nothing;
create or replace function public.create_team_match_codes() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.team_match_rooms(team_id) values(new.team_id) on conflict(team_id) do nothing;
  insert into public.team_member_codes(team_id,user_id) values(new.team_id,new.user_id) on conflict(team_id,user_id) do nothing;
  return new;
end $$;
drop trigger if exists on_team_member_match_codes on public.team_members;
create trigger on_team_member_match_codes after insert on public.team_members for each row execute procedure public.create_team_match_codes();
drop policy if exists "approved team rosters are visible" on public.team_members;
drop policy if exists "members view team roster" on public.team_members;
create policy "approved team rosters are visible" on public.team_members for select to authenticated using(
  public.is_admin() or public.is_team_member(team_id) or exists(select 1 from public.teams t where t.id=team_id and t.status='approved')
);
drop policy if exists "members view match room" on public.team_match_rooms;
create policy "members view match room" on public.team_match_rooms for select to authenticated using(public.is_team_member(team_id) or public.is_admin());
drop policy if exists "members view own player code" on public.team_member_codes;
create policy "members view own player code" on public.team_member_codes for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
drop policy if exists "members view own confirmations" on public.team_match_confirmations;
create policy "members view own confirmations" on public.team_match_confirmations for select to authenticated using(submitter_id=(select auth.uid()) or target_user_id=(select auth.uid()) or public.is_admin());

create or replace function public.get_team_match_access(target_team_id uuid)
returns table(room_code text,player_code text) language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.team_members where team_id=target_team_id and user_id=(select auth.uid())) then raise exception 'Bu eşleşme odasına erişiminiz yok'; end if;
  insert into public.team_match_rooms(team_id) values(target_team_id) on conflict(team_id) do nothing;
  insert into public.team_member_codes(team_id,user_id) values(target_team_id,(select auth.uid())) on conflict(team_id,user_id) do nothing;
  return query select r.room_code,c.player_code from public.team_match_rooms r join public.team_member_codes c on c.team_id=r.team_id where r.team_id=target_team_id and c.user_id=(select auth.uid());
end $$;

create or replace function public.submit_team_match_code(target_team_id uuid,submitted_room_code text,submitted_player_code text)
returns table(matched boolean,target_user uuid,target_name text) language plpgsql security definer set search_path='' as $$
declare found_user uuid; found_name text;
begin
  if not exists(select 1 from public.team_members where team_id=target_team_id and user_id=(select auth.uid())) then raise exception 'Bu eşleşme odasına erişiminiz yok'; end if;
  if not exists(select 1 from public.team_match_rooms where team_id=target_team_id and room_code=upper(trim(submitted_room_code))) then raise exception 'Oda referans kodu geçersiz'; end if;
  select c.user_id,p.username into found_user,found_name from public.team_member_codes c join public.profiles p on p.id=c.user_id where c.team_id=target_team_id and c.player_code=upper(trim(submitted_player_code));
  if found_user is null or found_user=(select auth.uid()) then raise exception 'Oyuncu referans kodu geçersiz'; end if;
  insert into public.team_match_confirmations(team_id,submitter_id,target_user_id) values(target_team_id,(select auth.uid()),found_user) on conflict do nothing;
  return query select exists(select 1 from public.team_match_confirmations where team_id=target_team_id and submitter_id=found_user and target_user_id=(select auth.uid())),found_user,found_name;
end $$;
grant execute on function public.get_team_match_access(uuid) to authenticated;
grant execute on function public.submit_team_match_code(uuid,text,text) to authenticated;
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='team_match_confirmations') then alter publication supabase_realtime add table public.team_match_confirmations; end if;
end $$;
