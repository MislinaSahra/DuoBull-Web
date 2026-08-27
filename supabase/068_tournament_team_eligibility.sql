-- Tournament applications must not disappear because an administrator used
-- different casing or punctuation for the same game name.
create or replace function public.apply_to_tournament(target_tournament uuid,target_team uuid,selected_roster uuid[],selected_reserve uuid default null)
returns public.tournament_applications language plpgsql security definer set search_path='' as $$
declare t public.tournaments; saved public.tournament_applications; accepted_count integer;
begin
  select * into t from public.tournaments where id=target_tournament for update;
  if t.id is null or t.status<>'published' then raise exception 'Turnuva başvuruya açık değil'; end if;
  if t.starts_at is not null and now()>=t.starts_at then raise exception 'Turnuva başladı'; end if;
  if not exists(
    select 1 from public.teams
    where id=target_team
      and captain_id=(select auth.uid())
      and status='approved'
      and regexp_replace(lower(coalesce(game,'')),'[^a-z0-9çğıöşü]+','','g') =
          regexp_replace(lower(coalesce(t.game,'')),'[^a-z0-9çğıöşü]+','','g')
  ) then raise exception 'Bu oyun için onaylı takım kaptanı olmalısınız'; end if;
  if coalesce(array_length(selected_roster,1),0)=0 then raise exception 'Turnuva kadrosu boş olamaz'; end if;
  if exists(select 1 from unnest(selected_roster) member_id where not exists(select 1 from public.team_members where team_id=target_team and user_id=member_id)) then raise exception 'Kadroda takım dışı oyuncu bulunuyor'; end if;
  select count(*) into accepted_count from public.tournament_applications where tournament_id=target_tournament and status in('pending','approved');
  if exists(select 1 from public.tournament_applications where tournament_id=target_tournament and team_id=target_team and status in('pending','approved')) then raise exception 'Bu takımın zaten aktif bir başvurusu var'; end if;
  if accepted_count>=t.participant_limit then raise exception 'Turnuva kontenjanı doldu'; end if;
  if selected_reserve is not null and not exists(select 1 from public.team_members where team_id=target_team and user_id=selected_reserve) then raise exception 'Yedek oyuncu takım kadrosunda değil'; end if;
  insert into public.tournament_applications(tournament_id,applicant_id,player_role,rank,team_id,roster,reserve_id)
  values(target_tournament,(select auth.uid()),'Kaptan','',target_team,selected_roster,selected_reserve)
  returning * into saved;
  return saved;
end $$;
revoke all on function public.apply_to_tournament(uuid,uuid,uuid[],uuid) from public;
grant execute on function public.apply_to_tournament(uuid,uuid,uuid[],uuid) to authenticated;
