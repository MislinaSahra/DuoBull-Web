-- Tournament participation guards, subscription cancellation and reliable chat realtime.

create or replace function public.guard_tournament_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tournament_owner uuid;
begin
  select owner_id into tournament_owner
  from public.tournaments
  where id = new.tournament_id;

  if tournament_owner is null then
    raise exception 'Turnuva bulunamadı';
  end if;
  if tournament_owner = new.applicant_id then
    raise exception 'Kendi turnuvanıza başvuramazsınız';
  end if;
  if exists (
    select 1 from public.tournament_applications application
    where application.tournament_id = new.tournament_id
      and application.applicant_id = new.applicant_id
      and application.status in ('pending', 'approved')
  ) then
    raise exception 'Bu turnuva için zaten aktif bir başvurunuz veya katılımınız var';
  end if;
  return new;
end;
$$;

drop trigger if exists before_tournament_application_guard on public.tournament_applications;
create trigger before_tournament_application_guard
before insert on public.tournament_applications
for each row execute procedure public.guard_tournament_application();

create or replace function public.delete_tournament_application(target_application_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_row public.tournament_applications;
  tournament_owner uuid;
begin
  select * into application_row
  from public.tournament_applications
  where id = target_application_id;

  if application_row.id is null then
    raise exception 'Başvuru bulunamadı';
  end if;

  select owner_id into tournament_owner
  from public.tournaments
  where id = application_row.tournament_id;

  if tournament_owner <> (select auth.uid()) and not public.is_admin() then
    raise exception 'Bu başvuruyu silme yetkiniz yok';
  end if;
  if application_row.status not in ('rejected', 'withdrawn') then
    raise exception 'Yalnızca reddedilmiş veya geri çekilmiş başvurular silinebilir';
  end if;

  delete from public.tournament_applications where id = target_application_id;
end;
$$;

create or replace function public.cancel_user_subscription(target_subscription_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  subscription_row public.user_subscriptions;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz işlem';
  end if;

  select * into subscription_row
  from public.user_subscriptions
  where id = target_subscription_id
  for update;

  if subscription_row.id is null or subscription_row.status <> 'active' then
    raise exception 'Aktif abonelik bulunamadı';
  end if;

  update public.user_subscriptions
  set status = 'cancelled', ends_at = now(), reviewed_at = now(), reviewed_by = (select auth.uid())
  where id = target_subscription_id;

  insert into public.notifications(recipient_id, message, notification_type, entity_id)
  values (subscription_row.user_id, 'Aboneliğiniz yönetici tarafından iptal edildi.', 'subscription_cancelled', subscription_row.id);
end;
$$;

grant execute on function public.delete_tournament_application(uuid) to authenticated;
grant execute on function public.cancel_user_subscription(uuid) to authenticated;

alter table public.direct_messages replica identity full;
alter table public.team_messages replica identity full;
alter table public.tournament_messages replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages') then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'team_messages') then
    alter publication supabase_realtime add table public.team_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tournament_messages') then
    alter publication supabase_realtime add table public.tournament_messages;
  end if;
end;
$$;
