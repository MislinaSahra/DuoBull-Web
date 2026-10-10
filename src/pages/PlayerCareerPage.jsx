import { ArrowLeft, BadgeCheck, Mic, MicOff, Star, Swords, ThumbsDown, ThumbsUp, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import { deletePlayerReview, fetchPlayerReviews, reportPlayerReview, savePlayerReview } from "../services/PlayerReviewService.js";
import { fetchPlayerStats } from "../services/ProfileFeatureService.js";
import { useSocial } from "../context/SocialContext.jsx";
import ErrorPage from "./ErrorPage.jsx";

export default function PlayerCareerPage() {
  const { id, slug } = useParams();
  const { user, isAdmin } = useAuth();
  const social = useSocial();
  const [player, setPlayer] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [action, setAction] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const refreshActivity = async (playerId = player?.id) => {
    if (!playerId) return;
    const [nextReviews, nextStats] = await Promise.all([fetchPlayerReviews(playerId).catch(() => []), fetchPlayerStats(playerId)]);
    setReviews(Array.isArray(nextReviews) ? nextReviews : []);
    setStats(nextStats);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let request = supabase.from("profiles").select("id,email,username,avatar_url,profile_banner_url,custom_slug,is_verified,game,player_role,rank,region,main_character,uses_microphone,play_hours,play_schedule,loyalty_xp");
      request = id ? request.eq("id", id) : request.eq("custom_slug", slug?.toLowerCase());
      const { data } = await request.maybeSingle();
      if (cancelled) return;
      setPlayer(data || false);
      if (data) await refreshActivity(data.id);
    };
    load();
    return () => { cancelled = true; };
  }, [id, slug]);

  const average = useMemo(() => ({
    game: reviews.length ? (reviews.reduce((sum, item) => sum + Number(item.rating), 0) / reviews.length).toFixed(1) : "-",
  }), [reviews]);

  if (player === null) return <ProfileSkeleton />;
  if (!player) return <ErrorPage status={404} />;
  const socialPlayer = { id: player.id, email: player.email, name: player.username, game: player.game, playerRole: player.player_role, rank: player.rank, region: player.region, avatar: player.avatar_url };
  const isFriend = social.friendEmails.includes(player.email);
  const pendingFriend = social.outgoingRequests.some((item) => item.toEmail === player.email) || social.incomingRequests.some((item) => item.fromEmail === player.email);

  return <section className="container-shell py-10">
    <Link to="/sosyal" className="secondary-button mb-5 inline-flex px-4 py-2.5"><ArrowLeft className="h-4 w-4" /> Sosyale Dön</Link>
    <div className="glass-card visitor-profile-card overflow-hidden rounded-2xl">
      <div className="relative overflow-hidden sm:aspect-[5/2]">
        {player.profile_banner_url ? <><img src={player.profile_banner_url} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-[#05090c]/85 via-[#0d1419]/45 to-[#05090c]/20" /><div className="absolute inset-0 bg-gradient-to-t from-[#05090c]/55 via-transparent to-black/10" /></> : null}
        <div className="relative z-10 min-h-[300px] p-6 sm:min-h-0 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><Avatar player={player} /><div><span className="section-kicker">Oyuncu Kariyer Profili</span><h1 className="mt-2 flex items-center gap-2 text-4xl font-black">{player.username}{player.is_verified ? <BadgeCheck className="h-7 w-7 fill-bull-neon/20 text-bull-neon" /> : null}</h1><p className="mt-2 text-white/50">{player.game} • {player.player_role} • {player.region}</p>{player.custom_slug ? <p className="mt-2 text-xs font-bold text-bull-neon">duobull.com/{player.custom_slug}</p> : null}</div></div>{user?.id !== player.id ? <div className="flex flex-wrap gap-2"><button type="button" disabled={isFriend || pendingFriend} onClick={async () => { const result = await social.sendFriendRequest(socialPlayer); setMessage(result.ok ? "Arkadaşlık isteği gönderildi." : result.message || "Arkadaşlık isteği gönderilemedi."); }} className="primary-button px-4 py-3 disabled:opacity-45"><UserPlus className="h-4 w-4" />{isFriend ? "Arkadaşın" : pendingFriend ? "İstek Bekliyor" : "Arkadaş Ekle"}</button><button type="button" onClick={() => setReviewOpen(true)} className="secondary-button px-4 py-3"><Star className="h-4 w-4" /> Oyuncuyu Değerlendir</button></div> : null}</div>
        </div>
      </div>
      <div className="p-6 sm:p-8">
        <CareerGrid player={player} avg={average} />
        <Stats stats={stats} />
        <div className="mt-8 border-t border-white/10 pt-6"><h2 className="text-xl font-black">Birlikte oynayanların değerlendirmeleri ({reviews.length})</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{reviews.map((item) => <ReviewCard key={item.id} item={item} canDelete={isAdmin || item.reviewer_id === user?.id} canReport={item.player_id === user?.id && item.reviewer_id !== user?.id} onDelete={() => setAction({ type: "delete", item })} onReport={() => setAction({ type: "report", item })} />)}{!reviews.length ? <p className="text-sm text-white/40">Henüz değerlendirme yok.</p> : null}</div></div>
        {message ? <p className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm font-bold">{message}</p> : null}
      </div>
    </div>
    {action ? <ActionConfirm action={action} close={() => setAction(null)} done={() => refreshActivity(player.id)} /> : null}
    {reviewOpen ? <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setReviewOpen(false)}><form onSubmit={async (event) => { event.preventDefault(); const result = await savePlayerReview(player.id, rating, rating, comment); setMessage(result.ok ? "Değerlendirmen kaydedildi." : result.message); if (result.ok) { setComment(""); setReviewOpen(false); await refreshActivity(player.id); } }} className="glass-card relative grid w-full max-w-xl gap-4 rounded-2xl p-6"><button type="button" onClick={() => setReviewOpen(false)} className="absolute right-4 top-4 secondary-button p-2"><X className="h-4 w-4" /></button><span className="section-kicker">Oyuncu Değerlendirmesi</span><h2 className="text-2xl font-black">{player.username} oyuncusunu değerlendir</h2><p className="text-sm text-white/50">Birlikte oynama deneyimine göre tek bir toplam puan ver.</p><Score label="Toplam değerlendirme puanı" value={rating} setValue={setRating} /><textarea required minLength="5" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Birlikte oynama deneyimini yaz..." className="min-h-28 rounded-lg border border-white/10 bg-black/30 p-3 text-white" /><button className="primary-button py-3"><Star className="h-4 w-4" /> Değerlendirmeyi Gönder</button></form></div> : null}
  </section>;
}

function ProfileSkeleton(){return <section className="container-shell py-10"><div className="glass-card animate-pulse rounded-2xl p-8"><div className="h-28 w-28 rounded-2xl bg-white/5"/><div className="mt-8 grid gap-3 sm:grid-cols-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-24 rounded-xl bg-white/5"/>)}</div></div></section>}
function Avatar({ player }) { return <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-bull-neon/15 text-3xl font-black">{player.avatar_url ? <img src={player.avatar_url} alt="" className="h-full w-full object-cover" /> : player.username?.slice(0, 2).toUpperCase()}</div>; }
function Stats({ stats }) { if (!stats) return null; return <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={Swords} label="Tamamlanan eşleşme" value={stats.match_count || 0} /><Stat icon={Star} label="Toplam değerlendirme" value={stats.review_count || 0} /><Stat icon={ThumbsUp} label="Olumlu" value={stats.positive_count || 0} tone="text-emerald-300" /><Stat icon={ThumbsDown} label="Olumsuz" value={stats.negative_count || 0} tone="text-red-300" /></div>; }
function Stat({ icon: Icon, label, value, tone = "text-bull-neon" }) { return <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-4"><Icon className={`h-5 w-5 ${tone}`} /><strong className="mt-3 block text-2xl font-black">{value}</strong><span className="mt-1 block text-[10px] font-black uppercase text-white/35">{label}</span></div>; }
function ReviewCard({ item, canDelete, canReport, onDelete, onReport }) { return <article className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex justify-between gap-3"><strong>{item.profiles?.username || "Oyuncu"}</strong><span className="text-xs font-black text-amber-200">★ {item.rating}/5</span></div>{item.comment ? <p className="mt-3 text-sm leading-6 text-white/60">{item.comment}</p> : null}<div className="mt-3 flex gap-2">{canDelete ? <button onClick={onDelete} className="text-xs font-black text-red-200">Sil</button> : null}{canReport ? <button onClick={onReport} className="text-xs font-black text-amber-200">Şikayet Et</button> : null}</div></article>; }
function ActionConfirm({ action, close, done }) { const [reason, setReason] = useState("Uygunsuz değerlendirme"); const isDelete = action.type === "delete"; return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className="glass-card w-full max-w-md rounded-2xl p-6"><h3 className="text-xl font-black">{isDelete ? "Değerlendirmeyi silmek istiyor musun?" : "Değerlendirme şikayet edilsin mi?"}</h3>{!isDelete ? <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="mt-4 min-h-20 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white" /> : null}<div className="mt-6 grid grid-cols-2 gap-3"><button onClick={close} className="secondary-button py-3">Vazgeç</button><button onClick={async () => { const result = isDelete ? await deletePlayerReview(action.item.id) : await reportPlayerReview(action.item.id, reason); if (result.ok) { close(); done(); } }} className={isDelete ? "rounded-lg bg-red-500 py-3 font-black text-white" : "primary-button py-3"}>{isDelete ? "Evet, Sil" : "Şikayet Et"}</button></div></div></div>; }
export function CareerGrid({ player, avg }) { return <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Info label="Rank / seviye" value={player.rank || "Belirtilmedi"} /><Info label="Ana ajan / karakter" value={player.main_character || player.mainCharacter || "Belirtilmedi"} /><Info label="Mikrofon" value={(player.uses_microphone ?? player.usesMicrophone) ? "Kullanıyor" : "Kullanmıyor"} icon={(player.uses_microphone ?? player.usesMicrophone) ? Mic : MicOff} /><Info label="Toplam oyun saati" value={player.play_hours || player.playHours || "Belirtilmedi"} /><Info label="Genellikle oynadığı saatler" value={player.play_schedule || player.playSchedule || "Belirtilmedi"} /><Info label="Toplam değerlendirme puanı" value={`${avg?.game || "-"}/5`} /></div>; }
function Info({ label, value, icon: Icon }) { return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">{Icon ? <Icon className="h-5 w-5 text-bull-neon" /> : null}<p className="mt-2 text-[10px] font-black uppercase text-white/35">{label}</p><p className="mt-1 font-bold">{value}</p></div>; }
function Score({ label, value, setValue }) { return <label className="text-xs font-bold text-white/60">{label}<select value={value} onChange={(e) => setValue(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0a0711] p-3 text-white">{[5, 4, 3, 2, 1].map((number) => <option key={number}>{number}</option>)}</select></label>; }
