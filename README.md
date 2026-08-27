# DuoBull Web

DuoBull; React, Vite, Tailwind CSS ve Supabase ile geliştirilmiş bir oyuncu, takım, turnuva ve ödül platformudur. Bu repository sitenin **gerçek development kaynak kodunu** içerir. Uygulamanın çalışması için Codex'e veya Codex'e özel gizli bir çalışma ortamına ihtiyaç yoktur.

## Hızlı başlangıç

Gereksinimler: Node.js 20 veya daha yeni bir LTS sürümü ve npm.

```bash
npm install
copy .env.example .env.local
npm run dev
```

`.env.local` içine Supabase proje URL'sini ve tarayıcıda kullanılabilen publishable key'i ekleyin. `service_role`, SMTP parolası veya ödeme gizli anahtarını hiçbir zaman `VITE_` değişkenine koymayın.

Yerel adres varsayılan olarak `http://localhost:5173` olur.

## Production build

```bash
npm run build
npm run preview
```

Build çıktısı `dist/` klasörüne yazılır. Hostinger'a yüklenen klasör budur; ancak düzenleme yapılacak kaynak kod `src/` klasöründedir.

## Kaynak kod haritası

```text
src/
├── app/          Uygulama kabuğu, provider'lar, route'lar ve erişim kontrolleri
├── components/   Tekrar kullanılan UI parçaları ve sayfa bölümleri
├── constants/    Oyun sabitleri
├── context/      Uygulama state'i ve Supabase veri akışları
├── data/         Kolay düzenlenen varsayılan metinler, görseller ve örnek veriler
├── lib/          Supabase istemcisi ve Storage yardımcıları
├── pages/        URL'lere karşılık gelen gerçek sayfa kaynakları
├── services/     Backend/Supabase sorgu ve işlem fonksiyonları
├── utils/        Küçük ortak yardımcı fonksiyonlar
├── App.jsx       Küçük ve okunabilir uygulama başlangıç bileşeni
├── main.jsx      React'in tarayıcıya bağlandığı giriş noktası
└── styles.css    Global CSS ve ortak component sınıfları

public/           Statik görseller, ikonlar ve ürün görselleri
supabase/         Veritabanı şeması, RLS politikaları ve migration SQL dosyaları
docs/             Manuel düzenleme rehberleri
dist/             Üretilmiş build çıktısı; kaynak kod değildir
node_modules/     npm paketleri; kaynak kod değildir
```

## Nereden düzenlemeliyim?

- Bir sayfa: `src/pages/`
- Navbar veya footer: `src/components/Header.jsx`, `src/components/Footer.jsx`
- Ana sayfa bölümleri: `src/pages/HomePage.jsx` ve `src/components/*Section.jsx`
- Route/URL: `src/app/AppRoutes.jsx`
- Sabit metin ve varsayılan içerik: `src/data/siteTextDefaults.js`, `src/data/mockData.js`
- Stil: ilgili JSX içindeki Tailwind class'ları ve `src/styles.css`
- Statik görsel: `public/` ve `src/data/brandAssets.js`
- Supabase çağrısı: `src/services/`, `src/context/`, `src/lib/supabase.js`
- Veritabanı/RLS: `supabase/*.sql`

Ayrıntılı rehber için [docs/EDITING_GUIDE.md](docs/EDITING_GUIDE.md), tam dosya haritası için [docs/PROJECT_MAP.md](docs/PROJECT_MAP.md) dosyasını açın.

## Önemli güvenlik notu

`.env.local` git'e veya `dist/` içine eklenmemelidir. Frontend yalnızca publishable/anon anahtarı kullanır. Yönetici yetkisi sadece arayüzde gizlenen butonlara değil, Supabase RLS ve güvenli database function kontrollerine dayanmalıdır.
