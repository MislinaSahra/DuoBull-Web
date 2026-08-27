-- Match results are completed only after admin review. Room/player codes are no longer required.
alter table public.team_match_rounds drop constraint if exists team_match_rounds_status_check;
alter table public.team_match_rounds add constraint team_match_rounds_status_check check(status in ('matching','matched','playing','pending_review','completed'));

create or replace function public.begin_team_match(target_team_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_team_member(target_team_id) then raise exception 'Bu takımın üyesi değilsiniz'; end if;
  update public.team_match_rounds set status='playing' where id=(select id from public.team_match_rounds where team_id=target_team_id and status in ('matching','matched') order by created_at desc limit 1);
  if not found then insert into public.team_match_rounds(team_id,status) values(target_team_id,'playing'); end if;
end $$;
grant execute on function public.begin_team_match(uuid) to authenticated;

create or replace function public.complete_team_match(target_team_id uuid,result_url text,detected_text_value text default '')
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_team_member(target_team_id) then raise exception 'Yetkisiz işlem'; end if;
  if result_url is null or result_url not like '%/match-results/%' then raise exception 'Geçerli maç sonucu görseli zorunlu'; end if;
  update public.team_match_rounds set status='pending_review',result_image_url=result_url,detected_text=null,verification_status='pending' where id=(select id from public.team_match_rounds where team_id=target_team_id and status='playing' order by created_at desc limit 1);
  if not found then raise exception 'Devam eden maç bulunmuyor'; end if;
  insert into public.notifications(recipient_id,message,notification_type,entity_id)
  select id,'Yeni bir Takım Bul maç sonucu doğrulama bekliyor.','team_match_evidence',target_team_id from public.profiles where role='admin';
end $$;
grant execute on function public.complete_team_match(uuid,text,text) to authenticated;

create or replace function public.review_team_match_evidence(target_round_id uuid,decision text)
returns void language plpgsql security definer set search_path='' as $$
declare target_team uuid;
begin
  if not public.is_admin() then raise exception 'Bu işlem yalnızca yöneticilere açıktır'; end if;
  if decision not in ('verified','rejected') then raise exception 'Geçersiz karar'; end if;
  update public.team_match_rounds set verification_status=decision,status=case when decision='verified' then 'completed' else 'playing' end,completed_at=case when decision='verified' then now() else null end where id=target_round_id and status='pending_review' returning team_id into target_team;
  if not found then raise exception 'İncelenebilir maç kanıtı bulunamadı'; end if;
  if decision='verified' then insert into public.team_match_rounds(team_id,status) values(target_team,'matching'); end if;
end $$;
grant execute on function public.review_team_match_evidence(uuid,text) to authenticated;

-- Community discussion feed.
create table if not exists public.discussion_posts(
  id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check(char_length(trim(title)) between 3 and 140), body text not null check(char_length(trim(body)) between 1 and 10000),
  media_url text, media_type text check(media_type in ('image','video') or media_type is null), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.discussion_comments(
  id uuid primary key default gen_random_uuid(), post_id uuid not null references public.discussion_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade, body text not null check(char_length(trim(body)) between 1 and 3000), created_at timestamptz not null default now()
);
create table if not exists public.discussion_votes(post_id uuid references public.discussion_posts(id) on delete cascade, user_id uuid references public.profiles(id) on delete cascade, value smallint not null check(value in (-1,1)), primary key(post_id,user_id));
alter table public.discussion_posts enable row level security; alter table public.discussion_comments enable row level security; alter table public.discussion_votes enable row level security;
create policy "discussion posts readable" on public.discussion_posts for select to authenticated using(true);
create policy "users create discussion posts" on public.discussion_posts for insert to authenticated with check(author_id=(select auth.uid()));
create policy "authors or admins delete posts" on public.discussion_posts for delete to authenticated using(author_id=(select auth.uid()) or public.is_admin());
create policy "discussion comments readable" on public.discussion_comments for select to authenticated using(true);
create policy "users create comments" on public.discussion_comments for insert to authenticated with check(author_id=(select auth.uid()));
create policy "authors or admins delete comments" on public.discussion_comments for delete to authenticated using(author_id=(select auth.uid()) or public.is_admin());
create policy "votes readable" on public.discussion_votes for select to authenticated using(true);
create policy "users vote" on public.discussion_votes for insert to authenticated with check(user_id=(select auth.uid()));
create policy "users change own vote" on public.discussion_votes for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "users remove own vote" on public.discussion_votes for delete to authenticated using(user_id=(select auth.uid()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('discussion-media','discussion-media',true,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']) on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "users upload discussion media" on storage.objects for insert to authenticated with check(bucket_id='discussion-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "discussion media public" on storage.objects for select to public using(bucket_id='discussion-media');
