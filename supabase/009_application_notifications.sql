create or replace function public.notify_team_application_review()
returns trigger language plpgsql security definer set search_path = '' as $$
declare team_name text;
begin
  if old.status = 'pending' and new.status in ('approved', 'rejected') then
    select name into team_name from public.teams where id = new.team_id;
    insert into public.notifications (recipient_id, message, notification_type, entity_id)
    values (new.applicant_id, team_name || ' takımına başvurunuz ' || case when new.status = 'approved' then 'onaylandı.' else 'reddedildi.' end, 'team_application_review', new.id);
  end if;
  return new;
end; $$;
drop trigger if exists on_team_application_review_notify on public.team_applications;
create trigger on_team_application_review_notify after update of status on public.team_applications
for each row execute procedure public.notify_team_application_review();

create or replace function public.notify_tournament_application_review()
returns trigger language plpgsql security definer set search_path = '' as $$
declare tournament_name text;
begin
  if old.status = 'pending' and new.status in ('approved', 'rejected') then
    select name into tournament_name from public.tournaments where id = new.tournament_id;
    insert into public.notifications (recipient_id, message, notification_type, entity_id)
    values (new.applicant_id, tournament_name || ' turnuvasına başvurunuz ' || case when new.status = 'approved' then 'onaylandı.' else 'reddedildi.' end, 'tournament_application_review', new.id);
  end if;
  return new;
end; $$;
drop trigger if exists on_tournament_application_review_notify on public.tournament_applications;
create trigger on_tournament_application_review_notify after update of status on public.tournament_applications
for each row execute procedure public.notify_tournament_application_review();
