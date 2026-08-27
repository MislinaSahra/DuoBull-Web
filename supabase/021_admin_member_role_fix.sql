-- Reliable admin member editing with an explicit response row.
create or replace function public.admin_save_member(p_user_id uuid, p_username text, p_role text, p_status text)
returns table(member_id uuid, member_email text, member_username text, member_role text, member_status text)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  if p_role not in ('user','admin') then raise exception 'Geçersiz kullanıcı rolü'; end if;
  if p_status not in ('active','suspended') then raise exception 'Geçersiz hesap durumu'; end if;
  if p_user_id = (select auth.uid()) and p_status='suspended' then raise exception 'Kendi hesabınızı askıya alamazsınız'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'Kullanıcı bulunamadı'; end if;

  -- Role/status are updated separately so the username cooldown trigger cannot block them.
  update public.profiles set role=p_role, account_status=p_status,
    suspended_until=case when p_status='suspended' then 'infinity'::timestamptz else null end,
    updated_at=now() where id=p_user_id;

  if exists(select 1 from public.profiles where id=p_user_id and lower(trim(username)) is distinct from lower(trim(p_username))) then
    update public.profiles set username=trim(p_username), updated_at=now() where id=p_user_id;
  end if;

  return query select profile.id,profile.email,profile.username,profile.role,profile.account_status
  from public.profiles profile where profile.id=p_user_id;
end $$;
grant execute on function public.admin_save_member(uuid,text,text,text) to authenticated;
