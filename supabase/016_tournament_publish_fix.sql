-- Fix ambiguous request_id reference in tournament approval.
create or replace function public.review_tournament_request(request_id uuid, decision text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare request_row public.tournament_requests; created_tournament_id uuid;
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  if decision not in ('approved', 'rejected') then raise exception 'Geçersiz karar'; end if;

  select request.* into request_row
  from public.tournament_requests request
  where request.id = review_tournament_request.request_id
  for update;

  if request_row.id is null then raise exception 'Talep bulunamadı'; end if;

  update public.tournament_requests request
  set status = decision, reviewed_at = now()
  where request.id = review_tournament_request.request_id;

  if decision = 'approved' then
    insert into public.tournaments (owner_id, request_id, name, game, prize, tournament_date, participant_limit, status, published_at)
    values (request_row.requester_id, request_row.id, request_row.name, request_row.game, request_row.prize, request_row.tournament_date, request_row.participant_limit, 'published', now())
    on conflict on constraint tournaments_request_id_key do update
      set status = 'published', published_at = now()
    returning public.tournaments.id into created_tournament_id;

    insert into public.notifications (recipient_id, message, notification_type, entity_id)
    values (request_row.requester_id, request_row.name || ' turnuva talebiniz onaylandı ve yayınlandı.', 'tournament_request_review', created_tournament_id);
  else
    insert into public.notifications (recipient_id, message, notification_type, entity_id)
    values (request_row.requester_id, request_row.name || ' turnuva talebiniz reddedildi.', 'tournament_request_review', request_row.id);
  end if;

  return created_tournament_id;
end $$;

grant execute on function public.review_tournament_request(uuid, text) to authenticated;
