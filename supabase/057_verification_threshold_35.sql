-- Lower the verified-profile quality threshold and count only verified completed DuoBull matches.
create or replace function public.request_profile_verification(application_motivation text, application_profile_link text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare request_id uuid; completed_matches integer; avg_rating numeric; avg_sportsmanship numeric;
begin
  if exists(select 1 from public.profiles where id=(select auth.uid()) and is_verified) then raise exception 'Hesabınız zaten onaylı'; end if;
  if exists(select 1 from public.profile_verification_requests where user_id=(select auth.uid()) and status='pending') then raise exception 'Zaten bekleyen bir onay başvurunuz var'; end if;
  if length(trim(application_motivation))<40 then raise exception 'Başvuru açıklaması en az 40 karakter olmalıdır'; end if;
  select count(distinct rounds.id) into completed_matches from public.team_members members join public.team_match_rounds rounds on rounds.team_id=members.team_id and rounds.status='completed' and coalesce(rounds.verification_status,'verified')='verified' where members.user_id=(select auth.uid());
  select coalesce(avg(rating),0),coalesce(avg(sportsmanship),0) into avg_rating,avg_sportsmanship from public.player_reviews where player_id=(select auth.uid());
  if completed_matches<5 then raise exception 'Onaylı hesap başvurusu için en az 5 doğrulanmış DuoBull maçı gerekir'; end if;
  if avg_rating<3.5 or avg_sportsmanship<3.5 then raise exception 'Oyuncu değerlendirmesi ve takım oyunu/davranış puanı en az 3,5 olmalıdır'; end if;
  insert into public.profile_verification_requests(user_id,motivation,profile_link,match_count,rating_average,sportsmanship_average) values((select auth.uid()),trim(application_motivation),trim(application_profile_link),completed_matches,round(avg_rating,2),round(avg_sportsmanship,2)) returning id into request_id;
  insert into public.notifications(recipient_id,message,notification_type,entity_id) select id,'Yeni bir uygun onaylı hesap başvurusu var.','profile_verification_request',request_id from public.profiles where role='admin';
  return request_id;
end $$;
grant execute on function public.request_profile_verification(text,text) to authenticated;
