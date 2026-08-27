-- Admin member management no longer changes usernames; p_username remains only for API compatibility.
create or replace function public.admin_save_member(p_user_id uuid,p_username text,p_role text,p_status text)
returns table(member_id uuid,member_email text,member_username text,member_role text,member_status text,member_super_admin boolean)
language plpgsql security definer set search_path='' as $$
declare old_role text; old_status text; target_is_super boolean;
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  select role,account_status,is_super_admin into old_role,old_status,target_is_super from public.profiles where id=p_user_id for update;
  if old_role is null then raise exception 'Kullanıcı bulunamadı'; end if;
  if target_is_super and not public.is_super_admin() and (old_role is distinct from p_role or old_status is distinct from p_status) then raise exception 'Ana yönetici hesabının rolü veya hesap durumu değiştirilemez'; end if;
  if old_role is distinct from p_role and not public.is_super_admin() then raise exception 'Admin rolünü yalnızca ana yönetici değiştirebilir'; end if;
  if target_is_super and old_role is distinct from p_role then raise exception 'Ana yönetici rolü panelden kaldırılamaz'; end if;
  if p_user_id=(select auth.uid()) and p_status='suspended' then raise exception 'Kendi hesabınızı askıya alamazsınız'; end if;
  update public.profiles set role=p_role,account_status=p_status,suspended_until=case when p_status='suspended' then 'infinity'::timestamptz else null end,updated_at=now() where id=p_user_id;
  if old_role is distinct from p_role then insert into public.notifications(recipient_id,message,notification_type,entity_id) values(p_user_id,case when p_role='admin' then 'Yönetici tarafından admin rolü verildi.' else 'Yönetici tarafından admin rolünüz alındı.' end,'admin_role_changed',p_user_id); end if;
  return query select p.id,p.email,p.username,p.role,p.account_status,p.is_super_admin from public.profiles p where p.id=p_user_id;
end $$;
