alter table public.tournaments
  add column if not exists starts_at timestamptz,
  add column if not exists rules text not null default '',
  add column if not exists region text not null default '',
  add column if not exists game_mode text not null default '',
  add column if not exists entry_fee numeric(12,2) not null default 0 check (entry_fee >= 0),
  add column if not exists organizer_contact text not null default '',
  add column if not exists check_in_opens_at timestamptz,
  add column if not exists check_in_closes_at timestamptz;

alter table public.tournament_applications
  add column if not exists team_id uuid references public.teams(id) on delete set null,
  add column if not exists roster uuid[] not null default '{}',
  add column if not exists reserve_id uuid references public.profiles(id) on delete set null,
  add column if not exists checked_in_at timestamptz;

drop policy if exists "owners manage own tournaments" on public.tournaments;
create policy "owners manage own tournaments" on public.tournaments for update to authenticated
using(owner_id=(select auth.uid()) or public.is_admin())
with check(owner_id=(select auth.uid()) or public.is_admin());
grant update(starts_at,rules,region,game_mode,entry_fee,organizer_contact,check_in_opens_at,check_in_closes_at) on public.tournaments to authenticated;
grant update(checked_in_at) on public.tournament_applications to authenticated;

create table if not exists public.tournament_matches(
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round_no integer not null,
  match_no integer not null,
  team_a_id uuid references public.teams(id) on delete set null,
  team_b_id uuid references public.teams(id) on delete set null,
  team_a_name text,
  team_b_name text,
  score_a integer,
  score_b integer,
  winner_team_id uuid references public.teams(id) on delete set null,
  scheduled_at timestamptz,
  server_ip text not null default '',
  server_password text not null default '',
  lobby_code text not null default '',
  map_veto text not null default '',
  evidence_url text,
  ruling text not null default '',
  status text not null default 'scheduled' check(status in ('scheduled','live','completed','cancelled')),
  unique(tournament_id,round_no,match_no)
);
alter table public.tournament_matches enable row level security;
drop policy if exists "participants view tournament matches" on public.tournament_matches;
create policy "participants view tournament matches" on public.tournament_matches for select to authenticated using(
  exists(select 1 from public.tournaments t where t.id=tournament_id and (t.status='published' or t.owner_id=(select auth.uid()) or public.is_admin()))
);
drop policy if exists "owners manage tournament matches" on public.tournament_matches;
create policy "owners manage tournament matches" on public.tournament_matches for all to authenticated
using(exists(select 1 from public.tournaments t where t.id=tournament_id and (t.owner_id=(select auth.uid()) or public.is_admin())))
with check(exists(select 1 from public.tournaments t where t.id=tournament_id and (t.owner_id=(select auth.uid()) or public.is_admin())));

create or replace function public.generate_tournament_bracket(target_tournament_id uuid)
returns setof public.tournament_matches language plpgsql security definer set search_path='' as $$
declare owner_uuid uuid; row_item record; pending_team uuid; pending_name text; match_number integer:=1;
begin
  select owner_id into owner_uuid from public.tournaments where id=target_tournament_id;
  if owner_uuid<>(select auth.uid()) and not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  delete from public.tournament_matches where tournament_id=target_tournament_id;
  for row_item in
    select a.team_id,t.name from public.tournament_applications a join public.teams t on t.id=a.team_id
    where a.tournament_id=target_tournament_id and a.status='approved' order by random()
  loop
    if pending_team is null then pending_team:=row_item.team_id;pending_name:=row_item.name;
    else
      insert into public.tournament_matches(tournament_id,round_no,match_no,team_a_id,team_b_id,team_a_name,team_b_name)
      values(target_tournament_id,1,match_number,pending_team,row_item.team_id,pending_name,row_item.name);
      pending_team:=null;pending_name:=null;match_number:=match_number+1;
    end if;
  end loop;
  if pending_team is not null then
    insert into public.tournament_matches(tournament_id,round_no,match_no,team_a_id,team_a_name,status)
    values(target_tournament_id,1,match_number,pending_team,pending_name,'completed');
  end if;
  return query select * from public.tournament_matches where tournament_id=target_tournament_id order by round_no,match_no;
end; $$;
revoke all on function public.generate_tournament_bracket(uuid) from public;
grant execute on function public.generate_tournament_bracket(uuid) to authenticated;

create or replace function public.record_tournament_match_result(target_match_id uuid,new_score_a integer,new_score_b integer,new_status text,new_ruling text default '')
returns public.tournament_matches language plpgsql security definer set search_path='' as $$
declare current_match public.tournament_matches; owner_uuid uuid; winner_id uuid; winner_name text; next_match_no integer;
begin
  select * into current_match from public.tournament_matches where id=target_match_id;
  select owner_id into owner_uuid from public.tournaments where id=current_match.tournament_id;
  if owner_uuid<>(select auth.uid()) and not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  if new_status not in ('scheduled','live','completed','cancelled') then raise exception 'Geçersiz maç durumu'; end if;
  if new_status='completed' then
    if new_score_a=new_score_b then raise exception 'Tamamlanan maçta beraberlik olamaz'; end if;
    if new_score_a>new_score_b then winner_id:=current_match.team_a_id;winner_name:=current_match.team_a_name;
    else winner_id:=current_match.team_b_id;winner_name:=current_match.team_b_name; end if;
  end if;
  update public.tournament_matches set score_a=new_score_a,score_b=new_score_b,status=new_status,ruling=coalesce(new_ruling,''),winner_team_id=winner_id where id=target_match_id returning * into current_match;
  if winner_id is not null then
    next_match_no:=ceil(current_match.match_no/2.0);
    insert into public.tournament_matches(tournament_id,round_no,match_no,team_a_id,team_a_name)
    values(current_match.tournament_id,current_match.round_no+1,next_match_no,winner_id,winner_name)
    on conflict(tournament_id,round_no,match_no) do update set
      team_a_id=case when mod(current_match.match_no,2)=1 then winner_id else public.tournament_matches.team_a_id end,
      team_a_name=case when mod(current_match.match_no,2)=1 then winner_name else public.tournament_matches.team_a_name end,
      team_b_id=case when mod(current_match.match_no,2)=0 then winner_id else public.tournament_matches.team_b_id end,
      team_b_name=case when mod(current_match.match_no,2)=0 then winner_name else public.tournament_matches.team_b_name end;
  end if;
  return current_match;
end; $$;
revoke all on function public.record_tournament_match_result(uuid,integer,integer,text,text) from public;
grant execute on function public.record_tournament_match_result(uuid,integer,integer,text,text) to authenticated;

drop policy if exists "users apply to tournaments" on public.tournament_applications;
create policy "team captains apply to tournaments" on public.tournament_applications for insert to authenticated with check(
  applicant_id=(select auth.uid()) and status='pending' and team_id is not null and
  exists(select 1 from public.teams t where t.id=team_id and t.captain_id=(select auth.uid()) and t.status='approved')
);

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='tournament_matches') then
    alter publication supabase_realtime add table public.tournament_matches;
  end if;
end $$;
