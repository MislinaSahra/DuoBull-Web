import { CalendarDays, ChevronLeft, ChevronRight, Gamepad2, ListChecks, RotateCcw, Search, SlidersHorizontal, Trophy, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { brandAssets } from "../data/brandAssets.js";
import { useAdminOperations } from "../context/AdminOperationsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { useGameCatalog } from "../context/GameCatalogContext.jsx";

export default function TournamentSection() {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [publishedTournaments, setPublishedTournaments] = useState([]);
  const [filters, setFilters] = useState({ search: "", game: "Tümü", date: "", region: "Tümü", mode: "Tümü", fee: "Tümü" });
  const operations = useAdminOperations();
  const { user } = useAuth();
  const { gameNames } = useGameCatalog();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    operations.fetchPublishedTournaments().then((records) => {
      if (active) setPublishedTournaments(records.map((item) => toPublicTournament(item, operations.tournamentApplications)));
    });
    return () => { active = false; };
  }, [operations.tournamentDrafts]);

  const visibleTournaments = useMemo(() => publishedTournaments.filter((item) => {
    const search = filters.search.trim().toLocaleLowerCase("tr-TR");
    return (!search || `${item.name} ${item.game}`.toLocaleLowerCase("tr-TR").includes(search)) && (filters.game === "Tümü" || item.game === filters.game) && (!filters.date || item.rawDate === filters.date) && (filters.region === "Tümü" || item.region === filters.region) && (filters.mode === "Tümü" || item.gameMode === filters.mode) && (filters.fee === "Tümü" || (filters.fee === "Ücretsiz" ? !item.entryFee : item.entryFee > 0));
  }), [publishedTournaments, filters]);
  const totalPrize = visibleTournaments.reduce((sum, item) => sum + Number(String(item.prize).replace(/[^\d]/g, "")), 0);
  const finalsThisWeek = visibleTournaments.filter((item) => {
    const date = parseTournamentDate(item.date);
    const days = (date - new Date()) / 86400000;
    return days >= 0 && days <= 7;
  }).length;
  const userApplications = operations.tournamentApplications.filter((item) => item.userId === user?.id || item.userEmail === user?.email);
  const approvedCount = userApplications.filter((item) => item.status === "approved").length;
  const pendingCount = userApplications.filter((item) => item.status === "pending").length;
  const ownedCount = operations.publishedTournaments.filter((item) => item.ownerId === user?.id || item.ownerEmail === user?.email).length;
  return (
    <section id="turnuvalar" className="container-shell tournament-hub py-8">
      <aside className="tournament-filter-panel">
        <div className="flex items-center gap-3"><span className="icon-tile"><SlidersHorizontal className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-widest text-white/35">Filtre paneli</p><h2 className="text-xl font-black">Turnuva kriterleri</h2></div></div>
        <label className="tournament-filter-field"><span>Arama</span><div><Search /><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Turnuva adı veya oyun" /></div></label>
        <label className="tournament-filter-field"><span>Oyun seçimi</span><select value={filters.game} onChange={(event) => setFilters((current) => ({ ...current, game: event.target.value }))}><option>Tümü</option>{gameNames.map((game) => <option key={game}>{game}</option>)}</select></label>
        <label className="tournament-filter-field"><span>Başlangıç tarihi</span><input type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} /></label>
        <label className="tournament-filter-field"><span>Bölge</span><select value={filters.region} onChange={(event) => setFilters((current) => ({ ...current, region: event.target.value }))}><option>Tümü</option>{[...new Set(publishedTournaments.map(item=>item.region).filter(Boolean))].map(value=><option key={value}>{value}</option>)}</select></label>
        <label className="tournament-filter-field"><span>Oyun modu</span><select value={filters.mode} onChange={(event) => setFilters((current) => ({ ...current, mode: event.target.value }))}><option>Tümü</option>{[...new Set(publishedTournaments.map(item=>item.gameMode).filter(Boolean))].map(value=><option key={value}>{value}</option>)}</select></label>
        <label className="tournament-filter-field"><span>Katılım</span><select value={filters.fee} onChange={(event) => setFilters((current) => ({ ...current, fee: event.target.value }))}><option>Tümü</option><option>Ücretsiz</option><option>Ücretli</option></select></label>
        <button type="button" className="primary-button mt-5 w-full" onClick={() => setFilters((current) => ({ ...current }))}>Filtrele</button>
        <button type="button" className="secondary-button mt-2 w-full" onClick={() => setFilters({ search: "", game: "Tümü", date: "", region: "Tümü", mode: "Tümü", fee: "Tümü" })}><RotateCcw className="h-4 w-4" /> Sıfırla</button>
      </aside>

      <main className="tournament-list-panel">
          <div className="tournament-list-heading"><div><span className="section-kicker">Öne çıkan turnuvalar</span><h2 className="text-2xl font-black italic">Açık turnuvalar</h2><p>{visibleTournaments.length} turnuva kriterlerinle eşleşiyor.</p></div><button type="button" onClick={() => setCalendarOpen(true)} className="secondary-button"><CalendarDays className="h-4 w-4" /> Takvim</button></div>
          <div className="tournament-rows">
            {visibleTournaments.map((tournament) => (
              <article key={tournament.id || tournament.name} className="tournament-row">
                <div className="tournament-row__art">
                  <img src={brandAssets.backgrounds.tournaments} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/85 to-transparent" />
                  <div className="absolute left-2 top-2"><span className={`inline-flex rounded px-2 py-1 text-[9px] font-black ${statusClass[tournament.status]}`}>
                      {tournament.status}
                    </span></div>
                </div>
                <div className="tournament-row__identity"><h3>{tournament.name}</h3><p><Gamepad2 />{tournament.game}</p><small><CalendarDays />{tournament.date}</small></div>
                <div className="tournament-row__stat"><span>Ödül havuzu</span><strong>{tournament.prize}</strong></div>
                <div className="tournament-row__stat"><span>Katılım</span><strong>{tournament.participants}</strong></div>
                <div className="tournament-row__actions"><button type="button" className="primary-button" onClick={() => navigate(`/turnuvalar/${tournament.id}?katil=1`)}>Katıl</button><button type="button" className="secondary-button" onClick={() => navigate(`/turnuvalar/${tournament.id}`)}>Detaylar</button></div>
              </article>
            ))}
            {!visibleTournaments.length ? <div className="tournament-empty"><Trophy /><h3>Gösterilecek turnuva bulunamadı.</h3><p>Filtreleri sıfırlayabilir veya yeni turnuvaların yayınlanmasını bekleyebilirsin.</p></div> : null}
          </div>
      </main>

      <aside className="tournament-side-column"><section className="tournament-season"><div className="flex items-center justify-between"><h3>Sezon özeti</h3><span>Canlı</span></div><img src={brandAssets.icons.tournament} alt="" /><div className="tournament-season__rank"><small>Mevcut rankın</small><strong>{user?.rank || "Belirtilmedi"}</strong></div><div className="tournament-season__stats"><SideStat label="Açık kayıt" value={visibleTournaments.length} /><SideStat label="Toplam ödül" value={`₺${totalPrize.toLocaleString("tr-TR")}`} /><SideStat label="Onaylı katılım" value={approvedCount} /><SideStat label="Bekleyen başvuru" value={pendingCount} /><SideStat label="Düzenlediğin" value={ownedCount} /><SideStat label="Bu hafta" value={finalsThisWeek} /></div></section><section className="tournament-calendar-card"><CalendarDays /><div><h3>Turnuva takvimi</h3><p>Yaklaşan turnuvaları tarih görünümünde incele.</p></div><button type="button" onClick={() => setCalendarOpen(true)} className="secondary-button">Takvimi Gör</button></section></aside>
      {calendarOpen ? <TournamentCalendar tournaments={visibleTournaments} onClose={() => setCalendarOpen(false)} onSelect={(tournament) => { setCalendarOpen(false); navigate(`/turnuvalar/${tournament.id}`); }} /> : null}
    </section>
  );
}

