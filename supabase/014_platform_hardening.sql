-- DuoBull production hardening: moderation, partner management and message alerts.

alter table public.community_reviews
  add column if not exists status text not null default 'pending'
  check (status in ('pending', 'approved', 'rejected'));

drop policy if exists "reviews are public" on public.community_reviews;
drop policy if exists "admins moderate reviews" on public.community_reviews;
create policy "approved reviews are public" on public.community_reviews
for select to anon, authenticated using (
  status = 'approved' or author_id = (select auth.uid()) or public.is_admin()
);
create policy "admins moderate reviews" on public.community_reviews
for update to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.site_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.site_partners enable row level security;
drop policy if exists "partners are public" on public.site_partners;
drop policy if exists "admins insert partners" on public.site_partners;
drop policy if exists "admins update partners" on public.site_partners;
drop policy if exists "admins delete partners" on public.site_partners;
create policy "partners are public" on public.site_partners for select to anon, authenticated using (is_active or public.is_admin());
create policy "admins insert partners" on public.site_partners for insert to authenticated with check (public.is_admin());
create policy "admins update partners" on public.site_partners for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete partners" on public.site_partners for delete to authenticated using (public.is_admin());
insert into public.site_partners (name, sort_order) values ('PUBG', 10), ('RIOT', 20), ('FREE FIRE', 30), ('RAZER', 40) on conflict (name) do nothing;

create or replace function public.guard_team_application()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_team public.teams;
begin
  select * into target_team from public.teams where id = new.team_id;
  if target_team.id is null or target_team.status <> 'approved' then raise exception 'Bu takım başvuruya açık değil'; end if;
  if target_team.captain_id = new.applicant_id then raise exception 'Kendi takımınıza başvuramazsınız'; end if;
  if exists (select 1 from public.team_members where team_id = new.team_id and user_id = new.applicant_id) then raise exception 'Zaten bu takımın üyesisiniz'; end if;
  if exists (select 1 from public.team_applications where team_id = new.team_id and applicant_id = new.applicant_id and status in ('pending','approved')) then raise exception 'Bu takım için zaten aktif bir başvurunuz var'; end if;
  return new;
end $$;
drop trigger if exists before_team_application_guard on public.team_applications;
create trigger before_team_application_guard before insert on public.team_applications for each row execute procedure public.guard_team_application();

create or replace function public.notify_team_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare sender_name text; team_name text;
begin
  select username into sender_name from public.profiles where id = new.sender_id;
  select name into team_name from public.teams where id = new.team_id;
  insert into public.notifications (recipient_id, message, notification_type, entity_id)
  select member.user_id, sender_name || ' ' || team_name || ' takım sohbetine mesaj gönderdi.', 'team_message', new.team_id
  from public.team_members member where member.team_id = new.team_id and member.user_id <> new.sender_id;
  return new;
end $$;
drop trigger if exists on_team_message_notify on public.team_messages;
create trigger on_team_message_notify after insert on public.team_messages for each row execute procedure public.notify_team_message();

create or replace function public.notify_tournament_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare sender_name text; tournament_name text;
begin
  select username into sender_name from public.profiles where id = new.sender_id;
  select name into tournament_name from public.tournaments where id = new.tournament_id;
  insert into public.notifications (recipient_id, message, notification_type, entity_id)
  select recipient_id, sender_name || ' ' || tournament_name || ' turnuva sohbetine mesaj gönderdi.', 'tournament_message', new.tournament_id
  from (
    select owner_id recipient_id from public.tournaments where id = new.tournament_id
    union
    select applicant_id from public.tournament_applications where tournament_id = new.tournament_id and status = 'approved'
  ) recipients where recipient_id is not null and recipient_id <> new.sender_id;
  return new;
end $$;
drop trigger if exists on_tournament_message_notify on public.tournament_messages;
create trigger on_tournament_message_notify after insert on public.tournament_messages for each row execute procedure public.notify_tournament_message();

create or replace function public.review_tournament_request(request_id uuid, decision text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare request_row public.tournament_requests; created_tournament_id uuid;
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  if decision not in ('approved', 'rejected') then raise exception 'Geçersiz karar'; end if;
  select * into request_row from public.tournament_requests where id = request_id for update;
  if request_row.id is null then raise exception 'Talep bulunamadı'; end if;
  update public.tournament_requests set status = decision, reviewed_at = now() where id = request_id;
  if decision = 'approved' then
    insert into public.tournaments (owner_id, request_id, name, game, prize, tournament_date, participant_limit, status, published_at)
    values (request_row.requester_id, request_row.id, request_row.name, request_row.game, request_row.prize, request_row.tournament_date, request_row.participant_limit, 'published', now())
    on conflict (request_id) do update set status = 'published', published_at = now()
    returning id into created_tournament_id;
    insert into public.notifications (recipient_id, message, notification_type, entity_id)
    values (request_row.requester_id, request_row.name || ' turnuva talebiniz onaylandı ve yayınlandı.', 'tournament_request_review', created_tournament_id);
  else
    insert into public.notifications (recipient_id, message, notification_type, entity_id)
    values (request_row.requester_id, request_row.name || ' turnuva talebiniz reddedildi.', 'tournament_request_review', request_row.id);
  end if;
  return created_tournament_id;
end $$;
grant execute on function public.review_tournament_request(uuid, text) to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='site_partners') then
    alter publication supabase_realtime add table public.site_partners;
  end if;
end $$;
