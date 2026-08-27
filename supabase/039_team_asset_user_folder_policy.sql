-- Takım görsellerini kullanıcının yalnızca kendi Storage klasörüne yüklemesini sağlar.
-- Takım kaydına URL yazma yetkisi ayrıca save_team_profile RPC tarafından kaptan/admin olarak kontrol edilir.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('team-assets','team-assets',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "captains upload team assets" on storage.objects;
drop policy if exists "captains update team assets" on storage.objects;
drop policy if exists "users upload team assets" on storage.objects;
drop policy if exists "users update own team assets" on storage.objects;
drop policy if exists "public reads team assets" on storage.objects;

create policy "users upload team assets" on storage.objects
for insert to authenticated
with check (
  bucket_id='team-assets'
  and (storage.foldername(name))[1]=auth.uid()::text
);

create policy "users update own team assets" on storage.objects
for update to authenticated
using (
  bucket_id='team-assets'
  and (storage.foldername(name))[1]=auth.uid()::text
)
with check (
  bucket_id='team-assets'
  and (storage.foldername(name))[1]=auth.uid()::text
);

create policy "public reads team assets" on storage.objects
for select to public using(bucket_id='team-assets');