function toPublicTournament(tournament, applications = []) {
  const date = new Date(`${tournament.date}T12:00:00`);
  const participantCount = applications.filter((item) => item.status === "approved" && (item.tournamentId === tournament.id || item.tournamentName === tournament.name)).length;
  return { ...tournament, rawDate: tournament.date, date: `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`, participants: `${participantCount}/${tournament.participantLimit} Takım`, status: publicStatus(tournament) };
}

function publicStatus(tournament) {
  if (tournament.status === "completed") return "Tamamlandı";
  const now = Date.now();
  if (tournament.startsAt && now >= new Date(tournament.startsAt).getTime()) return "Devam Ediyor";
  if (tournament.checkInOpensAt && tournament.checkInClosesAt && now >= new Date(tournament.checkInOpensAt).getTime() && now <= new Date(tournament.checkInClosesAt).getTime()) return "Check-in Başladı";
  return "Kayıt Açık";
}

const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function parseTournamentDate(value) {
  const [day, month, year] = value.split(" ");
  return new Date(Number(year), monthNames.indexOf(month), Number(day));
}

function TournamentCalendar({ onClose, onSelect, tournaments = [] }) {
  const firstEvent = tournaments[0] ? parseTournamentDate(tournaments[0].date) : new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(firstEvent.getFullYear(), firstEvent.getMonth(), 1));
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells = [...Array(mondayOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const eventsForDay = (day) => tournaments.filter((tournament) => { const date = parseTournamentDate(tournament.date); return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day; });

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="calendar-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="glass-card max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><div><span className="section-kicker">Sezon programı</span><h2 id="calendar-title" className="text-2xl font-black">Turnuva Takvimi</h2></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Takvimi kapat"><X className="h-5 w-5" /></button></div><div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-black/25 p-3"><button type="button" className="secondary-button px-3 py-2" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} aria-label="Önceki ay"><ChevronLeft className="h-4 w-4" /></button><p className="text-lg font-black">{monthNames[month]} {year}</p><button type="button" className="secondary-button px-3 py-2" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} aria-label="Sonraki ay"><ChevronRight className="h-4 w-4" /></button></div><div className="mt-3 grid grid-cols-7 gap-1">{weekDays.map((day) => <div key={day} className="p-2 text-center text-[10px] font-black uppercase text-white/40 sm:text-xs">{day}</div>)}{cells.map((day, index) => <div key={`${day}-${index}`} className={`min-h-20 rounded-lg border p-1.5 sm:min-h-28 sm:p-2 ${day ? "border-white/10 bg-white/[0.025]" : "border-transparent"}`}>{day ? <><span className="text-xs font-black text-white/45">{day}</span><div className="mt-1 space-y-1">{eventsForDay(day).map((tournament) => <button type="button" onClick={() => onSelect(tournament)} key={tournament.name} className="block w-full truncate rounded bg-bull-neon/15 px-1.5 py-1 text-left text-[9px] font-black text-bull-neon transition hover:bg-bull-neon/30 sm:text-[11px]" title={tournament.name}>{tournament.game}</button>)}</div></> : null}</div>)}</div></section></div>;
}

