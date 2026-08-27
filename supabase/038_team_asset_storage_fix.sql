-- Takım kaptanlarının takım logo ve banner görsellerini yükleyebilmesini sağlar.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('team-assets','team-assets',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "captains upload team assets" on storage.objects;
drop policy if exists "captains update team assets" on storage.objects;
drop policy if exists "admins delete team assets" on storage.objects;
drop policy if exists "public reads team assets" on storage.objects;

create policy "captains upload team assets" on storage.objects
for insert to authenticated
with check (
  bucket_id='team-assets'
  and exists (
    select 1 from public.teams t
    where t.id::text=(storage.foldername(name))[1]
      and (t.captain_id=auth.uid() or public.is_admin())
  )
);

create policy "captains update team assets" on storage.objects
for update to authenticated
using (
  bucket_id='team-assets'
  and exists (
    select 1 from public.teams t
    where t.id::text=(storage.foldername(name))[1]
      and (t.captain_id=auth.uid() or public.is_admin())
  )
)
with check (
  bucket_id='team-assets'
  and exists (
    select 1 from public.teams t
    where t.id::text=(storage.foldername(name))[1]
      and (t.captain_id=auth.uid() or public.is_admin())
  )
);

create policy "admins delete team assets" on storage.objects
for delete to authenticated
using (bucket_id='team-assets' and public.is_admin());

create policy "public reads team assets" on storage.objects
for select to public using(bucket_id='team-assets');
