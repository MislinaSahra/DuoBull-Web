import { BadgeCheck, CalendarDays, ChevronRight, Edit3, Gamepad2, Link2, MapPin, Share2, ShieldCheck, Star, Swords, ThumbsDown, ThumbsUp, UserRoundCog } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ProfileControlPanel from "../components/ProfileControlPanel.jsx";
import ProfileEditModal from "../components/ProfileEditModal.jsx";
import ReferralCard from "../components/ReferralCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLoyalty } from "../context/LoyaltyContext.jsx";
import { useMissions } from "../context/MissionContext.jsx";
import { fetchPlayerReviews, reportPlayerReview } from "../services/PlayerReviewService.js";
import { fetchMyVerificationRequest, fetchPlayerStats, requestProfileVerification } from "../services/ProfileFeatureService.js";
import { CareerGrid } from "./PlayerCareerPage.jsx";
import { brandAssets } from "../data/brandAssets.js";
import { useToast } from "../context/ToastContext.jsx";

export default function ProfilePage() {
  const { user } = useAuth();
  const loyalty = useLoyalty();
  const missions = useMissions();
  const { showToast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [verification, setVerification] = useState(null);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationConfirm, setVerificationConfirm] = useState(false);
  const [verificationStats, setVerificationStats] = useState(null);
  const [verificationForm, setVerificationForm] = useState({ motivation: "", profileLink: "", accepted: false });
  const [profileModule, setProfileModule] = useState("career");
  useEffect(() => { if (!user.isVerified) { fetchMyVerificationRequest().then(setVerification); fetchPlayerStats(user.id).then(setVerificationStats); } }, [user.id, user.isVerified]);

  return <>
    <section className="profile-hero"><div className="container-shell"><span className="section-kicker">Oyuncu profili</span><h1>{user.name}, <strong>kontrol sende.</strong></h1><p>Profilini, kariyer bilgilerini, takımlarını ve turnuvalarını tek merkezden yönet.</p></div></section>
    <section className="container-shell profile-dashboard pb-16">
      <div className="profile-identity-card">
        <div className="profile-identity-banner"><img src={user.profileBanner || brandAssets.backgrounds.team} alt="Kişisel profil bannerı" /></div>
        <div className="relative z-10 p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              {user.avatar ? <img src={user.avatar} alt="" className="profile-avatar" /> : <div className="profile-avatar profile-avatar--empty">{user.name.slice(0, 2).toUpperCase()}</div>}
              <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-black">{user.name}</h2>{user.isVerified ? <BadgeCheck className="h-5 w-5 fill-bull-neon/20 text-bull-neon" /> : null}<span className="rounded-full border border-bull-neon/25 bg-bull-neon/10 px-2.5 py-1 text-[10px] font-black text-bull-neon">{loyalty.tier.name} • {loyalty.xp.toLocaleString("tr-TR")} XP</span><span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black text-amber-200">{Number(missions.balance||0).toLocaleString("tr-TR")} BP</span></div><p className="mt-1 text-sm text-white/45">{user.email}</p><p className="mt-2 text-sm text-white/55">{user.bio || "Oyuncu henüz profil açıklaması eklemedi."}</p>
                {!user.isVerified ? <button disabled={verification?.status === "pending"} onClick={() => { setVerificationConfirm(true); setTimeout(() => document.getElementById("verification-application")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); }} className="mt-3 text-xs font-black text-bull-neon disabled:text-white/35">{verification?.status === "pending" ? "Onaylı hesap başvurusu beklemede" : "Onaylı Hesap Başvurusu Yap"}</button> : <p className="mt-3 inline-flex items-center gap-1 rounded-full border border-bull-neon/25 bg-bull-neon/10 px-3 py-1 text-[10px] font-black text-bull-neon"><BadgeCheck className="h-3.5 w-3.5"/> Onaylı hesabın aktif</p>}
                {verificationMessage ? <p className="mt-2 text-xs text-white/50">{verificationMessage}</p> : null}
              </div>
            </div>
            <div className="profile-identity-actions sm:ml-auto"><button onClick={() => { setEditOpen(true); setTimeout(() => document.getElementById("profile-edit-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }} className="primary-button"><Edit3 className="h-4 w-4" /> Profili Düzenle</button><button type="button" onClick={async () => { const url = `${window.location.origin}/oyuncu/${user.id}`; try { await navigator.clipboard.writeText(url); } catch { const field=document.createElement("textarea"); field.value=url; document.body.appendChild(field); field.select(); document.execCommand("copy"); field.remove(); } showToast("Profil bağlantısı kopyalandı."); }} className="secondary-button"><Share2 className="h-4 w-4" /> Profili Paylaş</button></div>
          </div>
          <div className="mt-5 grid gap-2 border-t border-white/10 pt-5 sm:grid-cols-4"><Info icon={Gamepad2} label="Ana oyun" value={user.game} /><Info icon={ShieldCheck} label="Rol" value={user.playerRole} /><Info icon={MapPin} label="Bölge" value={user.region} /><Info icon={CalendarDays} label="Üyelik" value={new Date(user.joinedAt).toLocaleDateString("tr-TR")} /></div>
        </div>
      </div>
      {editOpen ? <ProfileEditModal embedded onClose={() => setEditOpen(false)} /> : null}
      {verificationConfirm ? <VerificationApplication stats={verificationStats} value={verificationForm} setValue={setVerificationForm} onClose={()=>setVerificationConfirm(false)} onSent={async()=>{const result=await requestProfileVerification(verificationForm);setVerificationMessage(result.ok?"Onaylı hesap başvurun yöneticilere gönderildi.":result.message);if(result.ok){setVerificationConfirm(false);fetchMyVerificationRequest().then(setVerification);}}}/> : null}
      <nav className="profile-module-grid" aria-label="Profil bölümleri">
        <ProfileModule icon={Link2} title="Referans programı" text="Arkadaşını davet et, BP kazan." active={profileModule === "referral"} onClick={() => setProfileModule("referral")} />
        <ProfileModule icon={Swords} title="Kariyer kartım" text="Oyun bilgilerini ve değerlendirmelerini gör." active={profileModule === "career"} onClick={() => setProfileModule("career")} />
        <ProfileModule icon={UserRoundCog} title="Oyuncu kontrol paneli" text="Takım, turnuva, sipariş ve güvenliği yönet." active={profileModule === "control"} onClick={() => setProfileModule("control")} />
      </nav>
      <div className="profile-module-content">{profileModule === "referral" ? <ReferralCard /> : null}{profileModule === "career" ? <OwnCareer user={user} /> : null}{profileModule === "control" ? <ProfileControlPanel /> : null}</div>
    </section>
  </>;
}

function VerificationApplication({stats,value,setValue,onClose,onSent}) {
  const matches=Number(stats?.match_count||0); const rating=Number(stats?.average_rating||0); const eligible=matches>=5&&rating>=3.5;
  return <section id="verification-application" className="profile-verification-form"><div><span className="section-kicker">Hesap doğrulama başvurusu</span><h2>Onaylı hesap rozeti başvurusu</h2><p>Rozet, düzenli oynayan ve olumlu değerlendirme geçmişi bulunan oyunculara yönetici incelemesiyle verilir.</p></div><div className="profile-verification-form__details"><p><span>DuoBull Eşleşmesi</span><strong>{matches} / 5</strong><small>Takım Bul üzerinden tamamlanıp yönetici tarafından doğrulanan maçlar.</small></p><p><span>Toplam değerlendirme puanı</span><strong>{rating.toFixed(1)} / 5</strong><small>Birlikte oynadığın kişilerin verdiği genel değerlendirme.</small></p></div><div className="mt-5 grid gap-4"><label className="text-xs font-bold text-white/60">Neden onaylı hesap rozeti istiyorsun?<textarea minLength={40} required value={value.motivation} onChange={e=>setValue(v=>({...v,motivation:e.target.value}))} className="mt-2 min-h-28 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white" placeholder="Topluluktaki geçmişini ve rozeti neden istediğini anlat..."/></label><label className="text-xs font-bold text-white/60">Oyun veya sosyal profil bağlantısı (isteğe bağlı)<input value={value.profileLink} onChange={e=>setValue(v=>({...v,profileLink:e.target.value}))} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white" placeholder="https://..."/></label><label className="flex items-start gap-3 rounded-lg border border-white/10 p-3 text-xs text-white/55"><input type="checkbox" checked={value.accepted} onChange={e=>setValue(v=>({...v,accepted:e.target.checked}))}/><span>DuoBull Eşleşmesi ve değerlendirme geçmişimin yöneticiler tarafından incelenmesini kabul ediyorum.</span></label>{!eligible?<p className="rounded-lg border border-amber-300/20 bg-amber-400/10 p-3 text-xs font-bold text-amber-100">Başvuru için en az 5 DuoBull Eşleşmesi ve 3,5 üzeri toplam değerlendirme puanı gerekir.</p>:null}</div><div className="profile-verification-form__actions"><button type="button" onClick={onClose} className="secondary-button">Vazgeç</button><button type="button" disabled={!eligible||!value.accepted||value.motivation.trim().length<40} onClick={onSent} className="primary-button disabled:opacity-40"><BadgeCheck className="h-4 w-4"/> Başvuruyu Gönder</button></div></section>;
}

function ProfileModule({ icon: Icon, title, text, active, onClick }) { return <button type="button" onClick={onClick} className={active ? "is-active" : ""}><span><Icon /></span><div><strong>{title}</strong><small>{text}</small></div><ChevronRight /></button>; }

function OwnCareer({ user }) {
  const [reviews, setReviews] = useState([]); const [stats, setStats] = useState(null); const [reporting, setReporting] = useState(null); const [reason, setReason] = useState("Uygunsuz değerlendirme"); const [message, setMessage] = useState("");
  useEffect(() => { fetchPlayerReviews(user.id).then(setReviews).catch(() => setReviews([])); fetchPlayerStats(user.id).then(setStats); }, [user.id]);
  const avg = useMemo(() => ({ game: reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "-", sport: reviews.length ? (reviews.reduce((s, r) => s + r.sportsmanship, 0) / reviews.length).toFixed(1) : "-" }), [reviews]);
  return <section className="glass-card profile-career mt-4 rounded-xl p-5 sm:p-6"><div><span className="section-kicker">Kariyer kartım</span><h2 className="mt-2 text-2xl font-black">Oyuncu kariyer bilgileri</h2></div><CareerGrid player={user} avg={avg} />
    {stats ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><CareerStat icon={Swords} label="Tamamlanan eşleşme" value={stats.match_count || 0} /><CareerStat icon={Star} label="Toplam değerlendirme" value={stats.review_count || 0} /><CareerStat icon={ThumbsUp} label="Olumlu" value={stats.positive_count || 0} tone="emerald" /><CareerStat icon={ThumbsDown} label="Olumsuz" value={stats.negative_count || 0} tone="red" /></div> : null}
    <div className="mt-6 border-t border-white/10 pt-5"><h3 className="font-black">Birlikte oynayanlardan aldığın değerlendirmeler ({reviews.length})</h3><div className="mt-3 grid gap-3 md:grid-cols-2">{reviews.map(item => <article key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex justify-between gap-3"><strong>{item.profiles?.username || "Oyuncu"}</strong><span className="text-xs font-black text-amber-200">★ {item.rating}/5 • Davranış {item.sportsmanship}/5</span></div>{item.comment ? <p className="mt-2 text-sm text-white/60">{item.comment}</p> : null}<button type="button" onClick={() => { setReporting(item); setReason("Uygunsuz değerlendirme"); setMessage(""); }} className="secondary-button mt-4 border-amber-300/20 px-3 py-2 text-xs text-amber-200">Şikâyet Et</button></article>)}{!reviews.length ? <p className="text-sm text-white/40">Henüz değerlendirme yok.</p> : null}</div>{message ? <p className="mt-3 text-xs font-bold text-emerald-200">{message}</p> : null}</div>
    {reporting ? <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className="glass-card w-full max-w-md rounded-2xl p-6"><h3 className="text-xl font-black">Değerlendirme şikâyet edilsin mi?</h3><textarea value={reason} onChange={event => setReason(event.target.value)} className="mt-4 min-h-24 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white outline-none" /><div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={() => setReporting(null)} className="secondary-button py-3">Vazgeç</button><button type="button" onClick={async () => { const result = await reportPlayerReview(reporting.id, reason); if (result.ok) { setReporting(null); setMessage("Değerlendirme adminlere bildirildi."); } else setMessage(result.message); }} className="primary-button py-3">Şikâyet Et</button></div></div></div> : null}
  </section>;
}
function CareerStat({ icon: Icon, label, value, tone = "purple" }) { const color = tone === "emerald" ? "text-emerald-300" : tone === "red" ? "text-red-300" : "text-bull-neon"; return <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.045] to-transparent p-4"><Icon className={`h-5 w-5 ${color}`} /><p className="mt-3 text-2xl font-black">{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-wider text-white/35">{label}</p></div>; }
function Info({ icon: Icon, label, value }) { return <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3"><Icon className="h-4 w-4 text-bull-neon" /><div><p className="text-[10px] font-black uppercase text-white/35">{label}</p><p className="text-sm font-bold text-white/75">{value}</p></div></div>; }
