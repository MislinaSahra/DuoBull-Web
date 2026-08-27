create or replace function public.review_tournament_request(request_id uuid, decision text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  request_row public.tournament_requests;
  created_tournament_id uuid;
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  if decision not in ('approved', 'rejected') then raise exception 'Geçersiz karar'; end if;

  select * into request_row from public.tournament_requests where id = request_id;
  if request_row.id is null then raise exception 'Talep bulunamadı'; end if;

  update public.tournament_requests
  set status = decision, reviewed_at = now()
  where id = request_id;

  if decision = 'approved' then
    insert into public.tournaments (owner_id, request_id, name, game, prize, tournament_date, participant_limit, status, published_at)
    values (request_row.requester_id, request_row.id, request_row.name, request_row.game, request_row.prize, request_row.tournament_date, request_row.participant_limit, 'published', now())
    on conflict (request_id) do update set
      status = 'published', published_at = coalesce(public.tournaments.published_at, now())
    returning id into created_tournament_id;
  end if;

  return created_tournament_id;
end;
$$;

create or replace function public.remove_team_member(target_team_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare team_captain uuid;
begin
  select captain_id into team_captain from public.teams where id = target_team_id;
  if team_captain <> (select auth.uid()) and not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  if target_user_id = team_captain then raise exception 'Kaptan takımdan çıkarılamaz'; end if;
  delete from public.team_members where team_id = target_team_id and user_id = target_user_id;
  update public.team_applications set status = 'withdrawn'
  where team_id = target_team_id and applicant_id = target_user_id;
end;
$$;

grant execute on function public.review_tournament_request(uuid, text) to authenticated;
grant execute on function public.remove_team_member(uuid, uuid) to authenticated;

alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.team_members;
alter publication supabase_realtime add table public.team_applications;
alter publication supabase_realtime add table public.tournaments;
alter publication supabase_realtime add table public.tournament_requests;
alter publication supabase_realtime add table public.tournament_applications;
