-- 040_security_advisor_hardening.sql sonrasındaki izin temizliği
-- Supabase SQL Editor içinde bir kez çalıştırın.
-- Tekrar çalıştırılması güvenlidir.

begin;

-- Bu fonksiyon bir veritabanı tetikleyicisidir. Uygulama tarafından RPC olarak
-- çağrılmamalıdır; tetikleyicinin çalışması bu EXECUTE izinlerine bağlı değildir.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'enforce_username_change_rules'
  loop
    execute format('revoke execute on function %s from public', fn.signature);
    execute format('revoke execute on function %s from anon', fn.signature);
    execute format('revoke execute on function %s from authenticated', fn.signature);
  end loop;
end
$$;

commit;

-- Kontrol:
-- anon için yalnızca is_username_available görünmelidir.
-- PUBLIC için hiçbir satır görünmemelidir.
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and grantee in ('PUBLIC', 'anon', 'authenticated')
order by routine_name, grantee;
