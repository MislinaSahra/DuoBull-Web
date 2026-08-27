-- DuoBull Storage güvenlik kontrol raporu
-- Bu dosya yalnızca okuma yapar; bucket veya politika değiştirmez.
-- Supabase SQL Editor içinde çalıştırıp sonuçları kontrol edin.

-- 1) Bucket görünürlüğü, dosya boyutu ve izin verilen türler
select
  id as bucket,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id in ('site-images', 'profile-banners', 'team-assets', 'match-results')
order by id;

-- 2) Storage nesnelerine tanımlı RLS politikaları
select
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;

-- 3) Beklenmeyen bucket adlarını göster
select id, name, public
from storage.buckets
where id not in ('site-images', 'profile-banners', 'team-assets', 'match-results')
order by id;

-- Beklenen sonuç:
-- site-images      : public=true, yükleme/değiştirme/silme yalnızca admin
-- profile-banners  : public=true, yükleme yalnızca kullanıcının kendi UUID klasörüne
-- team-assets      : public=true, yükleme yalnızca kullanıcının kendi UUID klasörüne;
--                    takım kaydına URL yazma ayrıca save_team_profile ile kaptan/admin kontrolündedir
-- match-results    : şu an public=true; maç kanıtlarını gizli tutmak istenirse uygulama
--                    signed URL kullanacak şekilde değiştirilmeden private yapılmamalıdır
