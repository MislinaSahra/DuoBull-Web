import { BadgeCheck, Gamepad2, Mic, Star, Swords, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero.jsx";
import { fetchPlayerLeaderboard } from "../services/ProfileFeatureService.js";

export default function CommunityRankingPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    fetchPlayerLeaderboard(1000)
      .then((data) => {
        if (!active) return;
        setPlayers(data || []);
        setLoading(false);
      }).catch((error)=>{if(active){console.error("Oyuncular yüklenemedi:",error.message);setPlayers([]);setLoading(false);}});
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    return normalized ? players.filter((player) => player.username.toLocaleLowerCase("tr-TR").includes(normalized)) : players;
  }, [players, query]);

  return <><PageHero kicker="Topluluk eşleştirme" eyebrow="Tüm oyuncular" title="DuoBull oyuncu sıralaması" description="DuoBull oyuncularını kariyer bilgileri ve sadakat puanlarına göre keşfet." backgroundKey="community" iconKey="community" />
    <section className="container-shell pb-16">
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between"><div><span className="section-kicker">Topluluk ligi</span><h2 className="mt-2 text-2xl font-black">Tüm oyuncular</h2><p className="mt-2 text-sm text-white/45">Aktif oyuncuların tamamı sıralamada yer alır; onaylı hesaplar rozetle belirtilir.</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Oyuncu ara..." className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-bull-neon sm:max-w-xs" /></div>
        {loading ? <div className="grid gap-3 py-6"><div className="h-24 animate-pulse rounded-xl bg-white/5" /><div className="h-24 animate-pulse rounded-xl bg-white/5" /></div> : <div className="mt-5 space-y-3">{visible.map((player) => { const position = players.findIndex((item) => item.id === player.id) + 1; return <Link key={player.id} to={`/oyuncu/${player.id}`} className="group grid gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-bull-neon/35 hover:bg-bull-neon/[0.05] sm:grid-cols-[64px_1fr_auto] sm:items-center"><div className={`flex h-14 w-14 items-center justify-center rounded-xl text-xl font-black ${position <= 3 ? "bg-amber-300/15 text-amber-200" : "bg-white/5 text-white/45"}`}>#{position}</div><div className="flex min-w-0 items-center gap-3">{player.avatar_url ? <img src={player.avatar_url} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bull-neon/15 font-black text-bull-neon">{player.username.slice(0,2).toUpperCase()}</div>}<div className="min-w-0"><h3 className="flex items-center gap-1.5 truncate text-lg font-black">{player.username}{player.is_verified ? <BadgeCheck className="h-4 w-4 fill-bull-neon/20 text-bull-neon" /> : null}</h3><p className="mt-1 text-xs text-white/45">{player.game} • {player.player_role} • {player.rank || "Rank belirtilmedi"}</p><div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold text-white/50">{player.main_character ? <span className="inline-flex items-center gap-1"><Gamepad2 className="h-3 w-3" /> {player.main_character}</span> : null}{player.uses_microphone ? <span className="inline-flex items-center gap-1"><Mic className="h-3 w-3" /> Mikrofon</span> : null}</div></div></div><div className="flex items-center gap-2 rounded-lg border border-bull-neon/20 bg-bull-neon/10 px-4 py-3"><Trophy className="h-4 w-4 text-bull-neon" /><div><p className="text-lg font-black">{Number(player.loyalty_xp || 0).toLocaleString("tr-TR")}</p><p className="text-[9px] font-black uppercase tracking-wider text-white/35">{player.matchCount} eşleşme • Sadakat XP</p></div></div></Link>; })}{!visible.length ? <p className="py-12 text-center text-sm text-white/40">Listelenecek oyuncu bulunamadı.</p> : null}</div>}
      </div>
    </section></>;
}
