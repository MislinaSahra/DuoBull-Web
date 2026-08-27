create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  notification_type text not null default 'general',
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "users view own notifications" on public.notifications
for select to authenticated using (recipient_id = (select auth.uid()));
create policy "users mark own notifications" on public.notifications
for update to authenticated using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));
create policy "users delete own notifications" on public.notifications
for delete to authenticated using (recipient_id = (select auth.uid()));

create or replace function public.create_system_notification(
  target_user_id uuid,
  notification_message text,
  kind text default 'general',
  related_id uuid default null
)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare created_id uuid;
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  insert into public.notifications (recipient_id, message, notification_type, entity_id)
  values (target_user_id, notification_message, kind, related_id)
  returning id into created_id;
  return created_id;
end;
$$;

revoke all on function public.create_system_notification(uuid, text, text, uuid) from public;
grant execute on function public.create_system_notification(uuid, text, text, uuid) to authenticated;

create or replace function public.notify_team_review()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if old.status = 'pending' and new.status in ('approved', 'rejected') then
    insert into public.notifications (recipient_id, message, notification_type, entity_id)
    values (
      new.captain_id,
      case when new.status = 'approved'
        then new.name || ' takımınız yönetici tarafından onaylandı.'
        else new.name || ' takım başvurunuz yönetici tarafından reddedildi.'
      end,
      'team_review',
      new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_team_reviewed_notify on public.teams;
create trigger on_team_reviewed_notify
after update of status on public.teams
for each row execute procedure public.notify_team_review();

create or replace function public.notify_team_application()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare captain uuid; applicant_name text; team_name text;
begin
  select t.captain_id, t.name into captain, team_name from public.teams t where t.id = new.team_id;
  select p.username into applicant_name from public.profiles p where p.id = new.applicant_id;
  insert into public.notifications (recipient_id, message, notification_type, entity_id)
  values (captain, applicant_name || ' kullanıcısı ' || team_name || ' takımınıza başvurdu.', 'team_application', new.id);
  return new;
end;
$$;

drop trigger if exists on_team_application_notify on public.team_applications;
create trigger on_team_application_notify
after insert on public.team_applications
for each row execute procedure public.notify_team_application();

insert into public.notifications (recipient_id, message, notification_type, entity_id)
select
  team.captain_id,
  case when team.status = 'approved'
    then team.name || ' takımınız yönetici tarafından onaylandı.'
    else team.name || ' takım başvurunuz yönetici tarafından reddedildi.'
  end,
  'team_review',
  team.id
from public.teams team
where team.status in ('approved', 'rejected')
and not exists (
  select 1 from public.notifications notification
  where notification.notification_type = 'team_review' and notification.entity_id = team.id
);

alter publication supabase_realtime add table public.notifications;
