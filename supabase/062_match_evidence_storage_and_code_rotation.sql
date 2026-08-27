-- Storage policies cannot reliably inspect the teams table through its normal RLS
-- rules. Use a narrowly scoped security-definer helper so only the captain can
-- upload evidence into their own team's folder.
create or replace function public.is_team_captain(target_team_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.teams
    where id=target_team_id and captain_id=(select auth.uid())
  )
$$;
revoke all on function public.is_team_captain(uuid) from public;
grant execute on function public.is_team_captain(uuid) to authenticated;

drop policy if exists "captains upload match results" on storage.objects;
drop policy if exists "members upload match results" on storage.objects;
create policy "captains upload match results" on storage.objects for insert to authenticated with check(
  bucket_id='match-results'
  and public.is_team_captain(((storage.foldername(name))[1])::uuid)
);

create or replace function public.review_team_match_evidence(target_round_id uuid,decision text)
returns void language plpgsql security definer set search_path='' as $$
declare target_team uuid;
begin
  if not public.is_admin() then raise exception 'Bu işlem yalnızca yöneticilere açıktır'; end if;
  if decision not in ('verified','rejected') then raise exception 'Geçersiz karar'; end if;
  update public.team_match_rounds set verification_status=decision,status=case when decision='verified' then 'completed' else 'playing' end,completed_at=case when decision='verified' then now() else null end where id=target_round_id and status='pending_review' returning team_id into target_team;
  if not found then raise exception 'İncelenebilir maç kanıtı bulunamadı'; end if;
  if decision='verified' then
    update public.team_match_rooms set room_code=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),created_at=now() where team_id=target_team;
    update public.team_member_codes set player_code=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),created_at=now() where team_id=target_team;
    insert into public.team_match_rounds(team_id,status) values(target_team,'matching');
  end if;
end $$;
grant execute on function public.review_team_match_evidence(uuid,text) to authenticated;
