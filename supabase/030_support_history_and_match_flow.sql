create or replace function public.delete_closed_support_ticket(target_ticket_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  delete from public.support_tickets where id=target_ticket_id and status='closed';
  if not found then raise exception 'Yalnızca kapalı destek talepleri silinebilir'; end if;
end $$;
grant execute on function public.delete_closed_support_ticket(uuid) to authenticated;

create table if not exists public.team_match_rounds (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  status text not null default 'matching' check(status in ('matching','matched','playing','completed')),
  result_image_url text,
  created_at timestamptz not null default now(),
  matched_at timestamptz,
  playing_at timestamptz,
  completed_at timestamptz
);
create unique index if not exists one_open_team_match_round on public.team_match_rounds(team_id) where status<>'completed';

create table if not exists public.team_match_round_confirmations (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.team_match_rounds(id) on delete cascade,
  submitter_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(round_id,submitter_id,target_user_id), check(submitter_id<>target_user_id)
);
alter table public.team_match_rounds enable row level security;
alter table public.team_match_round_confirmations enable row level security;
drop policy if exists "team members view match rounds" on public.team_match_rounds;
create policy "team members view match rounds" on public.team_match_rounds for select to authenticated using(public.is_team_member(team_id) or public.is_admin());
drop policy if exists "team members view round confirmations" on public.team_match_round_confirmations;
create policy "team members view round confirmations" on public.team_match_round_confirmations for select to authenticated using(
  public.is_admin() or exists(select 1 from public.team_match_rounds r where r.id=round_id and public.is_team_member(r.team_id))
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('match-results','match-results',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "members upload match results" on storage.objects;
create policy "members upload match results" on storage.objects for insert to authenticated
with check(bucket_id='match-results');
drop policy if exists "public reads match results" on storage.objects;
create policy "public reads match results" on storage.objects for select to public using(bucket_id='match-results');

create or replace function public.get_team_match_state(target_team_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare active_round public.team_match_rounds; room text; player text;
begin
  if not public.is_team_member(target_team_id) then raise exception 'Bu eşleşme odasına erişiminiz yok'; end if;
  insert into public.team_match_rooms(team_id) values(target_team_id) on conflict(team_id) do nothing;
  insert into public.team_member_codes(team_id,user_id) values(target_team_id,(select auth.uid())) on conflict(team_id,user_id) do nothing;
  select * into active_round from public.team_match_rounds where team_id=target_team_id and status<>'completed' order by created_at desc limit 1;
  if active_round.id is null then insert into public.team_match_rounds(team_id) values(target_team_id) returning * into active_round; end if;
  select room_code into room from public.team_match_rooms where team_id=target_team_id;
  select player_code into player from public.team_member_codes where team_id=target_team_id and user_id=(select auth.uid());
  return jsonb_build_object(
    'room_code',room,'player_code',player,'round_id',active_round.id,'status',active_round.status,
    'confirmed_players',coalesce((select jsonb_agg(distinct jsonb_build_object('id',p.id,'name',p.username)) from public.team_match_round_confirmations c join public.profiles p on p.id=c.submitter_id where c.round_id=active_round.id),'[]'::jsonb),
    'last_matches',coalesce((select jsonb_agg(row_data order by completed_at desc) from (select id,status,result_image_url,completed_at from public.team_match_rounds where team_id=target_team_id and status='completed' order by completed_at desc limit 5) row_data),'[]'::jsonb)
  );
end $$;

create or replace function public.submit_team_match_round_code(target_team_id uuid,submitted_room_code text,submitted_player_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare active_round public.team_match_rounds; found_user uuid; found_name text; mutual boolean;
begin
  if not public.is_team_member(target_team_id) then raise exception 'Bu eşleşme odasına erişiminiz yok'; end if;
  if not exists(select 1 from public.team_match_rooms where team_id=target_team_id and room_code=upper(trim(submitted_room_code))) then raise exception 'Oda referans kodu geçersiz'; end if;
  select * into active_round from public.team_match_rounds where team_id=target_team_id and status='matching' order by created_at desc limit 1;
  if active_round.id is null then raise exception 'Yeni kod girişine açık eşleşme bulunmuyor'; end if;
  select c.user_id,p.username into found_user,found_name from public.team_member_codes c join public.profiles p on p.id=c.user_id where c.team_id=target_team_id and c.player_code=upper(trim(submitted_player_code));
  if found_user is null or found_user=(select auth.uid()) then raise exception 'Oyuncu referans kodu geçersiz'; end if;
  insert into public.team_match_round_confirmations(round_id,submitter_id,target_user_id) values(active_round.id,(select auth.uid()),found_user) on conflict do nothing;
  select exists(select 1 from public.team_match_round_confirmations where round_id=active_round.id and submitter_id=found_user and target_user_id=(select auth.uid())) into mutual;
  if mutual then update public.team_match_rounds set status='matched',matched_at=now() where id=active_round.id; end if;
  return jsonb_build_object('matched',mutual,'target_user',found_user,'target_name',found_name);
end $$;

create or replace function public.confirm_team_match_ready(target_team_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_team_member(target_team_id) then raise exception 'Yetkisiz işlem'; end if;
  update public.team_match_rounds set status='playing',playing_at=now() where team_id=target_team_id and status='matched';
  if not found then raise exception 'Tamamlanmış bir eşleşme bulunmuyor'; end if;
end $$;

create or replace function public.complete_team_match(target_team_id uuid,result_url text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_team_member(target_team_id) then raise exception 'Yetkisiz işlem'; end if;
  if result_url is null or result_url not like '%/match-results/%' then raise exception 'Geçerli maç sonucu görseli zorunlu'; end if;
  update public.team_match_rounds set status='completed',result_image_url=result_url,completed_at=now() where team_id=target_team_id and status='playing';
  if not found then raise exception 'Devam eden maç bulunmuyor'; end if;
  update public.team_match_rooms set room_code=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),created_at=now() where team_id=target_team_id;
  update public.team_member_codes set player_code=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),created_at=now() where team_id=target_team_id;
  insert into public.team_match_rounds(team_id) values(target_team_id);
end $$;

grant execute on function public.get_team_match_state(uuid) to authenticated;
grant execute on function public.submit_team_match_round_code(uuid,text,text) to authenticated;
grant execute on function public.confirm_team_match_ready(uuid) to authenticated;
grant execute on function public.complete_team_match(uuid,text) to authenticated;
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='team_match_rounds') then alter publication supabase_realtime add table public.team_match_rounds; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='team_match_round_confirmations') then alter publication supabase_realtime add table public.team_match_round_confirmations; end if;
end $$;
