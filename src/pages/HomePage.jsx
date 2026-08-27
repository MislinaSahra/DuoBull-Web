import { ChevronLeft, ChevronRight, Coins, Gift, MessageSquarePlus, MoreHorizontal, Send, Smile, Trophy, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import HeroSection from "../components/HeroSection.jsx";
import { brandAssets } from "../data/brandAssets.js";
import { categoryCards, loyaltyPerks, missions, platformStats, shopProducts, tournaments } from "../data/mockData.js";
import { useHomeContent } from "../context/HomeContentContext.jsx";
import AuthenticatedLink from "../components/AuthenticatedLink.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useMissions } from "../context/MissionContext.jsx";
import { useAdminOperations } from "../context/AdminOperationsContext.jsx";
import { useEngagement } from "../context/EngagementContext.jsx";
import { useLoyalty } from "../context/LoyaltyContext.jsx";
import { useSubscription } from "../context/SubscriptionContext.jsx";
import { fetchHomeSeo } from "../services/SeoContentService.js";
import HomePremiumContent from "../components/HomePremiumContent.jsx";

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  useEffect(() => { fetchHomeSeo().then((seo) => { if (!seo) return; document.title = seo.title; let meta = document.querySelector('meta[name="description"]'); if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta); } meta.content = seo.description; let keywords = document.querySelector('meta[name="keywords"]'); if (!keywords) { keywords = document.createElement("meta"); keywords.name = "keywords"; document.head.appendChild(keywords); } keywords.content = seo.keywords; }); }, []);
  return (
    <>
      <HeroSection />
      <HomePremiumContent />
      <section className="container-shell pb-8"><SocialProof /></section>
    </>
  );
}

function TournamentPromo() {
  const { featuredTournaments } = useAdminOperations();
  const tournament = featuredTournaments[0] || tournaments[0];
  return <AuthenticatedLink to="/turnuvalar" className="home-promo"><span className="home-promo__mark"><Trophy className="h-7 w-7" /></span><span><small>Dev sezon turnuvası</small><strong>{tournament?.name || "DuoBull Şampiyonlar Kupası"}</strong></span><span className="home-promo__meta"><small>Toplam ödül havuzu</small><strong>{tournament?.prize || "₺500.000"}</strong></span><span className="home-promo__cta">Hemen Kaydol <ChevronRight className="h-4 w-4" /></span></AuthenticatedLink>;
}

