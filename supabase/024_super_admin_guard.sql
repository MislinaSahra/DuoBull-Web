create or replace function public.protect_super_admin_account()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.is_super_admin and not public.is_super_admin()
     and (old.role is distinct from new.role or old.account_status is distinct from new.account_status) then
    raise exception 'Ana yönetici hesabının rolü veya hesap durumu normal adminler tarafından değiştirilemez';
  end if;
  return new;
end $$;
drop trigger if exists protect_super_admin_account_trigger on public.profiles;
create trigger protect_super_admin_account_trigger before update of role,account_status on public.profiles
for each row execute procedure public.protect_super_admin_account();
