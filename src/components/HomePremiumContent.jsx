import { ArrowRight, Check, Coins, Gift, ShieldCheck, Sparkles, Target, TrendingUp, Trophy, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAdminOperations } from "../context/AdminOperationsContext.jsx";
import { useHomeContent } from "../context/HomeContentContext.jsx";
import { useLoyalty } from "../context/LoyaltyContext.jsx";
import { useMissions } from "../context/MissionContext.jsx";
import { useSubscription } from "../context/SubscriptionContext.jsx";
import { missions, shopProducts } from "../data/mockData.js";
import AuthenticatedLink from "./AuthenticatedLink.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getMissionReward } from "../utils/loyaltyRewards.js";
import { fetchPlayerLeaderboard } from "../services/ProfileFeatureService.js";
import { fetchProducts, subscribeToProducts } from "../services/ProductService.js";

const benefits = [
  { icon: Target, title: "Rekabet Et", description: "Takımını bul, açık turnuvalara katıl ve becerilerini göster." },
  { icon: TrendingUp, title: "Yüksel", description: "Görevleri tamamla, sadakat seviyeni ve profilini geliştir." },
  { icon: Trophy, title: "Kazan", description: "Bull Puanlarını biriktir ve dijital ödüllere dönüştür." },
  { icon: Users, title: "Topluluğa Katıl", description: "Arkadaşlarınla bağlan, takımını kur ve birlikte büyü." }
];

export default function HomePremiumContent() {
  const { isAuthenticated } = useAuth();
  const { featuredTournaments } = useAdminOperations();
  return <><section className="container-shell relative z-10 py-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{benefits.map(({ icon: Icon, title, description }) => <article key={title} className="home-benefit"><span className="icon-tile h-14 w-14"><Icon className="h-7 w-7" /></span><div><h2 className="font-black uppercase text-white">{title}</h2><p className="mt-1 text-xs leading-5 text-white/48">{description}</p></div></article>)}</div></section>{isAuthenticated && featuredTournaments.length ? <UpcomingTournaments items={featuredTournaments} /> : null}{isAuthenticated ? <HomeDashboard /> : null}<TrustStrip /></>;
}

