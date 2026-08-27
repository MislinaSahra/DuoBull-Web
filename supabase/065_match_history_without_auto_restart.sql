create or replace function public.get_team_match_state(target_team_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare active_round public.team_match_rounds; room text; player text;
begin
  if not public.is_team_member(target_team_id) then raise exception 'Bu eşleşme odasına erişiminiz yok'; end if;
  insert into public.team_match_rooms(team_id) values(target_team_id) on conflict(team_id) do nothing;
  insert into public.team_member_codes(team_id,user_id) values(target_team_id,(select auth.uid())) on conflict(team_id,user_id) do nothing;
  select * into active_round from public.team_match_rounds where team_id=target_team_id and status<>'completed' order by created_at desc limit 1;
  if active_round.id is null then select * into active_round from public.team_match_rounds where team_id=target_team_id and status='completed' order by completed_at desc limit 1; end if;
  select room_code into room from public.team_match_rooms where team_id=target_team_id;
  select player_code into player from public.team_member_codes where team_id=target_team_id and user_id=(select auth.uid());
  return jsonb_build_object(
    'room_code',room,'player_code',player,'round_id',active_round.id,'status',coalesce(active_round.status,'idle'),
    'confirmed_players',coalesce((select jsonb_agg(distinct jsonb_build_object('id',p.id,'name',p.username)) from public.team_match_round_confirmations c join public.profiles p on p.id=c.submitter_id where c.round_id=active_round.id),'[]'::jsonb),
    'last_matches',coalesce((select jsonb_agg(row_data order by completed_at desc) from (select id,status,verification_status,completed_at from public.team_match_rounds where team_id=target_team_id and status='completed' order by completed_at desc limit 5) row_data),'[]'::jsonb)
  );
end $$;

create or replace function public.begin_team_match(target_team_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.teams where id=target_team_id and captain_id=(select auth.uid())) then raise exception 'Yeni eşleşmeyi yalnızca takım kaptanı başlatabilir'; end if;
  if exists(select 1 from public.team_match_rounds where team_id=target_team_id and status<>'completed') then raise exception 'Takımın devam eden bir eşleşmesi var'; end if;
  update public.team_match_rooms set room_code=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),created_at=now() where team_id=target_team_id;
  update public.team_member_codes set player_code=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),created_at=now() where team_id=target_team_id;
  insert into public.team_match_rounds(team_id,status) values(target_team_id,'matching');
end $$;

create or replace function public.review_team_match_evidence(target_round_id uuid,decision text)
returns void language plpgsql security definer set search_path='' as $$
declare target_team uuid;
begin
  if not public.is_admin() then raise exception 'Bu işlem yalnızca yöneticilere açıktır'; end if;
  if decision not in ('verified','rejected') then raise exception 'Geçersiz karar'; end if;
  update public.team_match_rounds set verification_status=decision,status=case when decision='verified' then 'completed' else 'playing' end,completed_at=case when decision='verified' then now() else null end where id=target_round_id and status='pending_review' returning team_id into target_team;
  if not found then raise exception 'İncelenebilir maç kanıtı bulunamadı'; end if;
end $$;

grant execute on function public.get_team_match_state(uuid) to authenticated;
grant execute on function public.begin_team_match(uuid) to authenticated;
grant execute on function public.review_team_match_evidence(uuid,text) to authenticated;
