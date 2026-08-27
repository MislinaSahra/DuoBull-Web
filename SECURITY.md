# DuoBull güvenlik notları

## Gizli bilgiler

- Tarayıcı paketine yalnızca Supabase `publishable` anahtarı konabilir.
- `service_role`, `sb_secret_*`, SMTP, ödeme ve yönetici parolaları hiçbir `VITE_*`
  değişkeninde veya SQL dosyasında tutulmamalıdır.
- Yönetici ataması yalnızca doğrulanmış mevcut bir hesap için
  `supabase/reset_and_init_admin.sql` ile bilinçli olarak yapılır.

## Veritabanı

- Yeni her public tabloda RLS etkinleştirilmeli ve açık bir politika yazılmalıdır.
- Yetkili işlemler yalnızca sahiplik/yönetici kontrolü yapan RPC fonksiyonlarında
  yürütülmelidir. Arayüzde buton gizlemek yetkilendirme sayılmaz.
- `SECURITY DEFINER` fonksiyonları sabit `search_path` kullanmalı, PUBLIC/anon
  çalıştırma izni varsayılan olarak kapalı kalmalıdır.
- SQL migration dosyaları sıra ile uygulanmalıdır. Sadece kaynak kodu yayınlamak
  mevcut Supabase projesindeki politika ve fonksiyonları güncellemez.

## Dosya yükleme

- Görseller yalnızca JPEG/PNG/WebP kabul edilir, boyut ve piksel sınırından sonra
  WebP'ye dönüştürülür.
- Tartışma videoları yalnızca MP4/WebM ve en fazla 50 MB olabilir.
- Storage bucket MIME/boyut politikaları istemci kontrolüne ek olarak açık tutulmalıdır.

## Düzenli kontrol

Üretim yayını öncesinde `npm audit` ve `npm run build` çalıştırılmalıdır. Supabase
Security Advisor sonuçları ile RLS ve Storage politikaları ayrıca kontrol edilmelidir.
