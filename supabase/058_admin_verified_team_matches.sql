-- Player-submitted Team Finder results require an admin decision.
alter table public.team_match_rounds drop constraint if exists team_match_rounds_verification_status_check;
alter table public.team_match_rounds add constraint team_match_rounds_verification_status_check check(verification_status in ('pending','verified','rejected'));

create or replace function public.review_team_match_evidence(target_round_id uuid, decision text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  if decision not in ('verified','rejected') then raise exception 'Geçersiz karar'; end if;
  update public.team_match_rounds set verification_status=decision where id=target_round_id and status='completed' and result_image_url is not null;
  if not found then raise exception 'İncelenebilir maç kanıtı bulunamadı'; end if;
end $$;
grant execute on function public.review_team_match_evidence(uuid,text) to authenticated;

create or replace function public.complete_team_match(target_team_id uuid,result_url text,detected_text_value text)
returns void language plpgsql security definer set search_path='' as $$
declare expected_code text; normalized_text text;
begin
  if not public.is_team_member(target_team_id) then raise exception 'Yetkisiz işlem'; end if;
  if result_url is null or result_url not like '%/match-results/%' then raise exception 'Geçerli maç sonucu görseli zorunlu'; end if;
  select room_code into expected_code from public.team_match_rooms where team_id=target_team_id;
  normalized_text:=upper(regexp_replace(coalesce(detected_text_value,''),'[^A-Z0-9]','','g'));
  if expected_code is null or position(expected_code in normalized_text)=0 then raise exception 'Ekran görüntüsünde oda referans kodu doğrulanamadı'; end if;
  update public.team_match_rounds set status='completed',result_image_url=result_url,detected_text=left(detected_text_value,2000),verification_status='pending',completed_at=now() where team_id=target_team_id and status='playing';
  if not found then raise exception 'Devam eden maç bulunmuyor'; end if;
  update public.team_match_rooms set room_code=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),created_at=now() where team_id=target_team_id;
  update public.team_member_codes set player_code=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),created_at=now() where team_id=target_team_id;
  insert into public.team_match_rounds(team_id) values(target_team_id);
  insert into public.notifications(recipient_id,message,notification_type,entity_id)
  select id,'Yeni bir Takım Bul maç sonucu doğrulama bekliyor.','team_match_evidence',target_team_id from public.profiles where role='admin';
end $$;
grant execute on function public.complete_team_match(uuid,text,text) to authenticated;

-- Verified profile: only total player rating and verified DuoBull match count matter.
create or replace function public.request_profile_verification(application_motivation text, application_profile_link text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare request_id uuid; completed_matches integer; avg_rating numeric;
begin
  if exists(select 1 from public.profiles where id=(select auth.uid()) and is_verified) then raise exception 'Hesabınız zaten onaylı'; end if;
  if exists(select 1 from public.profile_verification_requests where user_id=(select auth.uid()) and status='pending') then raise exception 'Zaten bekleyen bir onay başvurunuz var'; end if;
  if length(trim(application_motivation))<40 then raise exception 'Başvuru açıklaması en az 40 karakter olmalıdır'; end if;
  select count(distinct rounds.id) into completed_matches from public.team_members members join public.team_match_rounds rounds on rounds.team_id=members.team_id and rounds.status='completed' and rounds.verification_status='verified' where members.user_id=(select auth.uid());
  select coalesce(avg(rating),0) into avg_rating from public.player_reviews where player_id=(select auth.uid());
  if completed_matches<5 then raise exception 'Onaylı hesap başvurusu için en az 5 DuoBull Eşleşmesi gerekir'; end if;
  if avg_rating<3.5 then raise exception 'Toplam değerlendirme puanı en az 3,5 olmalıdır'; end if;
  insert into public.profile_verification_requests(user_id,motivation,profile_link,match_count,rating_average,sportsmanship_average) values((select auth.uid()),trim(application_motivation),trim(application_profile_link),completed_matches,round(avg_rating,2),0) returning id into request_id;
  insert into public.notifications(recipient_id,message,notification_type,entity_id) select id,'Yeni bir uygun onaylı hesap başvurusu var.','profile_verification_request',request_id from public.profiles where role='admin';
  return request_id;
end $$;
grant execute on function public.request_profile_verification(text,text) to authenticated;

-- Profile counters must use only results accepted by an administrator.
create or replace function public.get_player_profile_stats(target_user uuid)
returns table(match_count bigint,review_count bigint,positive_count bigint,negative_count bigint,average_rating numeric,average_sportsmanship numeric)
language sql stable security definer set search_path='' as $$
  select
    (select count(distinct r.id) from public.team_members tm join public.team_match_rounds r on r.team_id=tm.team_id and r.status='completed' and r.verification_status='verified' where tm.user_id=target_user),
    count(pr.id),
    count(pr.id) filter(where pr.rating>=4),
    count(pr.id) filter(where pr.rating<=2),
    coalesce(round(avg(pr.rating),1),0),
    0::numeric
  from public.player_reviews pr where pr.player_id=target_user
$$;
grant execute on function public.get_player_profile_stats(uuid) to authenticated;

-- Return the evidence review state so players never see a pending result as verified.
create or replace function public.get_team_match_state(target_team_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare active_round public.team_match_rounds; room text; player text;
begin
  if not public.is_team_member(target_team_id) then raise exception 'Bu eşleşme odasına erişiminiz yok'; end if;
  insert into public.team_match_rooms(team_id) values(target_team_id) on conflict(team_id) do nothing;
  insert into public.team_member_codes(team_id,user_id) values(target_team_id,(select auth.uid())) on conflict(team_id,user_id) do nothing;
  select * into active_round from public.team_match_rounds where team_id=target_team_id and status<>'completed' order by created_at desc limit 1;
  if active_round.id is null then insert into public.team_match_rounds(team_id) values(target_team_id) returning * into active_round; end if;
  select room_code into room from public.team_match_rooms where team_id=target_team_id;
  select player_code into player from public.team_member_codes where team_id=target_team_id and user_id=(select auth.uid());
  return jsonb_build_object(
    'room_code',room,'player_code',player,'round_id',active_round.id,'status',active_round.status,
    'confirmed_players',coalesce((select jsonb_agg(distinct jsonb_build_object('id',p.id,'name',p.username)) from public.team_match_round_confirmations c join public.profiles p on p.id=c.submitter_id where c.round_id=active_round.id),'[]'::jsonb),
    'last_matches',coalesce((select jsonb_agg(row_data order by completed_at desc) from (select id,status,result_image_url,verification_status,completed_at from public.team_match_rounds where team_id=target_team_id and status='completed' order by completed_at desc limit 5) row_data),'[]'::jsonb)
  );
end $$;
grant execute on function public.get_team_match_state(uuid) to authenticated;