function TournamentModal({ tournament, onClose }) {
  const [applicationStatus, setApplicationStatus] = useState("");
  const { user, isAuthenticated } = useAuth();
  const operations = useAdminOperations();
  const navigate = useNavigate();
  const ownTournament = tournament.ownerId === user?.id || tournament.ownerEmail === user?.email;
  const existingApplication = operations.tournamentApplications.find((item) => item.tournamentId === tournament.id && (item.userId === user?.id || item.userEmail === user?.email) && ["pending", "approved"].includes(item.status));
  const applyToTournament = async () => {
    if (!isAuthenticated) { navigate("/giris", { state: { from: "/turnuvalar" } }); return; }
    const teamMembership = operations.teams.flatMap((team) => team.members || []).find((member) => member.email === user.email || member.name === user.name);
    const result = await operations.submitTournamentApplication({ tournamentId: tournament.id || tournament.name, tournamentName: tournament.name, ownerId: tournament.ownerId, ownerEmail: tournament.ownerEmail, ownerName: tournament.ownerName, userEmail: user.email, userName: user.name, playerRole: user.playerRole || teamMembership?.role || "Belirtilmedi", rank: user.rank || teamMembership?.rank || "Belirtilmedi" });
    setApplicationStatus(result.ok ? `Başvurun ${tournament.ownerName || "turnuva kaptanına"} gönderildi.` : result.message);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="tournament-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="glass-card relative w-full max-w-lg rounded-2xl p-6 shadow-2xl">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white" aria-label="Detayları kapat"><X className="h-5 w-5" /></button>
        <span className="section-kicker">{tournament.status}</span><h2 id="tournament-title" className="pr-10 text-3xl font-black">{tournament.name}</h2><p className="mt-2 font-bold text-bull-neon">{tournament.game}</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><Meta label="Ödül havuzu" value={tournament.prize} /><Meta label="Başlangıç" value={tournament.date} /><Meta label="Katılımcılar" value={tournament.participants} /><Meta label="Format" value={tournament.formatName || "Belirtilmedi"} /></div><p className="mt-5 text-sm leading-6 text-white/60">Başvurun profilindeki Başvurularım sekmesinde görünür. Turnuva sahibi onayladığında Turnuvalarım sekmesine eklenir.</p>{ownTournament ? <p className="mt-6 rounded-xl border border-bull-neon/20 bg-bull-neon/[0.06] p-4 text-center text-sm font-bold text-bull-neon">Bu turnuvanın organizatörüsün.</p> : existingApplication?.status === "approved" ? <p className="mt-6 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.06] p-4 text-center text-sm font-bold text-emerald-200">Bu turnuvaya zaten katılıyorsun.</p> : existingApplication ? <p className="mt-6 rounded-xl border border-amber-300/20 bg-amber-400/[0.06] p-4 text-center text-sm font-bold text-amber-200">Başvurun değerlendirme bekliyor.</p> : <button type="button" className="primary-button mt-6 w-full disabled:opacity-45" onClick={applyToTournament} disabled={Boolean(applicationStatus)}><Users className="h-4 w-4" /> {applicationStatus ? "Başvuru Gönderildi" : "Turnuvaya Başvur"}</button>}{applicationStatus ? <p className="mt-3 text-center text-xs font-bold text-emerald-200">{applicationStatus}</p> : null}
      </div>
    </div>
  );
}

function Meta({ label, value }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs font-bold uppercase tracking-wider text-white/40">{label}</p><p className="mt-1 font-black">{value}</p></div>;
}

const statusClass = {
  "Öne Çıkan": "bg-bull-gold/10 text-amber-200 border border-bull-gold/25",
  Yakında: "bg-sky-400/10 text-sky-200 border border-sky-300/20",
  "Kayıt Açık": "bg-emerald-400/10 text-emerald-200 border border-emerald-300/20",
  "Devam Ediyor": "bg-bull-gold/10 text-amber-200 border border-bull-gold/25"
  ,"Yayınlandı": "bg-bull-neon/10 text-bull-neon border border-bull-neon/25"
  ,"Check-in Başladı": "bg-violet-400/10 text-violet-200 border border-violet-300/25"
  ,"Tamamlandı": "bg-white/10 text-white/55 border border-white/15"
};

function Row({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-bull-gold" />
      <span>{text}</span>
    </div>
  );
}

function SideStat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}
