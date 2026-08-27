-- Verified accounts, premium profile addresses and banners.
alter table public.profiles add column if not exists is_verified boolean not null default false;
alter table public.profiles add column if not exists custom_slug text;
alter table public.profiles add column if not exists profile_banner_url text not null default '';
create unique index if not exists profiles_custom_slug_unique on public.profiles(lower(custom_slug)) where custom_slug is not null;
alter table public.subscription_plans add column if not exists custom_profile boolean not null default false;
update public.subscription_plans set custom_profile=true where id in ('starter','captain');
grant update(custom_slug,profile_banner_url) on public.profiles to authenticated;

create or replace function public.admin_set_profile_verified(target_user uuid, next_verified boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  update public.profiles set is_verified=next_verified,updated_at=now() where id=target_user;
  if not found then raise exception 'Kullanıcı bulunamadı'; end if;
  insert into public.notifications(recipient_id,message,notification_type,entity_id)
  values(target_user,case when next_verified then 'Hesabınız yönetici tarafından onaylandı. Onaylı hesap rozetiniz aktif.' else 'Onaylı hesap rozetiniz yönetici tarafından kaldırıldı.' end,'profile_verification',target_user);
end $$;
grant execute on function public.admin_set_profile_verified(uuid,boolean) to authenticated;

create or replace function public.guard_premium_profile_fields()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (new.custom_slug is distinct from old.custom_slug or new.profile_banner_url is distinct from old.profile_banner_url)
    and not public.is_admin()
    and not exists(select 1 from public.active_subscription(new.id) p where p.custom_profile) then
      raise exception 'Özel profil adresi ve banner için uygun abonelik gereklidir';
  end if;
  if new.custom_slug is not null then
    new.custom_slug=lower(trim(new.custom_slug));
    if new.custom_slug !~ '^[a-z0-9][a-z0-9-]{2,29}$' then raise exception 'Profil adresi 3-30 karakter olmalı; yalnızca harf, sayı ve tire kullanılabilir'; end if;
    if new.custom_slug in ('admin','giris','uyelik','profil','sosyal','magaza','abonelik','blog','destek','turnuvalar','takim-bul','takim-olustur','gorevler','sadakat','oyuncu','takim') then raise exception 'Bu profil adresi kullanılamaz'; end if;
  end if;
  return new;
end $$;
drop trigger if exists before_premium_profile_fields on public.profiles;
create trigger before_premium_profile_fields before update of custom_slug,profile_banner_url on public.profiles for each row execute procedure public.guard_premium_profile_fields();

-- Team profile fields.
alter table public.teams add column if not exists logo_url text not null default '';
alter table public.teams add column if not exists banner_url text not null default '';
alter table public.teams add column if not exists motto text not null default '';
alter table public.teams add column if not exists profile_description text not null default '';
grant update(logo_url,banner_url,motto,profile_description) on public.teams to authenticated;

-- Dynamic game catalogue.
create table if not exists public.game_catalog (
  id text primary key,
  name text not null unique,
  roles jsonb not null default '[]'::jsonb,
  ranks jsonb not null default '[]'::jsonb,
  characters jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.game_catalog enable row level security;
drop policy if exists "game catalog public read" on public.game_catalog;
drop policy if exists "admins manage game catalog" on public.game_catalog;
create policy "game catalog public read" on public.game_catalog for select to anon,authenticated using(is_active or public.is_admin());
create policy "admins manage game catalog" on public.game_catalog for all to authenticated using(public.is_admin()) with check(public.is_admin());
insert into public.game_catalog(id,name,roles,ranks,characters,sort_order) values
('valorant','Valorant','["Düellocu","Öncü","Kontrol Uzmanı","Gözcü"]','["Demir","Bronz","Gümüş","Altın","Platin","Elmas","Yücelik","Ölümsüzlük","Radiant"]','["Jett","Sage","Sova","Reyna","Raze","Omen","Cypher","Killjoy"]',10),
('pubg-mobile','PUBG Mobile','["Hücumcu","Destek","Keskin Nişancı","Takım Lideri (IGL)"]','["Bronz","Gümüş","Altın","Platin","Elmas","Taç","As","Fatih"]','["Victor","Sara","Carlo","Andy","Anna"]',20),
('free-fire','Free Fire','["Hücumcu","Destek","Keskin Nişancı","Takım Lideri (IGL)"]','["Bronz","Gümüş","Altın","Platin","Elmas","Heroic","Grandmaster"]','["Alok","Chrono","Kelly","Hayato","Moco"]',30),
('league-of-legends','League of Legends','["Üst Koridor","Ormancı","Orta Koridor","Alt Koridor","Destek"]','["Demir","Bronz","Gümüş","Altın","Platin","Zümrüt","Elmas","Ustalık","Üstatlık","Şampiyonluk"]','["Ahri","Akali","Ashe","Jinx","Lee Sin","Lux","Yasuo","Zed"]',40),
('counter-strike-2','Counter-Strike 2','["Giriş Oyuncusu","AWP Oyuncusu","Destek","Takım Lideri (IGL)","Pusucu"]','["Silver I","Silver II","Silver III","Silver IV","Gold Nova","Master Guardian","Legendary Eagle","Global Elite"]','["Ajan tercihi yok","Terörist ajanı","Anti-Terörist ajanı"]',50),
('fortnite','Fortnite','["Takım Lideri (IGL)","Hücumcu","Destek","Esnek"]','["Bronz","Gümüş","Altın","Platin","Elmas","Elite","Champion","Unreal"]','["Jonesy","Peely","Fishstick","Midas","Lynx","Raven"]',60)
on conflict(id) do nothing;

-- Store product management.
drop policy if exists "admins insert products" on public.products;
drop policy if exists "admins delete products" on public.products;
create policy "admins insert products" on public.products for insert to authenticated with check(public.is_admin());
create policy "admins delete products" on public.products for delete to authenticated using(public.is_admin());

-- Public profile statistics without exposing private data.
create or replace function public.get_player_profile_stats(target_user uuid)
returns table(match_count bigint,review_count bigint,positive_count bigint,negative_count bigint,average_rating numeric,average_sportsmanship numeric)
language sql stable security definer set search_path='' as $$
  select
    (select count(distinct r.id) from public.team_members tm join public.team_match_rounds r on r.team_id=tm.team_id and r.status='completed' where tm.user_id=target_user),
    count(pr.id),
    count(pr.id) filter(where pr.rating>=4 and pr.sportsmanship>=4),
    count(pr.id) filter(where pr.rating<=2 or pr.sportsmanship<=2),
    coalesce(round(avg(pr.rating),1),0),
    coalesce(round(avg(pr.sportsmanship),1),0)
  from public.player_reviews pr where pr.player_id=target_user
$$;
grant execute on function public.get_player_profile_stats(uuid) to authenticated;

-- Profile and team media buckets.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('profile-banners','profile-banners',true,8388608,array['image/jpeg','image/png','image/webp']),
('team-assets','team-assets',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "users upload own profile banners" on storage.objects;
create policy "users upload own profile banners" on storage.objects for insert to authenticated with check(bucket_id='profile-banners' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "captains upload team assets" on storage.objects;
create policy "captains upload team assets" on storage.objects for insert to authenticated with check(bucket_id='team-assets' and exists(select 1 from public.teams t where t.id::text=(storage.foldername(name))[1] and t.captain_id=(select auth.uid())));
drop policy if exists "public reads profile banners" on storage.objects;
create policy "public reads profile banners" on storage.objects for select to public using(bucket_id in ('profile-banners','team-assets'));

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='game_catalog') then alter publication supabase_realtime add table public.game_catalog; end if;
end $$;
