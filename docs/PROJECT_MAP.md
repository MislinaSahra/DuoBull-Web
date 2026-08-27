# DuoBull Proje Haritası

## Uygulama başlangıcı

- `src/main.jsx` — React uygulamasını `index.html` içindeki root alanına bağlar.
- `src/App.jsx` — Provider, uygulama efektleri ve route ağacını birleştiren küçük giriş component'i.
- `src/app/AppProviders.jsx` — Bütün context provider'ların görünür sırası.
- `src/app/AppEffects.jsx` — Route değişiminde scroll ve genel tarayıcı efektleri.
- `src/app/AppLayout.jsx` — Header, footer ve ortak sayfa iskeletleri.
- `src/app/AppRoutes.jsx` — Bütün URL → sayfa eşleşmeleri.
- `src/app/RouteGuards.jsx` — Giriş ve admin erişim kontrolleri.

## Sayfalar

- `AdminDashboardPage.jsx` — Yönetim merkezi ve yönetim bölümleri.
- `AuthPage.jsx` — Giriş, kayıt ve şifremi unuttum arayüzü.
- `BlogPage.jsx` — Blog listesi ve yazı görünümü.
- `CommunityPage.jsx` — Eski/topluluk içerik görünümü.
- `CommunityRankingPage.jsx` — Onaylı oyuncu sıralaması.
- `HomePage.jsx` — Ana sayfa bölüm kompozisyonu.
- `InfoPage.jsx` — Genel bilgi içerikleri.
- `LegalPage.jsx` — Koşullar, gizlilik, KVKK ve çerez metinleri.
- `LoyaltyPage.jsx` — Sadakat seviyesi ve ödüller.
- `MissionsPage.jsx` — Günlük görevler.
- `PasswordResetPage.jsx` — E-posta bağlantısından şifre yenileme.
- `PlayerCareerPage.jsx` — Başka oyuncunun/kısa adresli kariyer profili.
- `ProfilePage.jsx` — Oturum açmış kullanıcının profili ve kontrol paneli.
- `ShopPage.jsx` — Mağaza, ürünler ve sepet.
- `SocialPage.jsx` — Arkadaşlık ve sohbetler.
- `SubscriptionPage.jsx` — Abonelik paketleri ve başvuru.
- `SupportPage.jsx` — SSS ve destek talebi.
- `TeamCreatePage.jsx` — Takım oluşturma formu.
- `TeamFinderPage.jsx` — Takım arama, filtre ve detaylar.
- `TeamProfilePage.jsx` — Takım profili, kadro ve takım görselleri.
- `TournamentsPage.jsx` — Turnuvalar ve oluşturma/katılım akışları.

## Component grupları

### Ortak layout ve ana sayfa

`Header`, `Footer`, `SiteFrame`, `PageHero`, `HeroSection`, `FeatureCards`, `StatsSection`, `TeamFinderPreview`, `TournamentSection`, `MissionSection`, `LoyaltySection`, `RewardShopSection`.

### Profil, takım ve topluluk

`ProfileEditModal`, `ProfileControlPanel`, `ProfileBanner`, `PlayerCareerModal`, `PlayerReviewModeration`, `ReferralCard`, `TeamFinderPreview`, `BannerCropModal`.

### Mağaza ve yönetim

`CartModal`, `OrderCard`, `OrderHistory`, `AdminManagementModal`, `AdminMembersPanel`, `AdminSectionErrorBoundary`, `CatalogManagement`, `SeoContentAdmin`, `SeoContentCollapsible`, `VerificationRequestsPanel`.

## Context/state

- `AuthContext` — session ve profil.
- `AdminOperationsContext` — admin işlemleri ve kuyruklar.
- `CartContext` — sepet.
- `EngagementContext` — etkileşim state'i.
- `GameCatalogContext` — dinamik oyun kataloğu.
- `HomeContentContext` — ana sayfa yönetilebilir içeriği.
- `LoyaltyContext` — XP/seviye.
- `MissionContext` — görev ilerleme ve ödül.
- `NotificationContext` — kullanıcı bildirimleri.
- `SocialContext` — arkadaşlık ve chat.
- `SubscriptionContext` — paket ve aktif abonelik.

## Kolay düzenlenen veri

- `src/constants/GameConstants.js` — varsayılan oyun, rol ve rank eşleşmeleri.
- `src/data/brandAssets.js` — marka görsel yolları.
- `src/data/siteTextDefaults.js` — varsayılan site metinleri.
- `src/data/mockData.js` — fallback/örnek veri.

## API ve backend katmanı

`src/services/` içindeki her `*Service.js` dosyası adıyla ilgili Supabase alanını yönetir. Ortak istemci `src/lib/supabase.js`, görsel yükleme yardımcıları `src/lib/storageImages.js` içindedir. Veritabanı tabloları, function'lar, trigger'lar ve RLS politikaları numaralı `supabase/*.sql` dosyalarında tarihsel sırayla bulunur.

## Config ve build

- `index.html` — tarayıcı HTML kabuğu ve temel metadata.
- `vite.config.js` — Vite build ayarı.
- `tailwind.config.js` — Tailwind tarama ve tema ayarı.
- `postcss.config.js` — CSS build zinciri.
- `package.json` — paketler ve `dev/build/preview` komutları.
- `.env.example` — güvenli frontend ortam değişkeni şablonu.
