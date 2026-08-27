create table if not exists public.site_text_content (
  content_key text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_text_content enable row level security;
drop policy if exists "site texts are public" on public.site_text_content;
drop policy if exists "admins manage site texts" on public.site_text_content;
create policy "site texts are public" on public.site_text_content for select to anon, authenticated using (true);
create policy "admins manage site texts" on public.site_text_content for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.site_text_content(content_key, content) values
('faq', '{"title":"Sık Sorulan Sorular","items":[{"question":"Takım başvurum ne zaman sonuçlanır?","answer":"Takım başvuruları takım kaptanı tarafından değerlendirilir. Sonucu profilindeki Başvurularım sekmesinden takip edebilirsin."},{"question":"Turnuvaya nasıl katılırım?","answer":"Turnuva detayından başvuru gönder. Turnuva sahibi onayladığında turnuva, profilindeki Turnuvalarım alanına eklenir."},{"question":"Satın aldığım ürün kodunu nerede görürüm?","answer":"Teslim edilen kodlar Bildirimler ve Profil > Siparişlerim bölümünde kalıcı olarak görüntülenir."},{"question":"Bull Puan bakiyem nasıl artar?","answer":"Görevleri tamamlayarak, etkinliklere katılarak veya yönetici tarafından tanımlanan bakiyelerle Bull Puan kazanabilirsin."},{"question":"Hesabımı nasıl silebilirim?","answer":"Profilini Düzenle penceresindeki Hesabımı Sil alanından onay vererek hesabını kalıcı olarak kaldırabilirsin."}]}'::jsonb),
('terms', '{"title":"Kullanım Koşulları","description":"DuoBull hizmetlerini kullanırken geçerli olan temel kurallar.","updatedAt":"15 Temmuz 2026","sections":[{"title":"Hesap ve güvenlik","text":"Kullanıcı, hesap bilgilerinin doğruluğundan ve güvenliğinden sorumludur. Hesabın başka kişilere devredilmesi veya kötüye kullanılması yasaktır."},{"title":"Topluluk kuralları","text":"Taciz, nefret söylemi, hile, yanıltıcı başvuru ve diğer oyuncuların deneyimini bozan davranışlara izin verilmez."},{"title":"Turnuva ve ödüller","text":"Turnuva sahipleri ilan ettikleri koşullara uymalıdır. Katılımcılar turnuva kurallarını ve organizatör kararlarını kabul eder."},{"title":"Mağaza işlemleri","text":"Dijital ürünler teslim edildikten sonra kullanılan kodlar için iade yapılamaz. Sipariş durumu profil üzerinden takip edilir."}]}'::jsonb),
('privacy', '{"title":"Gizlilik Politikası","description":"Kişisel verilerin nasıl kullanıldığını ve korunduğunu açıklar.","updatedAt":"15 Temmuz 2026","sections":[{"title":"Toplanan bilgiler","text":"Hesap adı, e-posta, oyun tercihleri, takım ve turnuva işlemleri ile sipariş kayıtları hizmetin çalışması için saklanır."},{"title":"Verilerin kullanımı","text":"Bilgiler hesap yönetimi, eşleştirme, bildirim, sipariş teslimatı ve platform güvenliğini sağlamak amacıyla kullanılır."},{"title":"Görünürlük","text":"E-posta adresleri diğer oyunculara gösterilmez. Oyuncular yalnızca paylaşılmasına izin verilen profil bilgilerini görebilir."},{"title":"Kontrol hakları","text":"Kullanıcı profil bilgilerini güncelleyebilir, bildirimlerini temizleyebilir ve hesabını profil ayarlarından kalıcı olarak silebilir."}]}'::jsonb)
on conflict (content_key) do nothing;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='site_text_content') then
    alter publication supabase_realtime add table public.site_text_content;
  end if;
end $$;
