alter table public.teams add column if not exists wanted_roles text[] not null default '{}';

create or replace function public.notify_tournament_owner_on_application()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_id uuid; tournament_name text; team_name text;
begin
  select t.owner_id, t.name into owner_id, tournament_name from public.tournaments t where t.id = new.tournament_id;
  select tm.name into team_name from public.teams tm where tm.id = new.team_id;
  if owner_id is not null and owner_id <> new.applicant_id then
    insert into public.notifications(recipient_id, message, notification_type, entity_id)
    values(owner_id, coalesce(team_name, 'Bir takım') || ', ' || coalesce(tournament_name, 'turnuvanız') || ' için başvuru gönderdi.', 'tournament_application', new.tournament_id);
  end if;
  return new;
end; $$;
drop trigger if exists on_tournament_application_notify_owner on public.tournament_applications;
create trigger on_tournament_application_notify_owner after insert on public.tournament_applications for each row execute function public.notify_tournament_owner_on_application();