function PlayerLeaderboard() {
  const [players, setPlayers] = useState([]);
  useEffect(() => { fetchPlayerLeaderboard(5).then(setPlayers); }, []);
  if (!players.length) return null;
  const maxScore = Math.max(...players.map((player) => player.score), 1);
  return <section className="premium-card home-leaderboard home-dashboard__leaderboard"><div className="home-leaderboard__head"><div><p className="home-eyebrow">DuoBull sıralaması</p><h2>En iyi oyuncular</h2></div><Link to="/topluluk-eslestirme" className="text-[10px] font-black uppercase text-bull-neon">Tümü <ArrowRight className="inline h-3.5 w-3.5" /></Link></div><div className="home-leaderboard__list">{players.map((player, index) => <Link to={`/oyuncu/${player.id}`} key={player.id} className={`home-leaderboard__row ${index === 0 ? "is-first" : ""}`}><b className="home-leaderboard__position">#{index + 1}</b><span className="home-leaderboard__avatar">{player.avatar_url ? <img src={player.avatar_url} alt="" /> : player.username?.slice(0, 2).toUpperCase()}</span><span className="min-w-0"><strong>{player.username}{player.is_verified ? <ShieldCheck className="inline h-4 w-4 text-bull-neon" /> : null}</strong><small>{player.matchCount} eşleşme • {player.xp.toLocaleString("tr-TR")} XP</small></span><span className="home-leaderboard__progress"><i style={{ width: `${Math.max(8, player.score / maxScore * 100)}%` }} /></span></Link>)}</div></section>;
}

function UpcomingTournaments({ items }) {
  return <section className="container-shell pb-5"><div className="premium-card p-5 sm:p-6"><SectionHead eyebrow="Canlı rekabet" title="Yaklaşan turnuvalar" action="Tümünü Gör" to="/turnuvalar" /><div className="mt-5 grid gap-3 lg:grid-cols-2">{items.slice(0,4).map(item => <article key={item.id} className="home-tournament-row"><div className="min-w-0"><p className="truncate font-black text-white">{item.name}</p><p className="mt-1 text-xs text-white/45">{item.game} • {new Date(item.date).toLocaleDateString("tr-TR")}</p></div><div className="text-right"><p className="text-[10px] font-black uppercase text-white/35">Ödül</p><p className="font-black text-bull-gold">{item.prize}</p></div><Link to="/turnuvalar" className="primary-button px-4 py-2 text-[10px]">Katıl</Link></article>)}</div></div></section>;
}

function HomeDashboard() { return <section className="container-shell pb-5"><div className="home-dashboard"><ShopPreview /><MissionPreview /><LoyaltyPreview /><PlayerLeaderboard /></div></section>; }

function ShopPreview() {
  const { images } = useHomeContent();
  const [products, setProducts] = useState(shopProducts);
  useEffect(() => {
    const refresh = () => fetchProducts().then((items) => {
      const active = items.filter((item) => item.isActive);
      if (active.length) setProducts(active);
    });
    refresh();
    return subscribeToProducts(refresh, "home-shop-preview-live");
  }, []);
  return <section className="premium-card home-dashboard__shop p-5"><SectionHead eyebrow="Bull Puan mağazası" title="Puanlarını harca, ödülleri kazan!" action="Mağazaya Git" to="/magaza" /><div className="home-product-grid mt-5">{products.slice(0,4).map(product => {
    const image = product.imageKey ? images[product.imageKey] || product.image : product.image;
    const hasStockCount = Number.isFinite(product.stockCount);
    const stockLabel = hasStockCount ? product.stockCount > 0 ? `${product.stockCount} stok` : "Tükendi" : product.stock;
    const price = typeof product.price === "number" ? product.price.toLocaleString("tr-TR") : product.price;
    return <AuthenticatedLink to="/magaza" key={product.id || product.name} className="home-product"><div className="home-product__image"><img src={image} alt={product.name} loading="lazy" />{stockLabel ? <span className={`home-product__stock ${hasStockCount && product.stockCount <= 0 ? "is-empty" : ""}`}>{stockLabel}</span> : null}</div><div className="home-product__body"><p className="line-clamp-1 text-xs font-black text-white" title={product.name}>{product.name}</p><p className="mt-2 flex items-center gap-1 text-xs font-black text-bull-gold">{price} <Coins className="h-3 w-3" /></p></div></AuthenticatedLink>;
  })}</div></section>;
}

function MissionPreview() {
  const { progress, claimed, claimMission } = useMissions(); const subscription = useSubscription();
  const loyalty = useLoyalty();
  const { showToast } = useToast();
  const percentage = mission => Math.min(100, ((progress[mission.id] || 0) / (mission.target || 1)) * 100);
  const claim = async mission => { const result = await claimMission(mission); showToast(result.ok ? "Görev ödülün hesabına eklendi." : result.message, result.ok ? "success" : "error"); };
  return <section className="premium-card home-dashboard__missions p-5"><SectionHead eyebrow="Bugünün akışı" title="Günlük görevler" action="Tüm Görevler" to="/gorevler" /><div className="home-mission-list mt-5">{missions.slice(0,4).map(mission => { const value = percentage(mission); const done = claimed.includes(mission.id); const reward = getMissionReward(mission, loyalty.xp, subscription.hasFeature("bp_enabled")); return <article key={mission.id} className="home-mission"><p className="home-mission__title" title={mission.title}>{mission.title}</p><div className="home-mission__meta"><span>{progress[mission.id] || 0} / {mission.target}</span><div className="flex shrink-0 gap-1.5">{subscription.hasFeature("bp_enabled") ? <span className="home-reward home-reward--bp" title={reward.hasBonus ? "Sadakat seviyesi bonusu dahil" : undefined}>{reward.bp} BP</span> : null}<span className="home-reward home-reward--xp" title={reward.hasBonus ? "Sadakat seviyesi bonusu dahil" : undefined}>{reward.xp} XP</span></div></div><div className="home-mission__progress"><div style={{ width: `${value}%` }} /></div>{value === 100 ? <button type="button" disabled={done} onClick={() => claim(mission)} className={done ? "home-mission__done" : "home-mission__claim"}><Check className="h-3.5 w-3.5" /> {done ? "Tamamlandı" : "Ödülü Al"}</button> : null}</article>; })}</div></section>;
}

function LoyaltyPreview() {
  const loyalty = useLoyalty(); const start = loyalty.tier.min; const end = loyalty.nextTier?.min || Math.max(loyalty.xp, start + 1); const value = loyalty.nextTier ? Math.min(100, ((loyalty.xp - start) / (end - start)) * 100) : 100;
  return <section className="premium-card home-dashboard__loyalty p-5"><SectionHead eyebrow="Seviye yolculuğun" title="Sadakat seviyen" action="Detaylar" to="/sadakat" /><div className="home-loyalty-rank"><img src={tierBadge(loyalty.tier.name)} alt={`${loyalty.tier.name} rozeti`} /><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/38">Mevcut seviye</p><h3>{loyalty.tier.name}</h3><p>{loyalty.xp.toLocaleString("tr-TR")} XP</p></div></div><div className="mt-5"><div className="flex justify-between text-[10px] font-black uppercase text-white/38"><span>İlerleme</span><span>{Math.round(value)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full bg-gradient-to-r from-bull-neon to-bull-gold" style={{ width: `${value}%` }} /></div><p className="mt-2 text-xs text-white/45">{loyalty.nextTier ? `${loyalty.nextTier.name} için ${(loyalty.nextTier.min - loyalty.xp).toLocaleString("tr-TR")} XP kaldı.` : "En yüksek sadakat seviyesindesin."}</p></div><div className="mt-5 grid grid-cols-2 gap-2"><MiniStat icon={Sparkles} label="Toplam XP" value={loyalty.xp.toLocaleString("tr-TR")} /><MiniStat icon={Gift} label="Açılan ödül" value={loyalty.claimedTiers.length} /></div><Link to="/sadakat" className="secondary-button mt-5 w-full py-2.5 text-xs">Rütbeni Geliştir <ArrowRight className="h-4 w-4" /></Link></section>;
}
function tierBadge(name) { return `/duobull/ranks/${name === "Gümüş" ? "gumus" : name === "Altın" ? "altin" : name.toLocaleLowerCase("tr-TR")}.png`; }

function SectionHead({ eyebrow, title, action, to }) { return <div className="flex items-end justify-between gap-3"><div><p className="home-eyebrow">{eyebrow}</p><h2 className="mt-2 text-xl font-black uppercase italic leading-none text-white sm:text-2xl">{title}</h2></div>{action && to ? <Link to={to} className="shrink-0 text-[10px] font-black uppercase text-bull-neon">{action} <ArrowRight className="inline h-3.5 w-3.5" /></Link> : null}</div>; }
function MiniStat({ icon: Icon, label, value }) { return <div className="rounded-lg border border-white/10 bg-black/25 p-3"><Icon className="h-4 w-4 text-bull-neon" /><p className="mt-2 text-lg font-black text-white">{value}</p><p className="text-[9px] font-black uppercase tracking-wider text-white/35">{label}</p></div>; }
function TrustStrip() { return <section className="container-shell pb-5"><div className="home-trust-strip"><div><Trophy /><strong>Turnuvalar</strong><span>Rekabete açık platform</span></div><div><Users /><strong>Topluluk</strong><span>Takım ve arkadaşlık ağı</span></div><div><Gift /><strong>Ödüller</strong><span>Bull Puan mağazası</span></div><div><ShieldCheck /><strong>Adil oyun</strong><span>Güvenli topluluk deneyimi</span></div></div></section>; }
