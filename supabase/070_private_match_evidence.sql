-- Maç kanıtları kişisel/operasyonel veri içerir; public URL ile yayınlanmamalıdır.
begin;

update storage.buckets
set public = false,
    file_size_limit = 8388608,
    allowed_mime_types = array['image/webp']
where id = 'match-results';

drop policy if exists "public reads match results" on storage.objects;
drop policy if exists "admins read match results" on storage.objects;
create policy "admins read match results"
on storage.objects for select to authenticated
using (bucket_id = 'match-results' and public.is_admin());

commit;
