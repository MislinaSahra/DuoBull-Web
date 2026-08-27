-- DİKKAT: Bu dosya test verilerini kalıcı olarak siler.
-- Kazara/izinsiz çalıştırmayı önlemek için aynı SQL çalıştırmasında önce:
-- select set_config('app.allow_destructive_test_reset', 'DELETE_NON_ADMIN_TEST_DATA', true);
-- komutunu bilinçli olarak çalıştırmanız gerekir.
begin;
do $$ begin
  if current_setting('app.allow_destructive_test_reset', true) is distinct from 'DELETE_NON_ADMIN_TEST_DATA' then
    raise exception 'Temizlik durduruldu: açık yıkıcı işlem onayı bulunmuyor.';
  end if;
  if not exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'Temizlik durduruldu: korunacak admin hesabı bulunamadı.';
  end if;
end $$;

delete from auth.users u where not exists (
  select 1 from public.profiles p where p.id = u.id and p.role = 'admin'
);
delete from public.notifications;
delete from public.order_items;
delete from public.orders;
delete from public.support_replies;
delete from public.support_tickets;
delete from public.direct_messages;
delete from public.team_messages;
delete from public.tournament_messages;
delete from public.friend_requests;
delete from public.friendships;
delete from public.team_applications;
delete from public.team_members;
delete from public.teams;
delete from public.tournament_applications;
delete from public.tournament_requests;
delete from public.tournaments;
delete from public.community_reviews;
delete from public.user_loyalty_rewards;
delete from public.site_images;

update public.products set stock_count = 0, updated_at = now();
update public.profiles set balance = 0, loyalty_xp = 0, updated_at = now() where role = 'admin';
update public.user_missions set progress = 0, is_claimed = false, claimed_at = null;
select set_config('app.allow_destructive_test_reset', '', true);
commit;
