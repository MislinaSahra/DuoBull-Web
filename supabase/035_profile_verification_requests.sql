create table if not exists public.profile_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  note text not null default '',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists one_pending_profile_verification_per_user
on public.profile_verification_requests(user_id) where status = 'pending';

alter table public.profile_verification_requests enable row level security;
drop policy if exists "users view own verification requests" on public.profile_verification_requests;
create policy "users view own verification requests" on public.profile_verification_requests
for select to authenticated using(user_id = (select auth.uid()) or public.is_admin());

create or replace function public.request_profile_verification()
returns uuid language plpgsql security definer set search_path = '' as $$
declare request_id uuid;
begin
  if exists(select 1 from public.profiles where id=(select auth.uid()) and is_verified) then
    raise exception 'Hesabınız zaten onaylı';
  end if;
  if exists(select 1 from public.profile_verification_requests where user_id=(select auth.uid()) and status='pending') then
    raise exception 'Zaten bekleyen bir onay başvurunuz var';
  end if;
  insert into public.profile_verification_requests(user_id) values((select auth.uid())) returning id into request_id;
  insert into public.notifications(recipient_id,message,notification_type,entity_id)
  select id, 'Yeni bir onaylı hesap başvurusu var.', 'profile_verification_request', request_id
  from public.profiles where role='admin';
  return request_id;
end $$;

create or replace function public.review_profile_verification(request_id uuid, decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare target_user uuid;
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  if decision not in ('approved','rejected') then raise exception 'Geçersiz karar'; end if;
  update public.profile_verification_requests
  set status=decision, reviewed_by=(select auth.uid()), reviewed_at=now()
  where id=request_id and status='pending' returning user_id into target_user;
  if target_user is null then raise exception 'Bekleyen başvuru bulunamadı'; end if;
  if decision='approved' then update public.profiles set is_verified=true where id=target_user; end if;
  insert into public.notifications(recipient_id,message,notification_type,entity_id)
  values(target_user,case when decision='approved' then 'Onaylı hesap başvurunuz kabul edildi.' else 'Onaylı hesap başvurunuz reddedildi.' end,'profile_verification_result',request_id);
end $$;

grant execute on function public.request_profile_verification() to authenticated;
grant execute on function public.review_profile_verification(uuid,text) to authenticated;
alter publication supabase_realtime add table public.profile_verification_requests;
