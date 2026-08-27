create table if not exists public.site_footer_links (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  label text not null,
  url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(section,label)
);
alter table public.site_footer_links enable row level security;
drop policy if exists "footer links are public" on public.site_footer_links;
drop policy if exists "admins manage footer links" on public.site_footer_links;
create policy "footer links are public" on public.site_footer_links for select to anon,authenticated using(is_active or public.is_admin());
create policy "admins manage footer links" on public.site_footer_links for all to authenticated using(public.is_admin()) with check(public.is_admin());
insert into public.site_footer_links(section,label,url,sort_order) values
('Destek','SSS','/destek#sss',10),('Destek','Destek Talebi','/destek#talep',20),('Destek','Kullanım Koşulları','/kullanim-kosullari',30),('Destek','Gizlilik Politikası','/gizlilik-politikasi',40),
('Topluluk','Discord','/topluluk',10),('Topluluk','Instagram','/topluluk',20),('Topluluk','YouTube','/topluluk',30),('Topluluk','TikTok','/topluluk',40)
on conflict(section,label) do nothing;
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='site_footer_links') then alter publication supabase_realtime add table public.site_footer_links; end if; end $$;
