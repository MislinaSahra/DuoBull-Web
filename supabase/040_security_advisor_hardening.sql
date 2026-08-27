-- DuoBull Security Advisor sertleştirmesi
-- Supabase SQL Editor içinde tek sefer çalıştırın.
-- Bu dosya tekrar çalıştırılabilir (idempotent) olacak şekilde hazırlanmıştır.

begin;

-- Public bucket URL'leri dosya yolunu bilen kişilere zaten açıktır.
-- Bu SELECT politikaları bucket içeriğinin API üzerinden listelenmesine
-- izin verdiği için Security Advisor tarafından uyarı olarak işaretlenir.
drop policy if exists "public reads site image files" on storage.objects;
drop policy if exists "public reads team assets" on storage.objects;

-- Yeni fonksiyonların varsayılan olarak herkese açılmasını önle.
alter default privileges for role postgres in schema public
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon;
alter default privileges for role postgres in schema public
  revoke execute on functions from authenticated;

-- Bütün SECURITY DEFINER fonksiyonları önce dış erişime kapat.
-- Tetikleyiciler çalışmaya devam eder; EXECUTE izni doğrudan RPC içindir.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke execute on function %s from public', fn.signature);
    execute format('revoke execute on function %s from anon', fn.signature);
    execute format('revoke execute on function %s from authenticated', fn.signature);
  end loop;
end
$$;

-- Kayıt ekranında oturum açmadan kullanılan tek RPC.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname = 'is_username_available'
  loop
    execute format('grant execute on function %s to anon, authenticated', fn.signature);
  end loop;
end
$$;

-- Kaynak kodun doğrudan çağırdığı veya RLS kontrollerinde kullanılan RPC'ler.
-- Bu fonksiyonların kendi içinde auth.uid(), is_admin() veya sahiplik kontrolü vardır.
do $$
declare
  allowed_names text[] := array[
    'active_subscription',
    'adjust_product_stock',
    'admin_save_member',
    'admin_set_profile_verified',
    'assign_wallet',
    'cancel_user_subscription',
    'checkout',
    'claim_loyalty_reward',
    'claim_mission',
    'clear_completed_orders',
    'clear_direct_conversation',
    'close_support_ticket',
    'complete_team_match',
    'confirm_team_match_ready',
    'create_system_notification',
    'delete_closed_support_ticket',
    'delete_completed_order',
    'delete_my_account',
    'delete_player_review',
    'delete_team_match_evidence',
    'delete_tournament_application',
    'deliver_order',
    'get_player_profile_stats',
    'get_team_match_access',
    'get_team_match_state',
    'is_admin',
    'is_super_admin',
    'is_team_member',
    'mark_direct_messages_seen',
    'prepare_daily_missions',
    'record_daily_mission',
    'remove_friend',
    'remove_team_member',
    'reply_support_ticket',
    'report_player_review',
    'request_profile_verification',
    'request_subscription',
    'review_friend_request',
    'review_profile_verification',
    'review_subscription',
    'review_team',
    'review_team_application',
    'review_tournament_application',
    'review_tournament_request',
    'save_player_review',
    'save_team_profile',
    'set_user_block',
    'submit_team_match_code',
    'submit_team_match_round_code',
    'withdraw_team_application',
    'withdraw_tournament_application'
  ];
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname = any(allowed_names)
  loop
    execute format('grant execute on function %s to authenticated', fn.signature);
  end loop;
end
$$;

commit;

-- KONTROL RAPORU:
-- anon yalnızca is_username_available fonksiyonunu görmelidir.
-- authenticated satırları yukarıdaki bilinçli RPC izinleridir.
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and grantee in ('PUBLIC', 'anon', 'authenticated')
order by routine_name, grantee;
