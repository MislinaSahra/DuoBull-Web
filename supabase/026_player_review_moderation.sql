create table if not exists public.player_review_reports (
  id uuid primary key default gen_random_uuid(), review_id uuid not null references public.player_reviews(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade, reason text not null default 'Uygunsuz değerlendirme',
  status text not null default 'pending' check(status in ('pending','resolved')), created_at timestamptz not null default now(), unique(review_id,reporter_id)
);
alter table public.player_review_reports enable row level security;
drop policy if exists "users view own reports admins all" on public.player_review_reports;
drop policy if exists "users report reviews on own profile" on public.player_review_reports;
drop policy if exists "admins manage review reports" on public.player_review_reports;
create policy "users view own reports admins all" on public.player_review_reports for select to authenticated using(reporter_id=(select auth.uid()) or public.is_admin());
create policy "users report reviews on own profile" on public.player_review_reports for insert to authenticated with check(reporter_id=(select auth.uid()) and exists(select 1 from public.player_reviews r where r.id=review_id and r.player_id=(select auth.uid())));
create policy "admins manage review reports" on public.player_review_reports for update to authenticated using(public.is_admin()) with check(public.is_admin());
create or replace function public.delete_player_review(target_review_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.player_reviews where id=target_review_id and (reviewer_id=(select auth.uid()) or public.is_admin())) then raise exception 'Bu değerlendirmeyi silme yetkiniz yok'; end if;
  delete from public.player_reviews where id=target_review_id;
end $$;
create or replace function public.report_player_review(target_review_id uuid,report_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare created_id uuid;
begin
  if not exists(select 1 from public.player_reviews where id=target_review_id and player_id=(select auth.uid())) then raise exception 'Yalnızca kendi profilinizdeki değerlendirmeleri şikayet edebilirsiniz'; end if;
  insert into public.player_review_reports(review_id,reporter_id,reason) values(target_review_id,(select auth.uid()),trim(report_reason)) on conflict(review_id,reporter_id) do update set reason=excluded.reason,status='pending' returning id into created_id;
  return created_id;
end $$;
grant execute on function public.delete_player_review(uuid) to authenticated;
grant execute on function public.report_player_review(uuid,text) to authenticated;
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='player_review_reports') then alter publication supabase_realtime add table public.player_review_reports; end if; end $$;
