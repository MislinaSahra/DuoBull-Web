import {
  BadgeCheck,
  Crown,
  Gamepad2,
  Medal,
  Shield,
  Swords,
  Target,
  Trophy,
  Users,
  Zap
} from "lucide-react";

export const navLinks = [
  { label: "Ana Sayfa", to: "/" },
  { label: "Takım Bul", to: "/takim-bul" },
  { label: "Sosyal", to: "/sosyal" },
  { label: "Tartışmalar", to: "/tartismalar" },
  { label: "Turnuvalar", to: "/turnuvalar" },
  { label: "Görevler", to: "/gorevler" },
  { label: "Mağaza", to: "/magaza" },
  { label: "Sadakat", to: "/sadakat" }
  ,{ label: "Abonelik", to: "/abonelik" }
];

export const heroStats = [
  { label: "Oyuncu", value: "250.000+" },
  { label: "Ücretsiz Katıl", value: "0 TL" }
];

export const games = [
  { id: "valorant", name: "Valorant", shortName: "V", color: "#ff4655" },
  { id: "pubg-mobile", name: "PUBG Mobile", shortName: "P", color: "#f2a900" },
  { id: "free-fire", name: "Free Fire", shortName: "F", color: "#ffb800" },
  { id: "league-of-legends", name: "League of Legends", shortName: "L", color: "#c89b3c" },
  { id: "counter-strike-2", name: "Counter-Strike 2", shortName: "CS", color: "#f0a020" },
  { id: "fortnite", name: "Fortnite", shortName: "FN", color: "#8b5cf6" }
];

export const rankMappings = {
  Valorant: ["Demir", "Bronz", "Gümüş", "Altın", "Platin", "Elmas", "Yücelik", "Ölümsüzlük", "Radiant"],
  "Counter-Strike 2": ["Silver I", "Silver Elite", "Gold Nova", "Master Guardian", "Legendary Eagle", "Supreme", "Global Elite"],
  "PUBG Mobile": ["Bronz", "Gümüş", "Altın", "Platin", "Elmas", "Taç", "As", "Fatih"],
  "League of Legends": ["Demir", "Bronz", "Gümüş", "Altın", "Platin", "Zümrüt", "Elmas", "Ustalık", "Şampiyonluk"],
  Fortnite: ["Bronz", "Gümüş", "Altın", "Platin", "Elmas", "Elite", "Champion", "Unreal"],
  "Free Fire": ["Bronz", "Gümüş", "Altın", "Platin", "Elmas", "Heroic", "Grandmaster"]
};

export const categoryCards = [
  {
    title: "Takımını Bul",
    description: "Duo, trio veya takım arkadaşlarını hızlıca bul.",
    to: "/takim-bul",
    iconKey: "team"
  },
  {
    title: "Topluluk Eşleştirme",
    description: "Benzer oyuncularla eşleş, oyun deneyimini artır.",
    to: "/topluluk-eslestirme",
    iconKey: "community"
  },
  {
    title: "Turnuvalar",
    description: "Büyük ödüllü turnuvalara katıl, yeteneğini göster.",
    to: "/turnuvalar",
    iconKey: "tournament"
  },
  {
    title: "Günlük Görevler",
    description: "Her gün görevleri tamamla, puanlar kazan.",
    to: "/gorevler",
    iconKey: "missions"
  },
  {
    title: "Sadakat Puanları",
    description: "Oyna, kazan, puan topla ve ayrıcalıklara eriş.",
    to: "/sadakat",
    iconKey: "loyalty"
  },
  {
    title: "Ödül Mağazası",
    description: "Puanlarını harca, harika ödüllerin sahibi ol.",
    to: "/magaza",
    iconKey: "shop"
  }
];

export const filterOptions = {
  games: games.map((game) => game.name),
  roles: ["Saldıran", "Destek", "Nişancı", "Esnek"],
  levels: ["Altın I", "Platin II", "Elmas III", "Elmas IV"],
  regions: ["Türkiye", "Avrupa", "MENA", "Global"]
};

