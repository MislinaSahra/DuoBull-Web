create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  captain_id uuid not null references public.profiles(id) on delete cascade,
  name text not null unique,
  game text not null,
  wanted_role text not null,
  level text not null,
  region text not null,
  contact text not null default '',
  description text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null,
  rank text not null,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.team_applications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  player_role text not null,
  rank text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  hidden_for_applicant boolean not null default false,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (team_id, applicant_id)
);

create table if not exists public.tournament_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  game text not null,
  prize numeric(12,2) not null check (prize >= 0),
  tournament_date date not null,
  participant_limit integer not null default 64 check (participant_limit > 1),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  request_id uuid unique references public.tournament_requests(id) on delete set null,
  name text not null,
  game text not null,
  prize numeric(12,2) not null check (prize >= 0),
  tournament_date date not null,
  participant_limit integer not null default 64 check (participant_limit > 1),
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'completed', 'cancelled')),
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.tournament_applications (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  player_role text not null,
  rank text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  hidden_for_applicant boolean not null default false,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (tournament_id, applicant_id)
);

create or replace function public.is_team_member(check_team_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where team_id = check_team_id and user_id = (select auth.uid())
  );
$$;

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_applications enable row level security;
alter table public.tournament_requests enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_applications enable row level security;

create policy "authenticated users view approved and own teams" on public.teams
for select to authenticated using (status = 'approved' or captain_id = (select auth.uid()) or public.is_admin());
create policy "users create own team" on public.teams
for insert to authenticated with check (captain_id = (select auth.uid()) and status = 'pending');
create policy "captains update team details" on public.teams
for update to authenticated using (captain_id = (select auth.uid()) or public.is_admin())
with check (captain_id = (select auth.uid()) or public.is_admin());
create policy "captains or admins delete teams" on public.teams
for delete to authenticated using (captain_id = (select auth.uid()) or public.is_admin());

create policy "members view team roster" on public.team_members
for select to authenticated using (
  user_id = (select auth.uid()) or public.is_admin() or
  public.is_team_member(team_id)
);
create policy "users leave teams" on public.team_members
for delete to authenticated using (user_id = (select auth.uid()) or public.is_admin() or exists (select 1 from public.teams t where t.id = team_id and t.captain_id = (select auth.uid())));

create policy "applicants and captains view team applications" on public.team_applications
for select to authenticated using (
  applicant_id = (select auth.uid()) or public.is_admin() or
  exists (select 1 from public.teams t where t.id = team_id and t.captain_id = (select auth.uid()))
);
create policy "users apply to teams" on public.team_applications
for insert to authenticated with check (applicant_id = (select auth.uid()) and status = 'pending');
create policy "applicants update own visibility or withdrawal" on public.team_applications
for update to authenticated using (applicant_id = (select auth.uid()))
with check (applicant_id = (select auth.uid()));

revoke update on public.teams from authenticated;
grant update (wanted_role, level, region, contact, description) on public.teams to authenticated;
revoke update on public.team_applications from authenticated;
grant update (hidden_for_applicant) on public.team_applications to authenticated;

create policy "request owners and admins view requests" on public.tournament_requests
for select to authenticated using (requester_id = (select auth.uid()) or public.is_admin());
create policy "users create tournament requests" on public.tournament_requests
for insert to authenticated with check (requester_id = (select auth.uid()) and status = 'pending');

create policy "authenticated users view published tournaments" on public.tournaments
for select to authenticated using (status = 'published' or owner_id = (select auth.uid()) or public.is_admin());
create policy "admins create tournaments" on public.tournaments
for insert to authenticated with check (public.is_admin());
create policy "admins manage tournaments" on public.tournaments
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete tournaments" on public.tournaments
for delete to authenticated using (public.is_admin());

create policy "participants and owners view tournament applications" on public.tournament_applications
for select to authenticated using (
  applicant_id = (select auth.uid()) or public.is_admin() or
  exists (select 1 from public.tournaments t where t.id = tournament_id and t.owner_id = (select auth.uid()))
);
create policy "users apply to tournaments" on public.tournament_applications
for insert to authenticated with check (applicant_id = (select auth.uid()) and status = 'pending');
create policy "applicants withdraw or hide tournament applications" on public.tournament_applications
for update to authenticated using (applicant_id = (select auth.uid()))
with check (applicant_id = (select auth.uid()));

revoke update on public.tournament_applications from authenticated;
grant update (hidden_for_applicant) on public.tournament_applications to authenticated;

create or replace function public.add_team_captain()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.team_members (team_id, user_id, member_role, rank)
  values (new.id, new.captain_id, 'Kaptan', new.level);
  return new;
end;
$$;
drop trigger if exists on_team_created on public.teams;
create trigger on_team_created after insert on public.teams
for each row execute procedure public.add_team_captain();

create or replace function public.review_team_application(application_id uuid, decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare app public.team_applications; team public.teams;
begin
  if decision not in ('approved', 'rejected') then raise exception 'Geçersiz karar'; end if;
  select * into app from public.team_applications where id = application_id;
  select * into team from public.teams where id = app.team_id;
  if team.captain_id <> (select auth.uid()) and not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  update public.team_applications set status = decision, reviewed_at = now() where id = application_id;
  if decision = 'approved' then
    insert into public.team_members (team_id, user_id, member_role, rank)
    values (app.team_id, app.applicant_id, app.player_role, app.rank)
    on conflict (team_id, user_id) do nothing;
  end if;
end;
$$;

create or replace function public.review_team(team_id uuid, decision text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  if decision not in ('approved', 'rejected') then raise exception 'Geçersiz karar'; end if;
  update public.teams set status = decision, reviewed_at = now() where id = team_id;
end;
$$;

create or replace function public.withdraw_team_application(application_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.team_applications set status = 'withdrawn'
  where id = application_id and applicant_id = (select auth.uid());
end;
$$;

create or replace function public.review_tournament_application(application_id uuid, decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare app public.tournament_applications; tournament public.tournaments;
begin
  if decision not in ('approved', 'rejected') then raise exception 'Geçersiz karar'; end if;
  select * into app from public.tournament_applications where id = application_id;
  select * into tournament from public.tournaments where id = app.tournament_id;
  if tournament.owner_id <> (select auth.uid()) and not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  update public.tournament_applications set status = decision, reviewed_at = now() where id = application_id;
end;
$$;

create or replace function public.withdraw_tournament_application(application_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.tournament_applications set status = 'withdrawn'
  where id = application_id and applicant_id = (select auth.uid());
end;
$$;

grant execute on function public.review_team_application(uuid, text) to authenticated;
grant execute on function public.review_tournament_application(uuid, text) to authenticated;
grant execute on function public.review_team(uuid, text) to authenticated;
grant execute on function public.withdraw_team_application(uuid) to authenticated;
grant execute on function public.withdraw_tournament_application(uuid) to authenticated;

create index if not exists team_members_user_idx on public.team_members(user_id);
create index if not exists team_applications_applicant_idx on public.team_applications(applicant_id);
create index if not exists tournament_applications_applicant_idx on public.tournament_applications(applicant_id);
create index if not exists tournaments_status_idx on public.tournaments(status);