function QuickNav() {
  return (
    <div className="relative z-20 grid gap-2 rounded-xl border border-bull-neon/20 bg-[#081015]/92 p-3 shadow-neon backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {categoryCards.map((item) => (
        <Link key={item.title} to={item.to} className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 transition hover:-translate-y-0.5 hover:border-bull-neon/40 hover:bg-bull-neon/10">
          <span className="icon-tile h-11 w-11">
            <img src={brandAssets.icons[item.iconKey]} alt="" className="h-7 w-7 object-contain" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-bull-neon">{item.title}</span>
            <span className="mt-1 line-clamp-2 block text-xs leading-5 text-white/55">{item.description}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function ShowcaseRow() {
  const { images } = useHomeContent();
  const { featuredTournaments } = useAdminOperations();
  const leaderboard = [
    ["DuoBull_Thunder", "12.540"], ["DB_Assassin", "11.230"], ["VenomPlayz", "9.870"], ["GhostHunter", "8.420"], ["DuoMaster", "7.650"]
  ];

  return (
    <div className="mt-4 grid gap-3 xl:grid-cols-[1.14fr_.86fr_.48fr]">
      <Panel title="Yaklaşan Turnuvalar" action="Tümünü Gör" to="/turnuvalar">
        <div className="space-y-2">
          {featuredTournaments.slice(0, 3).map((item, index) => (
            <article key={item.name} className="group grid min-h-[92px] overflow-hidden rounded-md border border-white/10 bg-white/[0.025] sm:grid-cols-[150px_1fr_auto] sm:items-center">
              <div className="relative h-24 sm:h-full"><img src={images["tournaments-banner"] || brandAssets.backgrounds.tournaments} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover opacity-85" /><div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#081015]" /><span className="absolute left-2 top-2 rounded-sm bg-orange-600 px-2 py-1 text-[9px] font-black">{index === 0 ? "CANLI" : "YAKINDA"}</span></div>
              <div className="min-w-0 p-3"><h3 className="truncate text-sm font-black">{item.name}</h3><p className="mt-1 text-[10px] text-white/42">{item.game} • {item.date}</p><p className="mt-2 text-xs font-black text-bull-gold">Ödül Havuzu {item.prize}</p></div>
              <AuthenticatedLink to="/turnuvalar" className="primary-button mx-3 mb-3 px-5 py-2 text-[10px] sm:mb-0">Kaydol</AuthenticatedLink>
            </article>
          ))}
          {featuredTournaments.length === 0 ? <div className="rounded-lg border border-dashed border-white/15 p-6 text-center text-sm text-white/45">Öne çıkarılmış turnuva bulunmuyor.</div> : null}
        </div>
      </Panel>

      <Panel title="En İyi Oyuncular" action="Sıralamaları Gör" to="/topluluk-eslestirme">
        <div className="space-y-1.5">{leaderboard.map(([name, score], index) => <div key={name} className="grid grid-cols-[24px_1fr_90px_auto] items-center gap-2 rounded-md border border-white/[.075] bg-black/20 px-3 py-2.5"><span className="text-xs font-black text-bull-neon">{index + 1}</span><strong className="truncate text-xs">{name}</strong><span className="h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full bg-gradient-to-r from-bull-neon to-bull-gold" style={{width:`${100-index*13}%`}} /></span><span className="text-[10px] font-black text-white/60">{score}</span></div>)}</div>
      </Panel>

      <Panel title="Senin Rütben" to="/sadakat">
        <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center"><img src={brandAssets.icons.loyalty} alt="" className="h-24 w-24 object-contain"/><p className="mt-3 text-[10px] font-black uppercase tracking-[.16em] text-white/40">Sezon Sıralaması</p><p className="mt-1 text-4xl font-black italic text-bull-neon">#24</p><p className="mt-1 text-xs text-white/45">2.150 Puan</p><AuthenticatedLink to="/sadakat" className="primary-button mt-5 px-5 py-2 text-[10px]">Rütbeni Geliştir</AuthenticatedLink></div>
      </Panel>
    </div>
  );
}

function ProgressRow() {
  const { isAuthenticated } = useAuth();
  const { claimed, progress, claimMission } = useMissions();
  const subscription = useSubscription();
  const loyalty = useLoyalty();
  const navigate = useNavigate();
  const location = useLocation();
  const missionPercentage = (mission) => Math.min(100, ((progress[mission.id] || 0) / (mission.target || 1)) * 100);
  const loyaltyStart = loyalty.tier.min;
  const loyaltyEnd = loyalty.nextTier?.min || Math.max(loyalty.xp, loyaltyStart + 1);
  const loyaltyPercentage = loyalty.nextTier ? Math.min(100, ((loyalty.xp - loyaltyStart) / (loyaltyEnd - loyaltyStart)) * 100) : 100;

  const claim = (mission) => {
    if (!isAuthenticated) {
      navigate("/giris", { state: { from: `${location.pathname}#gorevler` } });
      return;
    }
    claimMission(mission);
  };

  return (
    <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[1.12fr_0.88fr]">
      <Panel title="Günlük Görevler" action="Tüm Görevler" to="/gorevler">
        <div className="space-y-2">
          {missions.map((mission) => (
            <div key={mission.title} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-2.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-white">{mission.title}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-bull-neon" style={{ width: `${missionPercentage(mission)}%` }} />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {subscription.hasFeature("bp_enabled") ? <span className="rounded-full border border-bull-gold/20 bg-bull-gold/10 px-2 py-1 text-[10px] font-black text-amber-200">{mission.bpReward} BP</span> : null}
                <span className="rounded-full border border-bull-neon/20 bg-bull-neon/10 px-2 py-1 text-[10px] font-black text-bull-neon">{mission.xpReward} XP</span>
              </div>
              {missionPercentage(mission) === 100 ? (
                <button type="button" onClick={() => claim(mission)} disabled={claimed.includes(mission.id)} className={claimed.includes(mission.id) ? "secondary-button cursor-not-allowed px-3 py-1.5 text-xs opacity-45" : "primary-button px-3 py-1.5 text-xs"}>
                  {claimed.includes(mission.id) ? "Ödül Alındı" : mission.action}
                </button>
              ) : <AuthenticatedLink to={mission.to} className="secondary-button px-3 py-1.5 text-xs">{mission.action}</AuthenticatedLink>}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Sadakat Seviyen" to="/sadakat">
        <div className="flex items-center gap-4">
          <img src={brandAssets.icons.loyalty} alt="" className="h-20 w-20 object-contain" />
          <div className="min-w-0 flex-1">
            <h3 className="text-2xl font-black text-white">{loyalty.tier.name}</h3>
            <p className="text-sm font-bold text-white/50">{loyalty.xp.toLocaleString("tr-TR")} / {loyalty.nextTier ? loyalty.nextTier.min.toLocaleString("tr-TR") : "MAX"} XP</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-bull-neon to-bull-gold" style={{ width: `${loyaltyPercentage}%` }} />
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
          {loyaltyPerks.map((perk) => {
            const Icon = perk.icon;
            return (
              <div key={perk.title} className="rounded-lg border border-white/10 bg-white/[0.035] p-2 text-center">
                <Icon className="mx-auto h-4 w-4 text-bull-gold" />
                <p className="mt-1 text-[11px] font-bold text-white/58">{perk.title}</p>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="min-w-0 lg:col-span-2">
      <Panel title="DuoBull Topluluğu Büyüyor!">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {platformStats.map((stat, index) => {
            const Icon = [Users, Trophy, Gift, Smile][index];
            return (
              <div key={stat.label} className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-center">
                <Icon className="mx-auto h-8 w-8 text-bull-neon" />
                <p className="mt-3 text-2xl font-black text-white">{stat.value}</p>
                <p className="mt-1 text-xs text-white/48">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </Panel>
      </div>
    </div>
  );
}

function LegacySocialProof() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { partners } = useHomeContent();
  const engagement = useEngagement();
  const [review, setReview] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (await engagement.addReview(user, review)) {
      setReview("");
      setReviewOpen(false);
      setReviewStatus("Yorumunuz incelendikten ve yönetici tarafından onaylandıktan sonra görünecektir.");
    }
  };
  const visible = engagement.reviews.slice(0, 4);
  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-[#081015]/92 p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.slice(0, 2).map((item) => (
            <Quote key={item.id} item={item} canDelete={isAdmin || item.authorId === user?.id} onRequestDelete={() => setDeleteCandidate(item)} />
          ))}
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-white">Partnerlerimiz</p>
          <div className="mt-3 flex flex-wrap justify-center gap-5 text-lg font-black text-white/70">
            {partners.map((partner) => <span key={partner.id}>{partner.name}</span>)}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.slice(2, 4).map((item) => (
            <Quote key={item.id} item={item} canDelete={isAdmin || item.authorId === user?.id} onRequestDelete={() => setDeleteCandidate(item)} />
          ))}
        </div>
      </div>
      {isAuthenticated ? (
        <div className="mt-4 flex justify-end border-t border-white/10 pt-4">
          <button type="button" onClick={() => setReviewOpen(true)} className="secondary-button px-4 py-2.5 text-xs">
            <MessageSquarePlus className="h-4 w-4" /> Deneyimini Paylaş
          </button>
        </div>
      ) : null}
      {reviewStatus ? <p className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.07] p-3 text-center text-xs font-bold text-emerald-200">{reviewStatus}</p> : null}

      {reviewOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Yorum ekle">
          <form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-bull-neon/30 bg-[#0d1419] p-5 shadow-[0_24px_80px_rgba(255,90,0,0.35)]">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-bull-neon">Topluluk Yorumu</p>
            <h3 className="mt-2 text-xl font-black text-white">Deneyimini paylaş</h3>
            <p className="mt-1 text-sm text-white/50">DuoBull deneyimini kısa ve samimi biçimde anlat.</p>
            <textarea autoFocus required minLength="5" maxLength="220" rows="5" value={review} onChange={(event) => setReview(event.target.value)} placeholder="Yorumunu buraya yaz..." className="mt-5 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-bull-neon" />
            <div className="mt-2 text-right text-xs text-white/35">{review.length}/220</div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setReviewOpen(false); setReview(""); }} className="secondary-button px-4 py-2.5 text-xs">Vazgeç</button>
              <button type="submit" className="primary-button px-4 py-2.5 text-xs"><Send className="h-4 w-4" /> Yorumu Yayınla</button>
            </div>
          </form>
        </div>
      ) : null}

      {deleteCandidate ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-label="Yorumu silme onayı">
          <div className="w-full max-w-md rounded-2xl border border-red-300/20 bg-[#0d1419] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <h3 className="text-xl font-black text-white">Yorumu silmek istiyor musun?</h3>
            <p className="mt-2 text-sm leading-6 text-white/55">Bu yorum kalıcı olarak kaldırılacak. Bu işlem geri alınamaz.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteCandidate(null)} className="secondary-button px-4 py-2.5 text-xs">Vazgeç</button>
              <button type="button" onClick={() => { engagement.deleteReview(deleteCandidate.id, user.email); setDeleteCandidate(null); }} className="rounded-lg border border-red-300/25 bg-red-500/15 px-4 py-2.5 text-xs font-black text-red-200 transition hover:bg-red-500/25">Evet, Yorumu Sil</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SocialProof() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { partners } = useHomeContent();
  const engagement = useEngagement();
  const rail = useRef(null);
  const [seoDescription, setSeoDescription] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [review, setReview] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [status, setStatus] = useState("");
  useEffect(() => { fetchHomeSeo().then((seo) => setSeoDescription(seo?.description || "")); }, []);
  const submit = async (event) => { event.preventDefault(); if (await engagement.addReview(user,review)) { setReview(""); setReviewOpen(false); setStatus("Yorumunuz incelendikten sonra yayınlanacaktır."); } };
  const slide = (direction) => rail.current?.scrollBy({ left: direction * Math.min(420,rail.current.clientWidth), behavior:"smooth" });
  const openReview = () => { if (!isAuthenticated) { window.dispatchEvent(new CustomEvent("duobull:focus-auth", { detail: { mode: "giris" } })); return; } setReviewOpen(true); };
  return <section className="mt-4 rounded-xl border border-white/10 bg-[#081015]/92 p-4"><div className="text-center"><p className="text-sm font-black text-white">Partnerlerimiz</p><div className="mt-3 flex flex-wrap justify-center gap-5 text-lg font-black text-white/70">{partners.map((partner)=><span key={partner.id}>{partner.name}</span>)}</div>{seoDescription?<p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-white/50">{seoDescription}</p>:null}</div><div className="mt-5 border-t border-white/10 pt-4"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-black">Topluluk deneyimleri</h3><div className="flex gap-2"><button type="button" onClick={()=>slide(-1)} className="secondary-button p-2" aria-label="Önceki yorumlar"><ChevronLeft className="h-4 w-4"/></button><button type="button" onClick={()=>slide(1)} className="secondary-button p-2" aria-label="Sonraki yorumlar"><ChevronRight className="h-4 w-4"/></button></div></div><div ref={rail} className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{engagement.reviews.map((item)=><div key={item.id} className="w-[280px] shrink-0 snap-start sm:w-[330px]"><Quote item={item} canDelete={isAdmin||item.authorId===user?.id} onRequestDelete={()=>setDeleteCandidate(item)}/></div>)}{engagement.reviews.length===0?<p className="w-full py-5 text-center text-xs text-white/40">Henüz yayınlanmış yorum yok.</p>:null}</div><div className="mt-4 flex justify-end"><button type="button" onClick={openReview} className="secondary-button px-4 py-2.5 text-xs"><MessageSquarePlus className="h-4 w-4"/> Deneyimini Paylaş</button></div>{status?<p className="mt-3 text-center text-xs font-bold text-emerald-200">{status}</p>:null}</div>{reviewOpen?<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"><form onSubmit={submit} className="glass-card w-full max-w-lg rounded-2xl p-5"><span className="section-kicker">Topluluk Yorumu</span><h3 className="mt-2 text-xl font-black">Deneyimini paylaş</h3><textarea autoFocus required minLength="5" maxLength="220" rows="5" value={review} onChange={(event)=>setReview(event.target.value)} className="mt-5 w-full rounded-xl border border-white/10 bg-black/30 p-4 text-white" placeholder="Yorumunu buraya yaz..."/><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={()=>setReviewOpen(false)} className="secondary-button px-4 py-2.5">Vazgeç</button><button className="primary-button px-4 py-2.5"><Send className="h-4 w-4"/> Gönder</button></div></form></div>:null}{deleteCandidate?<div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"><div className="glass-card w-full max-w-md rounded-2xl p-5"><h3 className="text-xl font-black">Yorumu silmek istiyor musun?</h3><p className="mt-2 text-sm text-white/55">Bu işlem geri alınamaz.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setDeleteCandidate(null)} className="secondary-button px-4 py-2.5">Vazgeç</button><button type="button" onClick={()=>{engagement.deleteReview(deleteCandidate.id,user.email);setDeleteCandidate(null);}} className="rounded-lg bg-red-500 px-4 py-2.5 text-sm font-black">Evet, Sil</button></div></div></div>:null}</section>;
}

function PublicCommunityStats() {
  return <Panel title="DuoBull Topluluğu Büyüyor!"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{platformStats.map((stat, index) => { const Icon = [Users, Trophy, Gift, Smile][index]; return <div key={stat.label} className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-center"><Icon className="mx-auto h-8 w-8 text-bull-neon" /><p className="mt-3 text-2xl font-black text-white">{stat.value}</p><p className="mt-1 text-xs text-white/48">{stat.label}</p></div>; })}</div></Panel>;
}

function Panel({ title, action, to, children }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#081015]/92 p-4 shadow-[0_0_24px_rgba(255,90,0,0.12)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-white">{title}</h2>
        {action && to ? (
          <Link to={to} className="text-xs font-black text-bull-neon">
            {action}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Quote({ item, canDelete, onRequestDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="relative flex min-h-24 items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-bull-neon/20 hover:bg-white/[0.045]">
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-xs leading-5 text-white/62">{item.quote}</p>
        <p className="mt-1 text-xs font-black text-white">- {item.name}</p>
      </div>
      {canDelete ? (
        <div className="relative shrink-0">
          <button onClick={() => setMenuOpen((current) => !current)} className="rounded-lg p-2 text-white/45 transition hover:bg-white/10 hover:text-white" type="button" aria-label="Yorum seçenekleri" aria-expanded={menuOpen}>
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-10 z-20 w-36 rounded-lg border border-white/10 bg-[#0d1419] p-1.5 shadow-2xl">
              <button type="button" onClick={() => { setMenuOpen(false); onRequestDelete(); }} className="w-full rounded-md px-3 py-2 text-left text-xs font-bold text-red-200 transition hover:bg-red-500/15">Yorumu Sil</button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
