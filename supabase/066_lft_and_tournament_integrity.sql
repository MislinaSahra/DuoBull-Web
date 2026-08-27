-- LFT player market. Public profiles are readable, but only the owner can edit
-- an advert and only an approved team's captain can send an invitation.
create table if not exists public.lft_listings(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  game text not null,
  role text not null,
  rank text not null default '',
  region text not null default '',
  availability text not null default '',
  about text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.lft_invites(
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.lft_listings(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  message text not null default '',
  status text not null default 'pending' check(status in('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  unique(listing_id,team_id,status)
);
alter table public.lft_listings enable row level security;
alter table public.lft_invites enable row level security;
create policy "active lft listings are visible" on public.lft_listings for select using(is_active or user_id=(select auth.uid()) or public.is_admin());
create policy "players manage own lft listing" on public.lft_listings for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "invite participants read lft invites" on public.lft_invites for select to authenticated using(sender_id=(select auth.uid()) or recipient_id=(select auth.uid()) or public.is_admin());

create or replace function public.invite_lft_player(target_listing_id uuid,target_team_id uuid,invite_message text default '')
returns void language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
  select user_id into recipient from public.lft_listings where id=target_listing_id and is_active;
  if recipient is null then raise exception 'Aktif oyuncu ilanı bulunamadı'; end if;
  if not exists(select 1 from public.teams where id=target_team_id and captain_id=(select auth.uid()) and status='approved') then raise exception 'Yalnızca onaylı takım kaptanı davet gönderebilir'; end if;
  if exists(select 1 from public.team_members where team_id=target_team_id and user_id=recipient) then raise exception 'Oyuncu zaten bu takımda'; end if;
  insert into public.lft_invites(listing_id,team_id,sender_id,recipient_id,message) values(target_listing_id,target_team_id,(select auth.uid()),recipient,coalesce(invite_message,''));
  insert into public.notifications(recipient_id,message,notification_type,entity_id) values(recipient,'Bir takım LFT ilanına davet gönderdi.','lft_invite',target_team_id);
end $$;
revoke all on function public.invite_lft_player(uuid,uuid,text) from public;
grant execute on function public.invite_lft_player(uuid,uuid,text) to authenticated;

-- Tournament publishing fields remain UTC timestamptz values.
alter table public.tournaments add column if not exists stream_url text not null default '', add column if not exists map_pool text[] not null default '{}';
grant update(stream_url,map_pool) on public.tournaments to authenticated;

-- Atomic tournament application: row lock prevents 65/64 overbooking.
create or replace function public.apply_to_tournament(target_tournament uuid,target_team uuid,selected_roster uuid[],selected_reserve uuid default null)
returns public.tournament_applications language plpgsql security definer set search_path='' as $$
declare t public.tournaments; saved public.tournament_applications; accepted_count integer;
begin
  select * into t from public.tournaments where id=target_tournament for update;
  if t.id is null or t.status<>'published' then raise exception 'Turnuva başvuruya açık değil'; end if;
  if t.starts_at is not null and now()>=t.starts_at then raise exception 'Turnuva başladı'; end if;
  if not exists(select 1 from public.teams where id=target_team and captain_id=(select auth.uid()) and status='approved' and game=t.game) then raise exception 'Bu oyun için onaylı takım kaptanı olmalısınız'; end if;
  if coalesce(array_length(selected_roster,1),0)=0 then raise exception 'Turnuva kadrosu boş olamaz'; end if;
  if exists(select 1 from unnest(selected_roster) member_id where not exists(select 1 from public.team_members where team_id=target_team and user_id=member_id)) then raise exception 'Kadroda takım dışı oyuncu bulunuyor'; end if;
  select count(*) into accepted_count from public.tournament_applications where tournament_id=target_tournament and status in('pending','approved');
  if exists(select 1 from public.tournament_applications where tournament_id=target_tournament and team_id=target_team and status in('pending','approved')) then raise exception 'Bu takımın zaten aktif bir başvurusu var'; end if;
  if accepted_count>=t.participant_limit then raise exception 'Turnuva kontenjanı doldu'; end if;
  if selected_reserve is not null and not exists(select 1 from public.team_members where team_id=target_team and user_id=selected_reserve) then raise exception 'Yedek oyuncu takım kadrosunda değil'; end if;
  insert into public.tournament_applications(tournament_id,applicant_id,player_role,rank,team_id,roster,reserve_id) values(target_tournament,(select auth.uid()),'Kaptan','',target_team,selected_roster,selected_reserve) returning * into saved;
  return saved;
end $$;
revoke all on function public.apply_to_tournament(uuid,uuid,uuid[],uuid) from public;
grant execute on function public.apply_to_tournament(uuid,uuid,uuid[],uuid) to authenticated;

create or replace function public.check_in_tournament(target_application uuid)
returns public.tournament_applications language plpgsql security definer set search_path='' as $$
declare saved public.tournament_applications; opens timestamptz; closes timestamptz;
begin
  select t.check_in_opens_at,t.check_in_closes_at into opens,closes from public.tournament_applications a join public.tournaments t on t.id=a.tournament_id where a.id=target_application and a.applicant_id=(select auth.uid()) and a.status='approved';
  if opens is null or closes is null or now()<opens or now()>closes then raise exception 'Check-in süresi açık değil'; end if;
  update public.tournament_applications set checked_in_at=now() where id=target_application returning * into saved;
  return saved;
end $$;
revoke all on function public.check_in_tournament(uuid) from public;
grant execute on function public.check_in_tournament(uuid) to authenticated;

-- A non power-of-two participant count produces a real BYE result. The winner
-- is immediately placed into the correct side of round two instead of leaving
-- the bracket in a permanently completed-but-unadvanced state.
create or replace function public.generate_tournament_bracket(target_tournament_id uuid)
returns setof public.tournament_matches language plpgsql security definer set search_path='' as $$
declare owner_uuid uuid; row_item record; pending_team uuid; pending_name text; match_number integer:=1; bye_match public.tournament_matches;
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
    insert into public.tournament_matches(tournament_id,round_no,match_no,team_a_id,team_a_name,status,score_a,score_b,winner_team_id,ruling)
    values(target_tournament_id,1,match_number,pending_team,pending_name,'completed',1,0,pending_team,'BYE') returning * into bye_match;
    insert into public.tournament_matches(tournament_id,round_no,match_no,team_a_id,team_a_name)
    values(target_tournament_id,2,ceil(match_number/2.0),pending_team,pending_name)
    on conflict(tournament_id,round_no,match_no) do update set
      team_a_id=case when mod(match_number,2)=1 then pending_team else public.tournament_matches.team_a_id end,
      team_a_name=case when mod(match_number,2)=1 then pending_name else public.tournament_matches.team_a_name end,
      team_b_id=case when mod(match_number,2)=0 then pending_team else public.tournament_matches.team_b_id end,
      team_b_name=case when mod(match_number,2)=0 then pending_name else public.tournament_matches.team_b_name end;
  end if;
  return query select * from public.tournament_matches where tournament_id=target_tournament_id order by round_no,match_no;
end $$;
revoke all on function public.generate_tournament_bracket(uuid) from public;
grant execute on function public.generate_tournament_bracket(uuid) to authenticated;

create table if not exists public.tournament_map_veto_actions(
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.tournament_matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check(action in('ban','pick')),
  map_name text not null,
  sequence_no integer not null,
  created_at timestamptz not null default now(),
  unique(match_id,map_name), unique(match_id,sequence_no)
);
alter table public.tournament_map_veto_actions enable row level security;
create policy "published veto actions are visible" on public.tournament_map_veto_actions for select using(
  exists(select 1 from public.tournament_matches m join public.tournaments t on t.id=m.tournament_id where m.id=match_id and t.status='published') or public.is_admin()
);

create or replace function public.submit_tournament_map_veto(target_match uuid,target_map text,target_action text)
returns public.tournament_map_veto_actions language plpgsql security definer set search_path='' as $$
declare m public.tournament_matches; acting_team uuid; turn_team uuid; step integer; pool text[]; saved public.tournament_map_veto_actions;
begin
  select * into m from public.tournament_matches where id=target_match for update;
  if m.id is null or m.status not in('scheduled','live') or m.team_a_id is null or m.team_b_id is null then raise exception 'Veto bu maç için açık değil'; end if;
  if exists(select 1 from public.teams where id=m.team_a_id and captain_id=(select auth.uid())) then acting_team:=m.team_a_id;
  elsif exists(select 1 from public.teams where id=m.team_b_id and captain_id=(select auth.uid())) then acting_team:=m.team_b_id;
  else raise exception 'Yalnızca eşleşmedeki takım kaptanları veto yapabilir'; end if;
  select map_pool into pool from public.tournaments where id=m.tournament_id;
  if coalesce(array_length(pool,1),0)=0 or not (trim(target_map)=any(pool)) then raise exception 'Harita turnuva havuzunda değil'; end if;
  if target_action not in('ban','pick') then raise exception 'Geçersiz veto işlemi'; end if;
  select count(*)+1 into step from public.tournament_map_veto_actions where match_id=target_match;
  turn_team:=case when mod(step,2)=1 then m.team_a_id else m.team_b_id end;
  if acting_team<>turn_team then raise exception 'Veto sırası rakip takımda'; end if;
  insert into public.tournament_map_veto_actions(match_id,team_id,actor_id,action,map_name,sequence_no)
  values(target_match,acting_team,(select auth.uid()),target_action,trim(target_map),step) returning * into saved;
  update public.tournament_matches set map_veto=(select string_agg(v.action||': '||v.map_name,' • ' order by v.sequence_no) from public.tournament_map_veto_actions v where v.match_id=target_match) where id=target_match;
  return saved;
end $$;
revoke all on function public.submit_tournament_map_veto(uuid,text,text) from public;
grant execute on function public.submit_tournament_map_veto(uuid,text,text) to authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='lft_listings') then alter publication supabase_realtime add table public.lft_listings; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='tournament_map_veto_actions') then alter publication supabase_realtime add table public.tournament_map_veto_actions; end if;
end $$;
