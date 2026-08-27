import { useEffect, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { deletePlayerReview, fetchAllPlayerReviews, fetchReportedPlayerReviews } from "../services/PlayerReviewService.js";

export default function PlayerReviewModeration({ communityReviews = [], onDeleteCommunity }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("reports");
  const [reports, setReports] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [candidate, setCandidate] = useState(null);
  const refresh = async () => {
    const [nextReports, nextReviews] = await Promise.all([fetchReportedPlayerReviews(), fetchAllPlayerReviews()]);
    setReports(nextReports); setReviews(nextReviews);
  };
  useEffect(() => { refresh().catch(() => { setReports([]); setReviews([]); }); }, []);
  const items = tab === "reports" ? reports : tab === "community" ? communityReviews : reviews;
  const totalCount = reviews.length + communityReviews.length;
  return <section className="glass-card mt-6 rounded-2xl p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black">Oyuncu ve Topluluk Değerlendirmeleri</h2><p className="mt-1 text-xs text-white/45">Oyuncu değerlendirmelerini, şikâyetleri ve topluluk deneyimlerini yönetin.</p></div><button onClick={() => { setOpen(v => !v); refresh().catch(() => {}); }} className="primary-button px-4 py-2.5 text-xs">{open ? "Detayları Kapat" : `Detayları Aç (${totalCount})`}<ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}/></button></div>
    {open ? <><div className="mt-4 grid gap-2 sm:grid-cols-3"><button onClick={() => setTab("reports")} className={tab === "reports" ? "primary-button py-2.5 text-xs" : "secondary-button py-2.5 text-xs"}>Şikâyetler ({reports.length})</button><button onClick={() => setTab("all")} className={tab === "all" ? "primary-button py-2.5 text-xs" : "secondary-button py-2.5 text-xs"}>Oyuncu Değerlendirmeleri ({reviews.length})</button><button onClick={() => setTab("community")} className={tab === "community" ? "primary-button py-2.5 text-xs" : "secondary-button py-2.5 text-xs"}>Topluluk Deneyimleri ({communityReviews.length})</button></div><div className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto">{items.map(item => { const review = tab === "reports" ? item.player_reviews : item; const isCommunity = tab === "community"; return <article key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><strong>{isCommunity ? (item.name || item.authorName || item.author_name || "Oyuncu") : `${review?.reviewer?.username || "Oyuncu"} → ${review?.player?.username || "Oyuncu"}`}</strong><p className="mt-2 text-sm text-white/60">{isCommunity ? item.quote : (review?.comment || "Yazılı yorum yok.")}</p>{tab === "reports" ? <p className="mt-2 text-xs font-bold text-amber-200">Şikâyet: {item.reason}</p> : null}</div><button onClick={() => setCandidate(isCommunity ? { ...item, community: true } : review)} className="secondary-button border-red-300/20 px-3 py-2 text-xs text-red-200"><Trash2 className="h-4 w-4"/> Sil</button></div></article>; })}{!items.length ? <p className="py-5 text-center text-xs text-white/40">Kayıt bulunmuyor.</p> : null}</div></> : null}
    {candidate ? <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className="glass-card w-full max-w-md rounded-2xl p-6"><h3 className="text-xl font-black">Değerlendirme silinsin mi?</h3><p className="mt-3 text-sm text-white/55">Bu işlem geri alınamaz ve kayıt yayından kaldırılır.</p><div className="mt-6 grid grid-cols-2 gap-3"><button onClick={() => setCandidate(null)} className="secondary-button py-3">Vazgeç</button><button onClick={async () => { if (candidate.community) await onDeleteCommunity?.(candidate.id); else await deletePlayerReview(candidate.id); setCandidate(null); await refresh(); }} className="rounded-lg bg-red-500 py-3 font-black text-white">Evet, Sil</button></div></div></div> : null}
  </section>;
}
