-- GÜVENLİ YÖNETİCİ ATAMA
-- Bu dosya kullanıcı/parola oluşturmaz ve hiçbir hesabı silmez.
-- Önce Authentication üzerinden normal bir hesap oluşturup e-postasını doğrulayın.
-- Sonra bu dosyayla AYNI SQL çalıştırmasında aşağıdaki ayarı yapın:
-- select set_config('app.bootstrap_admin_email', 'yonetici@ornek.com', true);
-- Gerçek e-posta adresini kaynak kontrolüne kaydetmeyin.

do $$
declare
  admin_email text := lower(nullif(current_setting('app.bootstrap_admin_email', true), ''));
  admin_id uuid;
begin
  if admin_email is null then
    raise exception 'app.bootstrap_admin_email ayarlanmadı. Doğrulanmış mevcut hesabın e-postasını oturum ayarı olarak verin.';
  end if;

  select id into admin_id
  from auth.users
  where lower(email) = admin_email and email_confirmed_at is not null
  limit 1;

  if admin_id is null then
    raise exception 'Bu e-postayla doğrulanmış mevcut bir hesap bulunamadı.';
  end if;

  update public.profiles
  set role='admin', is_super_admin=true, account_status='active', is_verified=true
  where id=admin_id;

  if not found then raise exception 'Kullanıcının profil kaydı bulunamadı.'; end if;
  perform set_config('app.bootstrap_admin_email', '', true);
end $$;
