alter table public.profiles add column if not exists is_super_admin boolean not null default false;

-- Ana yönetici kaynak koda gömülü bir e-posta üzerinden otomatik atanmaz.
-- Doğrulanmış mevcut bir hesabı yükseltmek için reset_and_init_admin.sql içindeki
-- güvenli, parolasız atama akışını ayrıca ve bilinçli olarak çalıştırın.

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin' and is_super_admin=true)
$$;

drop function if exists public.admin_save_member(uuid,text,text,text);
create or replace function public.admin_save_member(p_user_id uuid, p_username text, p_role text, p_status text)
returns table(member_id uuid, member_email text, member_username text, member_role text, member_status text, member_super_admin boolean)
language plpgsql security definer set search_path = '' as $$
declare old_role text; target_is_super boolean;
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  if p_role not in ('user','admin') then raise exception 'Geçersiz kullanıcı rolü'; end if;
  if p_status not in ('active','suspended') then raise exception 'Geçersiz hesap durumu'; end if;
  select role,is_super_admin into old_role,target_is_super from public.profiles where id=p_user_id for update;
  if old_role is null then raise exception 'Kullanıcı bulunamadı'; end if;
  if old_role is distinct from p_role and not public.is_super_admin() then raise exception 'Admin rolünü yalnızca ana yönetici değiştirebilir'; end if;
  if target_is_super and old_role is distinct from p_role then raise exception 'Ana yönetici rolü panelden kaldırılamaz'; end if;
  if p_user_id=(select auth.uid()) and p_status='suspended' then raise exception 'Kendi hesabınızı askıya alamazsınız'; end if;

  update public.profiles set role=p_role,account_status=p_status,
    suspended_until=case when p_status='suspended' then 'infinity'::timestamptz else null end,updated_at=now() where id=p_user_id;
  if exists(select 1 from public.profiles where id=p_user_id and lower(trim(username)) is distinct from lower(trim(p_username))) then
    update public.profiles set username=trim(p_username),updated_at=now() where id=p_user_id;
  end if;
  if old_role is distinct from p_role then
    insert into public.notifications(recipient_id,message,notification_type,entity_id)
    values(p_user_id,case when p_role='admin' then 'Yönetici tarafından admin rolü verildi.' else 'Yönetici tarafından admin rolünüz alındı.' end,'admin_role_changed',p_user_id);
  end if;
  return query select profile.id,profile.email,profile.username,profile.role,profile.account_status,profile.is_super_admin from public.profiles profile where profile.id=p_user_id;
end $$;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.admin_save_member(uuid,text,text,text) to authenticated;