const sampleTeams = [
  {
    name: "Shadow Legends",
    game: "Valorant",
    players: "3/5",
    role: "Saldıran",
    level: "Elmas IV",
    region: "Türkiye",
    status: "Çevrimiçi"
  },
  {
    name: "Prime Squad",
    game: "PUBG Mobile",
    players: "2/5",
    role: "Destek",
    level: "Platin II",
    region: "MENA",
    status: "Çevrimiçi"
  },
  {
    name: "Invictus",
    game: "League of Legends",
    players: "4/5",
    role: "Nişancı",
    level: "Elmas III",
    region: "Avrupa",
    status: "Son 5 dk"
  },
  {
    name: "Nova Alliance",
    game: "Free Fire",
    players: "1/5",
    role: "Esnek",
    level: "Altın I",
    region: "Türkiye",
    status: "Çevrimiçi"
  },
  {
    name: "Anka Tactics",
    game: "Counter-Strike 2",
    players: "4/5",
    role: "Destek",
    level: "Elmas III",
    region: "Avrupa",
    status: "Çevrimiçi"
  },
  {
    name: "Storm Builders",
    game: "Fortnite",
    players: "2/4",
    role: "Esnek",
    level: "Platin II",
    region: "Türkiye",
    status: "Son 5 dk"
  }
];

export const teams = [];

export const tournaments = [
  {
    name: "DuoBull Championship #12",
    game: "PUBG Mobile",
    prize: "₺150.000",
    date: "20 Haz 2026",
    participants: "128/256 Takım",
    status: "Öne Çıkan"
  },
  {
    name: "DuoBull Valorant Series #8",
    game: "Valorant",
    prize: "₺75.000",
    date: "23 Haz 2026",
    participants: "64/128 Takım",
    status: "Kayıt Açık"
  },
  {
    name: "DuoBull Free Fire Cup #5",
    game: "Free Fire",
    prize: "₺50.000",
    date: "21 Haz 2026",
    participants: "96/192 Takım",
    status: "Yakında"
  },
  {
    name: "DuoBull LoL Open #6",
    game: "League of Legends",
    prize: "₺100.000",
    date: "24 Haz 2026",
    participants: "32/64 Takım",
    status: "Kayıt Açık"
  },
  {
    name: "DuoBull CS2 Masters #1",
    game: "Counter-Strike 2",
    prize: "₺90.000",
    date: "27 Haz 2026",
    participants: "24/32 Takım",
    status: "Kayıt Açık"
  },
  {
    name: "DuoBull Fortnite Clash #1",
    game: "Fortnite",
    prize: "₺60.000",
    date: "29 Haz 2026",
    participants: "48/100 Takım",
    status: "Yakında"
  }
];

export const missions = [
  { id: "visit-team-finder", title: "Takım ilanlarını incele", target: 1, bpReward: 75, xpReward: 80, action: "Git", to: "/takim-bul" },
  { id: "visit-tournaments", title: "Turnuvaları keşfet", target: 1, bpReward: 75, xpReward: 80, action: "Git", to: "/turnuvalar" },
  { id: "visit-social", title: "Sosyal merkeze uğra", target: 1, bpReward: 100, xpReward: 100, action: "Git", to: "/sosyal" },
  { id: "visit-profile", title: "Profilini kontrol et", target: 1, bpReward: 50, xpReward: 60, action: "Git", to: "/profil" }
];

export const loyaltyLevels = ["Bronz", "Gümüş", "Altın", "Elmas", "Efsane"];

export const loyaltyPerks = [
  { title: "Özel rozet", icon: Target },
  { title: "+20% puan", icon: Zap },
  { title: "Özel görevler", icon: Shield },
  { title: "Öncelikli destek", icon: Medal }
];

