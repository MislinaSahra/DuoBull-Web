create table if not exists public.community_reviews (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_game text not null default 'Oyuncu',
  quote text not null check (length(trim(quote)) between 5 and 220),
  created_at timestamptz not null default now()
);

create table if not exists public.site_images (
  image_key text primary key,
  image_url text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.community_reviews enable row level security;
alter table public.site_images enable row level security;

drop policy if exists "reviews are public" on public.community_reviews;
drop policy if exists "users create own reviews" on public.community_reviews;
drop policy if exists "owners or admins delete reviews" on public.community_reviews;
create policy "reviews are public" on public.community_reviews
for select to anon, authenticated using (true);
create policy "users create own reviews" on public.community_reviews
for insert to authenticated with check (author_id = (select auth.uid()));
create policy "owners or admins delete reviews" on public.community_reviews
for delete to authenticated using (author_id = (select auth.uid()) or public.is_admin());

drop policy if exists "site images are public" on public.site_images;
drop policy if exists "admins insert site images" on public.site_images;
drop policy if exists "admins update site images" on public.site_images;
drop policy if exists "admins reset site images" on public.site_images;
create policy "site images are public" on public.site_images
for select to anon, authenticated using (true);
create policy "admins insert site images" on public.site_images
for insert to authenticated with check (public.is_admin() and updated_by = (select auth.uid()));
create policy "admins update site images" on public.site_images
for update to authenticated using (public.is_admin())
with check (public.is_admin() and updated_by = (select auth.uid()));
create policy "admins reset site images" on public.site_images
for delete to authenticated using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads site image files" on storage.objects;
drop policy if exists "admins upload site image files" on storage.objects;
drop policy if exists "admins update site image files" on storage.objects;
drop policy if exists "admins delete site image files" on storage.objects;
create policy "public reads site image files" on storage.objects
for select to anon, authenticated using (bucket_id = 'site-images');
create policy "admins upload site image files" on storage.objects
for insert to authenticated with check (bucket_id = 'site-images' and public.is_admin());
create policy "admins update site image files" on storage.objects
for update to authenticated using (bucket_id = 'site-images' and public.is_admin())
with check (bucket_id = 'site-images' and public.is_admin());
create policy "admins delete site image files" on storage.objects
for delete to authenticated using (bucket_id = 'site-images' and public.is_admin());

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'community_reviews') then
    alter publication supabase_realtime add table public.community_reviews;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'site_images') then
    alter publication supabase_realtime add table public.site_images;
  end if;
end $$;
