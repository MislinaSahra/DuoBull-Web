create table if not exists public.site_seo (
  page_key text primary key,
  title text not null default '',
  description text not null default '',
  keywords text not null default '',
  updated_at timestamptz not null default now()
);
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  content text not null default '',
  seo_title text not null default '',
  seo_description text not null default '',
  status text not null default 'draft' check(status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products add column if not exists seo_description text not null default '';
alter table public.site_seo enable row level security;
alter table public.blog_posts enable row level security;
create policy "seo public read" on public.site_seo for select to anon,authenticated using(true);
create policy "seo admin manage" on public.site_seo for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "published blogs public read" on public.blog_posts for select to anon,authenticated using(status='published' or public.is_admin());
create policy "blogs admin manage" on public.blog_posts for all to authenticated using(public.is_admin()) with check(public.is_admin());
insert into public.site_seo(page_key,title,description,keywords) values('home','DuoBull | Takımını Bul, Birlikte Oyna','Takım arkadaşlarını bul, turnuvalara katıl ve sadakat ödülleri kazan.','oyun takımı bul, esports turnuva, DuoBull') on conflict(page_key) do nothing;
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='site_seo') then alter publication supabase_realtime add table public.site_seo; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='blog_posts') then alter publication supabase_realtime add table public.blog_posts; end if;
end $$;
