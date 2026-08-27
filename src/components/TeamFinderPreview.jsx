import { CheckCircle2, ChevronRight, Clock3, Copy, Gamepad2, Globe2, ImageUp, KeyRound, Plus, RotateCcw, Search, Shield, ShieldCheck, SlidersHorizontal, Swords, UserRoundCheck, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { brandAssets } from "../data/brandAssets.js";
import { filterOptions, rankMappings } from "../data/mockData.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useAdminOperations } from "../context/AdminOperationsContext.jsx";
import { useGameCatalog } from "../context/GameCatalogContext.jsx";
import { beginTeamMatch, confirmTeamMatchReady, getTeamMatchAccess, submitTeamMatchCode, subscribeToTeamMatch, uploadTeamMatchResult } from "../services/TeamMatchService.js";

const emptyFilters = { search: "", games: "Tümü", roles: "Tümü", levels: "Tümü", regions: "Tümü" };

export default function TeamFinderPreview({ sidebarContent = null }) {
  const [searchParams] = useSearchParams();
  const { gameNames, games: catalogGames, getGame } = useGameCatalog();
  const availableGames = gameNames.length ? gameNames : filterOptions.games;
  const availableRoles = [...new Set(catalogGames.flatMap((item) => item.roles || []))];
  const initialRole = [...filterOptions.roles, ...availableRoles].includes(searchParams.get("rol")) ? searchParams.get("rol") : "Tümü";
  const initialGame = availableGames.includes(searchParams.get("oyun")) ? searchParams.get("oyun") : "Tümü";
  const initialRegion = filterOptions.regions.includes(searchParams.get("bolge")) ? searchParams.get("bolge") : "Tümü";
  const initialLevel = searchParams.get("seviye") || "Tümü";
  const initialFilters = { ...emptyFilters, roles: initialRole, games: initialGame, regions: initialRegion, levels: initialLevel };
  const [draft, setDraft] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [appliedTeams, setAppliedTeams] = useState([]);
  const [applicationTeam, setApplicationTeam] = useState(null);
  const { isAuthenticated, user } = useAuth();
  const { activeTeams, teamApplications, submitTeamApplication } = useAdminOperations();
  const navigate = useNavigate();
  const location = useLocation();
  const catalogRanks = catalogGames.flatMap((item) => item.ranks || []);
  const dynamicFilterOptions = {
    ...filterOptions,
    games: availableGames,
    roles: draft.games === "Tümü" ? (availableRoles.length ? availableRoles : filterOptions.roles) : getGame(draft.games).roles || [],
    levels: draft.games === "Tümü"
      ? [...new Set(catalogRanks.length ? catalogRanks : Object.values(rankMappings).flat())]
      : getGame(draft.games).ranks?.length ? getGame(draft.games).ranks : rankMappings[draft.games] || filterOptions.levels
  };

  const visibleTeams = useMemo(() => activeTeams.map((team) => {
    const members = Array.isArray(team.members) ? team.members : Array.isArray(team.players) ? team.players : [];
    const mainMembers = members.filter((member) => (member.rosterType || "main") === "main");
    const reserveMembers = members.filter((member) => member.rosterType === "reserve");
    return {
      ...team,
      members,
      mainMembers,
      reserveMembers,
      playerCount: mainMembers.length,
      teamSize: Math.max(1, Number(team.teamSize || getGame(team.game).team_size || 5)),
      role: team.role || "Belirtilmedi",
      level: team.level || "Belirtilmedi",
      region: team.region || "Belirtilmedi",
      status: team.status || "Aktif"
    };
  }), [activeTeams, getGame]);

  const filteredTeams = useMemo(() => {
    const search = applied.search.trim().toLocaleLowerCase("tr-TR");
    return visibleTeams.filter((team) => {
      const haystack = `${team.name} ${team.game} ${team.role}`.toLocaleLowerCase("tr-TR");
      return (
        (!search || haystack.includes(search)) &&
        (applied.games === "Tümü" || team.game === applied.games) &&
        (applied.roles === "Tümü" || team.role === applied.roles) &&
        (applied.levels === "Tümü" || team.level === applied.levels) &&
        (applied.regions === "Tümü" || team.region === applied.regions)
      );
    });
  }, [applied, visibleTeams]);

  const requireAuth = () => {
    if (isAuthenticated) return true;
    navigate("/giris", { state: { from: `${location.pathname}${location.search}#takim-bul` } });
    return false;
  };

  const applyFilters = () => {
    if (requireAuth()) setApplied(draft);
  };

  const resetFilters = () => {
    setDraft(emptyFilters);
    setApplied(emptyFilters);
  };

  const submitApplication = async (team, application) => {
    if (!requireAuth()) return;
    const isCaptain = team.captainId === user.id || team.captainEmail === user.email;
    const isMember = (team.members || []).some((member) => member.userId === user.id || member.email === user.email);
    const hasApplication = teamApplications.some((item) => item.teamId === team.id && item.applicantId === user.id && ["pending", "approved"].includes(item.status));
    if (isCaptain || isMember || hasApplication) return;
    const result = await submitTeamApplication({ teamId: team.id || team.name, teamName: team.name, captainEmail: team.captainEmail, applicantEmail: user.email, applicantName: user.name, playerRole: application.role, rank: application.rank, game: team.game, note: application.note, availability: application.availability, contact: application.contact });
    if (result?.ok) { setAppliedTeams((value) => value.includes(team.name) ? value : [...value, team.name]); setApplicationTeam(null); }
    return result;
  };

  return (
    <section id="takim-bul" className="container-shell py-8 lg:py-10">
      <div className="team-finder-shell">
        <aside className="team-filter-panel">
          <div className="mb-6 flex items-center gap-3">
            <span className="icon-tile">
              <SlidersHorizontal className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">Filtre paneli</p>
              <h2 className="text-2xl font-black">Takım kriterleri</h2>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-white/70">Arama</span>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/35 px-3 py-3">
              <Search className="h-4 w-4 text-white/40" />
                  <input
                    className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/32"
                    placeholder="Takım adı, rol veya oyun"
                    value={draft.search}
                    onChange={(event) => setDraft((value) => ({ ...value, search: event.target.value }))}
                  />
            </div>
          </label>

          <div className="mt-5 grid gap-4">
            {Object.entries(dynamicFilterOptions).map(([key, values]) => (
              <label key={key} className="block">
                <span className="mb-2 block text-sm font-bold text-white/70">{labelMap[key]}</span>
                <select
                  data-testid={`filter-${key}`}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0711] px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-bull-neon/60"
                  value={draft[key]}
                  onChange={(event) => setDraft((value) => ({ ...value, [key]: event.target.value, ...(key === "games" ? { levels: "Tümü" } : {}) }))}
                >
                  <option className="bg-night">Tümü</option>
                  {values.map((value) => (
                    <option key={value} className="bg-night">
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <button data-testid="apply-team-filters" className="primary-button min-w-0 px-3" type="button" onClick={applyFilters}>
              Uygun Takımları Göster
            </button>
            <button className="secondary-button px-3" type="button" onClick={resetFilters} title="Filtreleri sıfırla" aria-label="Filtreleri sıfırla">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          {sidebarContent ? <div className="team-market-sidebar">{sidebarContent}</div> : null}
        </aside>

        <div className="team-results-panel">
          <div className="team-results-heading">
            <div>
              <span className="section-kicker">Canlı lobiler</span>
              <h2 className="section-title">Uygun takımı seç, oyuna gir.</h2>
              <p className="mt-2 text-sm font-bold text-white/48">{filteredTeams.length} takım kriterlerinle eşleşiyor.</p>
            </div>
            <div className="team-live-stats">
              <MiniStat icon={ShieldCheck} value={String(filteredTeams.length)} label="Eşleşen takım" />
              <MiniStat icon={Users} value={String(activeTeams.length)} label="Aktif oda" />
              <MiniStat icon={UserRoundCheck} value={String(activeTeams.reduce((sum, team) => sum + (team.members?.length || 0), 0))} label="Listelenen oyuncu" />
            </div>
          </div>

          <div className="team-results-list">
            {filteredTeams.map((team) => {
              const capacity = team.teamSize;
              const unavailable = team.captainId === user?.id || team.captainEmail === user?.email || (team.members || []).some((member) => member.userId === user?.id || member.email === user?.email) || teamApplications.some((item) => item.teamId === team.id && item.applicantId === user?.id && ["pending", "approved"].includes(item.status));
              return (
              <article data-testid="team-result" key={team.id || team.name} onClick={() => team.id && navigate(`/takim/${team.id}`)} className="team-result-card">
                <div className="team-result-identity">
                    <span className="team-result-logo">
                      {team.logoUrl ? <img src={team.logoUrl} alt={`${team.name} logosu`} className="h-full w-full object-contain p-2" /> : <img src={brandAssets.icons.team} alt="" className="h-11 w-11 object-contain" />}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-xl font-black">{team.name}</h3>
                        <span className="team-status-dot" title={team.status} />
                      </div>
                      <p className="mt-1 flex items-center gap-2 text-xs font-bold text-white/45">
<Gamepad2 className="h-3.5 w-3.5" />{team.game || "Oyun belirtilmedi"}</p>
                      <p className="mt-1 flex items-center gap-2 text-[10px] font-bold text-white/38">
<Globe2 className="h-3 w-3" />{team.region}</p>
                    </div>
                </div>

                <div className="team-role-area">
                  <p className="team-card-label">Roller</p>
                  <div className="team-role-slots">
                    {buildRoleSlots(team, getGame(team.game).roles).map((slot) => <div key={slot.label} className={slot.filled ? "is-filled" : ""} title={slot.value || `${slot.label} açık`}>
                      <span>{slot.filled ? <Swords /> : <Plus />}</span>
<small>{slot.label}</small>
                    </div>)}
                  </div>
                </div>

                <div className="team-rank-area">
                  <div className="team-rank-emblem">
<Shield />
</div>
                  <div>
<span className="team-card-label">Ortalama rank</span>
<strong>{team.level}</strong>
</div>
                  <span className="team-card-label">Açık koltuk</span>
<b>{Math.max(0, capacity - team.playerCount)} / {capacity}</b>
                  <span className="team-roster-dots" aria-hidden="true">
                    {Array.from({ length: capacity }, (_, index) => <i key={index} className={index < team.playerCount ? "is-filled" : ""} />)}
                  </span>
                  {team.reserveEnabled ? <small className="mt-1 text-[9px] font-bold text-white/35">Yedek {team.reserveMembers.length}/{team.reserveSize}</small> : null}
                </div>

                <div className="team-result-actions">
                  <button
                    className={appliedTeams.includes(team.name) ? "secondary-button py-2.5" : "primary-button py-2.5"}
                    type="button"
                    onClick={(event) => { event.stopPropagation(); if (requireAuth()) setApplicationTeam(team); }}
                    disabled={appliedTeams.includes(team.name) || unavailable}
                  >
                    {team.captainId === user?.id || team.captainEmail === user?.email ? "Kendi Takımın" : (team.members || []).some((member) => member.userId === user?.id || member.email === user?.email) ? "Takımdasın" : unavailable || appliedTeams.includes(team.name) ? "Başvuru Gönderildi" : "Başvur"}
                  </button>
                  <button className="team-inspect-button" type="button" onClick={(event) => { event.stopPropagation(); if (team.id) navigate(`/takim/${team.id}`); }}>
                    İncele <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );})}
            {filteredTeams.length === 0 ? (
              <div className="team-empty-state">
                <Search className="mx-auto h-8 w-8 text-bull-neon" />
                <h3 className="mt-4 text-xl font-black">Gösterilecek takım bulunamadı.</h3>
                <p className="mt-2 text-sm text-white/48">Yeni bir takım yayınlandığında burada otomatik olarak listelenecek.</p>
                <button className="secondary-button mx-auto mt-5" type="button" onClick={resetFilters}>
<RotateCcw className="h-4 w-4" /> Filtreleri sıfırla</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {applicationTeam ? <TeamApplicationForm team={applicationTeam} user={user} roles={getGame(applicationTeam.game).roles || []} ranks={getGame(applicationTeam.game).ranks || []} onClose={() => setApplicationTeam(null)} onSubmit={(values) => submitApplication(applicationTeam, values)} /> : null}
    </section>
  );
}

function TeamApplicationForm({ team, user, roles, ranks, onClose, onSubmit }) {
  const [form,setForm]=useState({role:roles.includes(user?.playerRole)?user.playerRole:"",rank:ranks.includes(user?.rank)?user.rank:"",availability:"",contact:user?.discord||"",note:""});
  const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  const send=async(event)=>{event.preventDefault();setBusy(true);setMessage("");const result=await onSubmit(form);setBusy(false);if(!result?.ok)setMessage(result?.message||"Başvuru gönderilemedi.");};
  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" onMouseDown={event=>event.target===event.currentTarget&&onClose()}>
<form onSubmit={send} className="glass-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6">
<div className="flex items-start justify-between gap-4">
<div>
<span className="section-kicker">Takım başvurusu</span>
<h2 className="mt-2 text-2xl font-black">{team.name} takımına başvur</h2>
<p className="mt-2 text-sm text-white/48">Kaptanın değerlendirebilmesi için oyun bilgilerini ve uygunluğunu eksiksiz doldur.</p>
</div>
<button type="button" onClick={onClose} className="secondary-button p-2.5">
<X className="h-4 w-4"/>
</button>
</div>
<div className="mt-6 grid gap-4 sm:grid-cols-2">
<label className="text-xs font-bold text-white/60">Başvurduğun rol<select required value={form.role} onChange={e=>setForm(v=>({...v,role:e.target.value}))} className="mt-2 w-full rounded-lg border border-white/10 bg-[#090d12] p-3 text-white">
<option value="">Rol seç</option>{roles.map(role=>
<option key={role}>{role}</option>)}</select>
</label>
<label className="text-xs font-bold text-white/60">Mevcut rank<select required value={form.rank} onChange={e=>setForm(v=>({...v,rank:e.target.value}))} className="mt-2 w-full rounded-lg border border-white/10 bg-[#090d12] p-3 text-white">
<option value="">Rank seç</option>{ranks.map(rank=>
<option key={rank}>{rank}</option>)}</select>
</label>
<label className="text-xs font-bold text-white/60">Oynayabildiğin gün ve saatler<input required value={form.availability} onChange={e=>setForm(v=>({...v,availability:e.target.value}))} placeholder="Örn. Hafta içi 20:00 sonrası" className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white"/>
</label>
<label className="text-xs font-bold text-white/60">İletişim / Discord<input required value={form.contact} onChange={e=>setForm(v=>({...v,contact:e.target.value}))} placeholder="Discord kullanıcı adın" className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white"/>
</label>
<label className="text-xs font-bold text-white/60 sm:col-span-2">Kendini ve takım hedefini anlat<textarea required minLength={20} value={form.note} onChange={e=>setForm(v=>({...v,note:e.target.value}))} placeholder="Oyun deneyimin, takım oyununa yaklaşımın ve hedeflerin..." className="mt-2 min-h-28 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white"/>
</label>
</div>{message?<p className="mt-4 rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-xs font-bold text-red-200">{message}</p>:null}<div className="mt-6 grid gap-3 sm:grid-cols-2">
<button type="button" onClick={onClose} className="secondary-button py-3">Vazgeç</button>
<button disabled={busy} className="primary-button py-3 disabled:opacity-50">{busy?"Gönderiliyor...":"Başvuruyu Gönder"}</button>
</div>
</form>
</div>;
}

const labelMap = {
  games: "Oyun seçimi",
  roles: "Rol seçimi",
  levels: "Seviye seçimi",
  regions: "Bölge seçimi"
};

function MiniStat({ value, label, icon: Icon }) {
  return (
    <div className="team-mini-stat">
      <span>
<Icon className="h-5 w-5" />
</span>
      <div>
<p className="text-lg font-black text-white">{value}</p>
<p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/38">{label}</p>
</div>
    </div>
  );
}

function buildRoleSlots(team, catalogRoles = []) {
  const roles = (team.members || []).map((member) => {
    const isCaptain = member.userId === team.captainId || member.email === team.captainEmail;
    return isCaptain && (!member.role || member.role === "Kaptan") ? team.role : member.role;
  }).filter(Boolean);
  const capacity = Math.max(1, Number(team.teamSize || 5));
  const openLabels = [...(team.wantedRoles || []).filter(Boolean), ...catalogRoles];
  return Array.from({ length: capacity }, (_, index) => ({ label: roles[index] || openLabels[index - roles.length] || "Açık rol", value: roles[index] || "", filled: index < roles.length }));
}

function TeamDetailModal({ team, user, onClose }) {
  const [matchOpen,setMatchOpen]=useState(false);
  const [matchState,setMatchState]=useState(null);
  const members=team.members||[];
  const mainMembers=members.filter(member=>(member.rosterType||"main")==="main");
  const reserveMembers=members.filter(member=>member.rosterType==="reserve");
  const capacity=Math.max(1,Number(team.teamSize||5));
  const rosterSummary=`Ana kadro ${mainMembers.length}/${capacity}${team.reserveEnabled?` • Yedek ${reserveMembers.length}/${team.reserveSize}`:""}`;
  const isMember=members.some(member=>member.userId===user?.id||member.email===user?.email);
  const isCaptain=team.captainId===user?.id||team.captainEmail===user?.email;
  const refreshMatch=()=>isMember&&team.id?getTeamMatchAccess(team.id).then(result=>result.ok&&setMatchState(result)):Promise.resolve();
  useEffect(()=>{if(!isMember||!team.id)return undefined;refreshMatch();return subscribeToTeamMatch(team.id,refreshMatch,"team-detail");},[isMember,team.id]);
  const statusLabel=matchState?.status==="matched"?"Eşleştirme Tamamlandı":matchState?.status==="playing"?"Maçın Tamamlanması Bekleniyor":"Eşleşme Odasını Aç";
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" onMouseDown={event=>event.target===event.currentTarget&&onClose()}>
<section className="glass-card max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl p-6">
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.18em] text-bull-neon">Takım detayları</p>
<h2 className="mt-1 text-2xl font-black">{team.name}</h2>
<p className="mt-1 text-sm text-white/50">{team.game} • {team.region} • {rosterSummary}</p>
</div>
<button onClick={onClose} className="secondary-button p-2.5">
<X className="h-4 w-4"/>
</button>
</div>
<div className="mt-5 grid gap-3">{members.map(member=>
<Link key={member.userId||member.email} to={member.userId?`/oyuncu/${member.userId}`:"#"} className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-bull-neon/30 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center">
<div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-bull-neon/10 font-black text-bull-neon">{member.avatar?<img src={member.avatar} alt="" className="h-full w-full object-cover"/>:member.name?.slice(0,2).toUpperCase()}</div>
<div>
<strong>{member.name}</strong>{member.email===team.captainEmail||member.userId===team.captainId?<span className="ml-2 rounded-full bg-bull-neon/10 px-2 py-1 text-[9px] font-black text-bull-neon">Kaptan</span>:null}<p className="mt-1 text-xs text-white/40">Profili görüntüle</p>
</div>
<span className="rounded-lg bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/60">{member.role||"Rol belirtilmedi"}</span>
<span className="rounded-lg bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/60">{member.rank||"Rank belirtilmedi"}</span>
</Link>)}{!members.length?<p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">Takım kadrosu henüz görüntülenemiyor.</p>:null}</div>{matchState?.confirmed_players?.length?<div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.05] p-4">
<p className="text-xs font-black uppercase tracking-wider text-emerald-200">Eşleştirmeyi doğrulayan oyuncular</p>
<div className="mt-2 flex flex-wrap gap-2">{matchState.confirmed_players.map(player=>
<span key={player.id} className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-100">
<CheckCircle2 className="mr-1 inline h-3 w-3"/>{player.name}</span>)}</div>
</div>:null}{isMember&&team.id?<button onClick={()=>setMatchOpen(true)} className="primary-button mt-5 w-full py-3">{matchState?.status==="matched"?<CheckCircle2 className="h-4 w-4"/>:matchState?.status==="playing"?<Clock3 className="h-4 w-4"/>:<KeyRound className="h-4 w-4"/>}{statusLabel}</button>:null}
{matchState?.last_matches?.length?<div className="mt-6">
<h3 className="font-black">Takımın son maçları</h3>
<div className="mt-3 grid gap-3 sm:grid-cols-2">{matchState.last_matches.map(match=>
<article key={match.id} className="rounded-xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4"><CheckCircle2 className="h-5 w-5 text-emerald-300"/><strong className="mt-3 block">Doğrulanmış DuoBull Eşleşmesi</strong><p className="mt-1 text-xs text-white/45">{new Date(match.completed_at).toLocaleDateString("tr-TR")} tarihinde yönetici tarafından onaylandı.</p></article>)}</div>
</div>:null}
{matchOpen?<TeamMatchPopup team={team} state={matchState} isCaptain={isCaptain} onRefresh={refreshMatch} onClose={()=>setMatchOpen(false)}/>:null}</section>
</div>;
}

export function TeamMatchPopup({team,state,isCaptain,onRefresh,onClose}){
  const[access,setAccess]=useState(state);const[roomCode,setRoomCode]=useState(state?.room_code||"");const[playerCode,setPlayerCode]=useState("");const[message,setMessage]=useState("");const[file,setFile]=useState(null);const[busy,setBusy]=useState(false);
  const refresh=async()=>{const result=await getTeamMatchAccess(team.id);if(result.ok){setAccess(result);await onRefresh();}else setMessage(result.message);return result;};
  useEffect(()=>{refresh();return subscribeToTeamMatch(team.id,refresh,"match-panel");},[team.id]);
  const pending=access?.status==="pending_review";
  if(access?.status==="playing"&&!isCaptain)return <section className="mt-5 rounded-2xl border border-bull-neon/25 bg-[#071015] p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-bull-neon">Takım eşleşmesi</p><h3 className="mt-1 text-xl font-black">{team.name} Odası</h3></div><button onClick={onClose} className="secondary-button p-2"><X className="h-4 w-4"/></button></div><p className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center text-sm text-white/50">Maç sonucunu yalnızca takım kaptanı yükleyebilir. Kaptanın sonucu göndermesi bekleniyor.</p></section>;
  return <section className="mt-5 rounded-2xl border border-bull-neon/25 bg-[#071015] p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-widest text-bull-neon">Takım eşleşmesi</p><h3 className="mt-1 text-xl font-black">{team.name} Odası</h3><p className="mt-2 text-sm text-white/50">Oyuncu kodlarıyla karşılıklı eşleşin. Sonuç görselinde oda kodunun görünmesi gerekmez.</p></div><button onClick={onClose} className="secondary-button p-2"><X className="h-4 w-4"/></button></div>{access?.status==="matching"?<><div className="mt-4 grid gap-3 sm:grid-cols-2"><CodeBox label="Oda referans kodu" value={access?.room_code} onCopy={value=>navigator.clipboard?.writeText(value)}/><CodeBox label="Senin oyuncu kodun" value={access?.player_code} onCopy={value=>navigator.clipboard?.writeText(value)}/></div><form className="mt-4 grid gap-3" onSubmit={async event=>{event.preventDefault();const result=await submitTeamMatchCode(team.id,roomCode,playerCode);setMessage(result.ok?(result.matched?`${result.target_name} ile eşleşme başarılı!`:`${result.target_name} doğrulandı. Karşı tarafın onayı bekleniyor.`):result.message);if(result.ok)await refresh();}}><input required value={roomCode} onChange={event=>setRoomCode(event.target.value.toUpperCase())} placeholder="Oda referans kodu" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-white"/><input required value={playerCode} onChange={event=>setPlayerCode(event.target.value.toUpperCase())} placeholder="Takım arkadaşının oyuncu kodu" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-white"/><button className="primary-button py-3"><Users className="h-4 w-4"/>Kodu Doğrula</button></form></>:access?.status==="matched"?<div className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.06] p-5 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-300"/><h4 className="mt-2 font-black">Oyuncu eşleşmesi tamamlandı</h4><button disabled={busy} onClick={async()=>{setBusy(true);const result=await confirmTeamMatchReady(team.id);setBusy(false);if(result.ok)await refresh();else setMessage(result.message);}} className="primary-button mt-4 w-full py-3">Maça Hazırım</button></div>:pending?<div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-400/[0.07] p-5"><Clock3 className="h-6 w-6 text-amber-200"/><h4 className="mt-2 font-black text-amber-100">Yönetici onayı bekleniyor</h4><p className="mt-1 text-sm text-white/50">Kanıt kabul edildiğinde maç tamamlanacak ve DuoBull Eşleşmesi hanesine eklenecek.</p></div>:access?.status==="playing"?<div className="mt-5"><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-bull-neon/30 bg-bull-neon/[0.04] p-5 text-sm font-black text-bull-neon"><ImageUp className="h-5 w-5"/>{file?file.name:"Maç sonucu görselini seç"}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event=>setFile(event.target.files?.[0]||null)}/></label><button disabled={!file||busy} onClick={async()=>{setBusy(true);const result=await uploadTeamMatchResult(team.id,file,null,setMessage);setBusy(false);setMessage(result.ok?"Maç sonucu yönetici doğrulamasına gönderildi.":result.message);if(result.ok)await refresh();}} className="primary-button mt-3 w-full py-3">Sonucu İncelemeye Gönder</button></div>:null}{message?<p className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm font-bold text-white/60">{message}</p>:null}</section>;
}
function CodeBox({label,value,onCopy}){const[copied,setCopied]=useState(false);const copy=async()=>{if(!value)return;await onCopy(value);setCopied(true);window.setTimeout(()=>setCopied(false),1500);};return <div className="relative rounded-xl border border-bull-neon/15 bg-bull-neon/[0.04] p-4">{copied?<span className="team-copy-toast"><CheckCircle2/>Kopyalandı</span>:null}
<p className="text-[10px] font-black uppercase tracking-wider text-white/40">{label}</p>
<div className="mt-2 flex items-center justify-between gap-2">
<code className="text-lg font-black tracking-widest text-bull-neon">{value||"--------"}</code>
<button type="button" onClick={copy} disabled={!value} className="secondary-button p-2">
<Copy className="h-4 w-4"/>
</button>
</div>
</div>}

