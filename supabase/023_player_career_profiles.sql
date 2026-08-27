alter table public.profiles add column if not exists rank text not null default 'Belirtilmedi';
alter table public.profiles add column if not exists main_character text not null default '';
alter table public.profiles add column if not exists uses_microphone boolean not null default false;
alter table public.profiles add column if not exists play_hours text not null default '';
alter table public.profiles add column if not exists play_schedule text not null default '';
grant update (rank,main_character,uses_microphone,play_hours,play_schedule) on public.profiles to authenticated;

create table if not exists public.player_reviews (
  id uuid primary key default gen_random_uuid(), reviewer_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check(rating between 1 and 5), sportsmanship integer not null check(sportsmanship between 1 and 5),
  comment text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(reviewer_id,player_id), check(reviewer_id<>player_id)
);
alter table public.player_reviews enable row level security;
create policy "player reviews public read" on public.player_reviews for select to authenticated using(true);
create policy "users write own player reviews" on public.player_reviews for insert to authenticated with check(reviewer_id=(select auth.uid()));
create policy "users update own player reviews" on public.player_reviews for update to authenticated using(reviewer_id=(select auth.uid())) with check(reviewer_id=(select auth.uid()));
create policy "users delete own reviews or admins" on public.player_reviews for delete to authenticated using(reviewer_id=(select auth.uid()) or public.is_admin());

create or replace function public.save_player_review(target_player uuid, review_rating integer, review_sportsmanship integer, review_comment text)
returns uuid language plpgsql security definer set search_path='' as $$
declare review_id uuid; allowed boolean;
begin
  if target_player=(select auth.uid()) then raise exception 'Kendinizi değerlendiremezsiniz'; end if;
  select exists(select 1 from public.friendships f where (f.user_one=(select auth.uid()) and f.user_two=target_player) or (f.user_two=(select auth.uid()) and f.user_one=target_player))
    or exists(select 1 from public.team_members a join public.team_members b on a.team_id=b.team_id where a.user_id=(select auth.uid()) and b.user_id=target_player)
    or exists(select 1 from public.tournament_applications a join public.tournament_applications b on a.tournament_id=b.tournament_id where a.applicant_id=(select auth.uid()) and b.applicant_id=target_player and a.status='approved' and b.status='approved') into allowed;
  if not allowed then raise exception 'Yalnızca birlikte oynadığınız kullanıcıları değerlendirebilirsiniz'; end if;
  insert into public.player_reviews(reviewer_id,player_id,rating,sportsmanship,comment) values((select auth.uid()),target_player,review_rating,review_sportsmanship,trim(review_comment))
  on conflict(reviewer_id,player_id) do update set rating=excluded.rating,sportsmanship=excluded.sportsmanship,comment=excluded.comment,updated_at=now() returning id into review_id;
  return review_id;
end $$;
grant execute on function public.save_player_review(uuid,integer,integer,text) to authenticated;

-- Ana yöneticilerin hesap durumu normal adminler tarafından değiştirilemez.
create or replace function public.admin_save_member(p_user_id uuid,p_username text,p_role text,p_status text)
returns table(member_id uuid,member_email text,member_username text,member_role text,member_status text,member_super_admin boolean)
language plpgsql security definer set search_path='' as $$
declare old_role text; old_status text; target_is_super boolean;
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  select role,account_status,is_super_admin into old_role,old_status,target_is_super from public.profiles where id=p_user_id for update;
  if old_role is null then raise exception 'Kullanıcı bulunamadı'; end if;
  if target_is_super and not public.is_super_admin() and (old_role is distinct from p_role or old_status is distinct from p_status) then raise exception 'Ana yönetici hesabının rolü veya durumu değiştirilemez'; end if;
  if old_role is distinct from p_role and not public.is_super_admin() then raise exception 'Admin rolünü yalnızca ana yönetici değiştirebilir'; end if;
  if target_is_super and old_role is distinct from p_role then raise exception 'Ana yönetici rolü panelden kaldırılamaz'; end if;
  if p_user_id=(select auth.uid()) and p_status='suspended' then raise exception 'Kendi hesabınızı askıya alamazsınız'; end if;
  update public.profiles set role=p_role,account_status=p_status,suspended_until=case when p_status='suspended' then 'infinity'::timestamptz else null end,updated_at=now() where id=p_user_id;
  if exists(select 1 from public.profiles where id=p_user_id and lower(trim(username)) is distinct from lower(trim(p_username))) then update public.profiles set username=trim(p_username),updated_at=now() where id=p_user_id; end if;
  if old_role is distinct from p_role then insert into public.notifications(recipient_id,message,notification_type,entity_id) values(p_user_id,case when p_role='admin' then 'Yönetici tarafından admin rolü verildi.' else 'Yönetici tarafından admin rolünüz alındı.' end,'admin_role_changed',p_user_id); end if;
  return query select p.id,p.email,p.username,p.role,p.account_status,p.is_super_admin from public.profiles p where p.id=p_user_id;
end $$;
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='player_reviews') then alter publication supabase_realtime add table public.player_reviews; end if; end $$;
