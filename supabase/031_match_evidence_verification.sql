alter table public.team_match_rounds add column if not exists verification_status text not null default 'verified' check(verification_status in ('verified','rejected'));
alter table public.team_match_rounds add column if not exists detected_text text;

drop function if exists public.complete_team_match(uuid,text);
create or replace function public.complete_team_match(target_team_id uuid,result_url text,detected_text_value text)
returns void language plpgsql security definer set search_path='' as $$
declare expected_code text; normalized_text text;
begin
  if not public.is_team_member(target_team_id) then raise exception 'Yetkisiz işlem'; end if;
  if result_url is null or result_url not like '%/match-results/%' then raise exception 'Geçerli maç sonucu görseli zorunlu'; end if;
  select room_code into expected_code from public.team_match_rooms where team_id=target_team_id;
  normalized_text:=upper(regexp_replace(coalesce(detected_text_value,''),'[^A-Z0-9]','','g'));
  if expected_code is null or position(expected_code in normalized_text)=0 then raise exception 'Ekran görüntüsünde oda referans kodu doğrulanamadı'; end if;
  update public.team_match_rounds set status='completed',result_image_url=result_url,detected_text=left(detected_text_value,2000),verification_status='verified',completed_at=now() where team_id=target_team_id and status='playing';
  if not found then raise exception 'Devam eden maç bulunmuyor'; end if;
  update public.team_match_rooms set room_code=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),created_at=now() where team_id=target_team_id;
  update public.team_member_codes set player_code=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),created_at=now() where team_id=target_team_id;
  insert into public.team_match_rounds(team_id) values(target_team_id);
end $$;
grant execute on function public.complete_team_match(uuid,text,text) to authenticated;

create or replace function public.delete_team_match_evidence(target_round_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare removed_url text;
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  select result_image_url into removed_url from public.team_match_rounds where id=target_round_id and status='completed';
  if removed_url is null then raise exception 'Silinebilir maç kanıtı bulunamadı'; end if;
  update public.team_match_rounds set result_image_url=null,detected_text=null where id=target_round_id;
  return removed_url;
end $$;
grant execute on function public.delete_team_match_evidence(uuid) to authenticated;

drop policy if exists "admins delete match results" on storage.objects;
create policy "admins delete match results" on storage.objects for delete to authenticated using(bucket_id='match-results' and public.is_admin());
