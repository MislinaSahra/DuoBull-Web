create or replace function public.complete_team_match(target_team_id uuid,result_url text,detected_text_value text default '')
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.teams where id=target_team_id and captain_id=(select auth.uid())) then raise exception 'Maç sonucunu yalnızca takım kaptanı yükleyebilir'; end if;
  if result_url is null or result_url not like '%/match-results/%' then raise exception 'Geçerli maç sonucu görseli zorunlu'; end if;
  update public.team_match_rounds set status='pending_review',result_image_url=result_url,detected_text=null,verification_status='pending' where id=(select id from public.team_match_rounds where team_id=target_team_id and status='playing' order by created_at desc limit 1);
  if not found then raise exception 'Devam eden maç bulunmuyor'; end if;
  insert into public.notifications(recipient_id,message,notification_type,entity_id) select id,'Yeni bir Takım Bul maç sonucu doğrulama bekliyor.','team_match_evidence',target_team_id from public.profiles where role='admin';
end $$;
grant execute on function public.complete_team_match(uuid,text,text) to authenticated;
drop policy if exists "members upload match results" on storage.objects;
drop policy if exists "captains upload match results" on storage.objects;
create policy "captains upload match results" on storage.objects for insert to authenticated with check(bucket_id='match-results' and exists(select 1 from public.teams where id::text=(storage.foldername(name))[1] and captain_id=(select auth.uid())));
