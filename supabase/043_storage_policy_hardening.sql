-- Storage RLS sıkılaştırması
-- Supabase SQL Editor içinde bir kez çalıştırın.
-- Tekrar çalıştırılması güvenlidir.

begin;

-- Maç kanıtı yolu uygulamada "<team_uuid>/<dosya>" biçimindedir.
-- Önceki politika, giriş yapan herhangi bir kullanıcının herhangi bir takım
-- klasörüne dosya yüklemesine izin veriyordu. Yalnızca takım üyeleri yükleyebilir.
drop policy if exists "members upload match results" on storage.objects;
create policy "members upload match results"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'match-results'
  and public.is_team_member(
    case
      when (storage.foldername(name))[1] ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (storage.foldername(name))[1]::uuid
      else null
    end
  )
);

-- Profil bannerları sürümlü dosya adı kullanır. Yeni dosya başarıyla
-- kaydedildikten sonra kullanıcının kendi eski dosyasını silebilmesi gerekir.
drop policy if exists "users update own profile banners" on storage.objects;
create policy "users update own profile banners"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-banners'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-banners'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "users delete own profile banners" on storage.objects;
create policy "users delete own profile banners"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-banners'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Takım görselleri de "<user_uuid>/teams/<team_uuid>/..." altında sürümlenir.
-- URL'yi takım kaydına yazma yetkisi save_team_profile RPC'sinde ayrıca
-- kaptan/admin olarak doğrulanır.
drop policy if exists "users delete own team assets" on storage.objects;
create policy "users delete own team assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'team-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;

-- Kontrol raporu
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