export const shopProducts = [
  { name: "Razer Gold", price: "10.000", type: "100 TL", category: "dijital-kartlar", stock: "Popüler", imageKey: "product-razer", image: "/products/razer-gold.svg" },
  { name: "Google Play", price: "10.000", type: "100 TL", category: "dijital-kartlar", stock: "Stokta", imageKey: "product-google", image: "/products/google-play.svg" },
  { name: "App Store", price: "10.000", type: "100 TL", category: "dijital-kartlar", stock: "Stokta", imageKey: "product-appstore", image: "/products/app-store.svg" },
  { name: "PUBG Mobile", price: "12.000", type: "300 UC", category: "oyun-kodlari", stock: "Popüler", imageKey: "product-pubg", image: "/products/pubg-mobile.svg" },
  { name: "Valorant", price: "12.000", type: "475 VP", category: "oyun-kodlari", stock: "Stokta", imageKey: "product-valorant", image: "/products/valorant.svg" }
];

export const productOptions = [
  { id: "google-play", name: "Google Play" },
  { id: "app-store", name: "App Store" },
  { id: "razer-gold", name: "Razer Gold" },
  { id: "valorant-vp", name: "Valorant VP" },
  { id: "pubg-mobile", name: "PUBG Mobile" }
];

export const platformStats = [
  { label: "Kayıtlı Oyuncu", value: "250.000+" },
  { label: "Aktif Turnuva", value: "1.250+" },
  { label: "Dağıtılan Ödül", value: "₺3.250.000+" },
  { label: "Mutlu Oyuncu", value: "%98" }
];

export const testimonials = [
  {
    name: "Mert Y.",
    role: "Valorant oyuncusu",
    quote: "DuoBull sayesinde harika takım arkadaşlarıyla tanıştım ve birçok turnuvada şampiyon olduk."
  },
  {
    name: "Zeynep A.",
    role: "Mobil oyuncu",
    quote: "Turnuvalar çok profesyonel ve ödüller gerçekten hızlı. Tavsiye ederim."
  },
  {
    name: "Ali K.",
    role: "Takım kaptanı",
    quote: "Görev sistemi ve sadakat puanları oyuncuları gerçekten motive ediyor."
  },
  {
    name: "Ece D.",
    role: "Topluluk üyesi",
    quote: "DuoBull topluluğu sıcak ve destekleyici. Burada kendimi evde gibi hissediyorum."
  }
];

export const footerLinks = {
  Platform: [
    { label: "Ana Sayfa", to: "/" },
    { label: "Takım Bul", to: "/takim-bul" },
    { label: "Takım Oluştur", to: "/takim-olustur" },
    { label: "Turnuvalar", to: "/turnuvalar" },
    { label: "Turnuva Oluştur", to: "/turnuva-olustur" },
    { label: "Topluluk Sıralaması", to: "/topluluk-eslestirme" }
  ],
  Keşfet: [
    { label: "Sosyal", to: "/sosyal" },
    { label: "Tartışmalar", to: "/tartismalar" },
    { label: "Blog", to: "/blog" },
    { label: "Görevler", to: "/gorevler" },
    { label: "Sadakat", to: "/sadakat" },
    { label: "Mağaza", to: "/magaza" },
    { label: "Abonelik", to: "/abonelik" }
  ],
  Destek: [
    { label: "SSS", to: "/destek#sss" },
    { label: "Destek Talebi", to: "/destek#talep" },
    { label: "Kullanım Koşulları", to: "/kullanim-kosullari" },
    { label: "Gizlilik Politikası", to: "/gizlilik-politikasi" },
    { label: "KVKK", to: "/kvkk" },
    { label: "Çerez Politikası", to: "/cerez-politikasi" }
  ],
  Topluluk: [
    { label: "Discord", to: "/topluluk" },
    { label: "Instagram", to: "/topluluk" },
    { label: "YouTube", to: "/topluluk" },
    { label: "TikTok", to: "/topluluk" }
  ]
};

export const heroSignals = [
  { label: "Eşleşme hızı", value: "38 sn", icon: Zap },
  { label: "Doğrulanmış takımlar", value: "9.8K", icon: BadgeCheck },
  { label: "Sezon rozeti", value: "Elmas", icon: Crown },
  { label: "Aktif savaş odası", value: "247", icon: Swords },
  { label: "Platform oyunları", value: "12+", icon: Gamepad2 },
  { label: "Ödüllü etkinlik", value: "126", icon: Trophy },
  { label: "Aktif oyuncu", value: "18.4K", icon: Users }
];
