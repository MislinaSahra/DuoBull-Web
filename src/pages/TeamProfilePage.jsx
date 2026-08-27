import { ArrowLeft, BadgeCheck, CalendarDays, CheckCircle2, Clock3, Edit3, Gamepad2, Globe2, KeyRound, Save, Shield, Trophy, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchTeamProfile, removeTeamAsset, saveTeamProfile, uploadTeamAsset } from "../services/TeamProfileService.js";
import BannerCropModal from "../components/BannerCropModal.jsx";
import { getTeamLogoOptions, useHomeContent } from "../context/HomeContentContext.jsx";
import { TeamMatchPopup } from "../components/TeamFinderPreview.jsx";
import { getTeamMatchAccess, subscribeToTeamMatch } from "../services/TeamMatchService.js";

export default function TeamProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { images } = useHomeContent();
  const availableTeamLogos = getTeamLogoOptions(images).map((item) => item.url);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState("");
  const [bannerFile, setBannerFile] = useState(null);
  const [matchOpen, setMatchOpen] = useState(false);
  const [matchState, setMatchState] = useState(null);

  const refresh = async () => {
    setLoading(true);
    const result = await fetchTeamProfile(id);
    if (result?.error) { setError(result.error); setTeam(null); }
    else { setTeam(result); setError(""); }
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [id]);

  const isTeamMember = Boolean(team?.team_members?.some((member) => member.user_id === user?.id));
  const refreshMatch = async () => {
    if (!isTeamMember || !team?.id) return;
    const result = await getTeamMatchAccess(team.id);
    if (result.ok) setMatchState(result);
  };
  useEffect(() => {
    if (!isTeamMember || !team?.id) return undefined;
    refreshMatch();
    return subscribeToTeamMatch(team.id, refreshMatch, "team-profile");
  }, [isTeamMember, team?.id]);

  if (loading) return <section className="container-shell py-16"><div className="glass-card animate-pulse rounded-2xl p-8"><div className="aspect-[5/2] rounded-xl bg-white/5" /><div className="mt-6 h-24 rounded-xl bg-white/5" /></div></section>;
  if (error || !team) return <section className="container-shell py-16"><div className="glass-card mx-auto max-w-xl rounded-2xl p-8 text-center"><h1 className="text-2xl font-black">Takım profili açılamadı</h1><p className="mt-3 text-sm text-red-200/80">{error || "Takım bulunamadı."}</p><button onClick={refresh} className="primary-button mt-5 px-5 py-3">Tekrar Dene</button></div></section>;

  const captain = team.captain_id === user?.id;
  const mainMembers = team.team_members.filter((member) => (member.roster_type || "main") === "main");
  const reserveMembers = team.team_members.filter((member) => member.roster_type === "reserve");
  const mainCapacity = Number(team.team_size || 5);
  const reserveCapacity = team.reserve_enabled ? Number(team.reserve_size || 0) : 0;
  const uploadFile = async (kind, file) => {
    if (!file) return;
    const previousUrl = team[`${kind}_url`];
    setUploading(kind);
    setMessage("");
    const result = await uploadTeamAsset(team.id, file, kind);
    if (result.ok) {
      const nextTeam = { ...team, [`${kind}_url`]: result.url };
      const saved = await saveTeamProfile(team.id, nextTeam);
      if (saved.ok) {
        setTeam((current) => ({ ...current, ...saved.team, team_members: current.team_members }));
        if (previousUrl && previousUrl !== result.url) await removeTeamAsset(previousUrl);
        setMessage(`${kind === "logo" ? "Logo" : "Banner"} yüklendi ve kaydedildi.`);
      } else {
        await removeTeamAsset(result.url);
        setMessage(saved.message);
      }
    } else setMessage(result.message);
    setUploading("");
    if (kind === "banner") setBannerFile(null);
  };
  const save = async () => {
    if (!availableTeamLogos.includes(team.logo_url)) {
      setMessage("Takım logosu olarak yöneticilerin eklediği hazır logolardan birini seçmelisiniz.");
      return;
    }
    const result = await saveTeamProfile(team.id, team);
    setMessage(result.ok ? "Takım profili kaydedildi." : result.message);
    if (result.ok) { setTeam((current) => ({ ...current, ...result.team, team_members: current.team_members })); setEdit(false); }
  };

  return <section className="container-shell py-8"><Link to="/takim-bul" className="team-profile-back"><ArrowLeft /> Takım Bul'a Dön</Link><article className="glass-card team-profile-shell overflow-hidden rounded-2xl">
    <div className={`relative overflow-hidden ${edit ? "" : "sm:aspect-[5/2]"}`}>
      {team.banner_url ? <><img src={team.banner_url} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-[#05090c]/85 via-[#0d1419]/45 to-[#05090c]/20" /><div className="absolute inset-0 bg-gradient-to-t from-[#05090c]/55 via-transparent to-black/10" /></> : null}
      <div className="relative z-10 min-h-[320px] p-6 sm:min-h-0 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4">{team.logo_url ? <img src={team.logo_url} alt="Takım logosu" className="h-24 w-24 rounded-2xl object-contain" /> : <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-bull-neon/10"><Shield className="h-10 w-10 text-bull-neon" /></div>}<div><span className="section-kicker">Takım Profili</span><h1 className="mt-2 text-4xl font-black">{team.name}</h1><p className="mt-2 text-white/50">{team.game} • {team.region}</p>{team.motto ? <p className="mt-2 font-bold text-bull-neon">{team.motto}</p> : null}</div></div>{captain ? <button onClick={() => setEdit((value) => !value)} className="secondary-button px-4 py-3">{edit ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}{edit ? "Kapat" : "Takım Profilini Düzenle"}</button> : null}</div>
      {team.profile_description ? <p className="mt-6 max-w-3xl leading-7 text-white/60">{team.profile_description}</p> : <p className="mt-6 max-w-3xl text-sm leading-7 text-white/38">Takım kaptanı henüz takım açıklaması eklemedi.</p>}
      </div>
    </div>
    {edit ? <div className="team-profile-editor"><div className="grid gap-4 sm:grid-cols-2"><Field label="Takım mottosu" value={team.motto || ""} onChange={(e) => setTeam((current) => ({ ...current, motto: e.target.value }))} /><div className="sm:col-span-2"><p className="mb-1 text-xs font-bold">Hazır takım logoları</p><p className="mb-3 text-[11px] text-white/40">Takım logosu yalnızca yöneticilerin eklediği seçeneklerden belirlenebilir.</p>{availableTeamLogos.length ? <div className="team-logo-picker">{availableTeamLogos.map((logo) => <button key={logo} type="button" aria-label="Bu takım logosunu seç" onClick={() => setTeam((current) => ({ ...current, logo_url: logo }))} className={team.logo_url === logo ? "is-selected" : ""}><img src={logo} alt="Hazır takım logosu" /></button>)}</div> : <p className="rounded-lg border border-dashed border-white/10 p-4 text-xs text-white/40">Yönetici henüz hazır takım logosu eklemedi. Logo seçebilmek için yöneticinin seçenek eklemesi gerekiyor.</p>}</div><Upload label={uploading === "banner" ? "Banner yükleniyor..." : "Banner seç ve kadrajla (600 × 240 px)"} onChange={(event) => setBannerFile(event.target.files?.[0] || null)} preview={team.banner_url} wide /><label className="text-xs font-bold sm:col-span-2">Açıklama<textarea value={team.profile_description || ""} onChange={(e) => setTeam((current) => ({ ...current, profile_description: e.target.value }))} className="mt-2 min-h-28 w-full rounded-lg border border-white/10 bg-black/30 p-3" /></label>{message ? <p className="rounded-lg border border-white/10 bg-black/25 p-3 text-xs font-bold sm:col-span-2">{message}</p> : null}<button disabled={Boolean(uploading) || !availableTeamLogos.includes(team.logo_url)} onClick={save} className="primary-button py-3 sm:col-span-2"><Save className="h-4 w-4" /> Değişiklikleri Kaydet</button></div></div> : null}
    <div className="p-6 sm:p-8">
      <div className="team-profile-stats"><TeamStat icon={Gamepad2} label="Oyun" value={team.game}/><TeamStat icon={Globe2} label="Bölge" value={team.region}/><TeamStat icon={Users} label="Ana Kadro" value={`${mainMembers.length} / ${mainCapacity}`}/><TeamStat icon={Trophy} label="Takım Durumu" value={team.status === "approved" ? "Onaylı" : "İnceleniyor"}/><TeamStat icon={CalendarDays} label="Kuruluş" value={team.created_at ? new Date(team.created_at).toLocaleDateString("tr-TR") : "Belirtilmedi"}/></div>
      <div className="team-roster-head"><div><span className="section-kicker">Takım Kadrosu</span><h2>Ana kadro oyuncuları</h2></div><strong>{mainMembers.length} / {mainCapacity} dolu</strong></div>{team.rosterError ? <p className="mt-3 text-xs text-amber-200">Kadro bilgisi alınamadı: {team.rosterError}</p> : null}<div className="team-profile-roster">{mainMembers.map((member) => <RosterCard key={member.user_id} member={member} captainId={team.captain_id}/>) }{Array.from({length:Math.max(0,mainCapacity-mainMembers.length)},(_,index)=><div key={`empty-main-${index}`} className="team-roster-empty"><Users/><span>Açık ana kadro koltuğu</span></div>)}</div>
      {team.reserve_enabled ? <><div className="team-roster-head reserve"><div><span className="section-kicker">İsteğe Bağlı</span><h2>Yedek oyuncular</h2></div><strong>{reserveMembers.length} / {reserveCapacity} dolu</strong></div><div className="team-profile-roster">{reserveMembers.map((member)=><RosterCard key={member.user_id} member={member} captainId={team.captain_id}/>)}{Array.from({length:Math.max(0,reserveCapacity-reserveMembers.length)},(_,index)=><div key={`empty-reserve-${index}`} className="team-roster-empty reserve"><Users/><span>Açık yedek koltuğu</span></div>)}</div></> : null}
      {isTeamMember ? <div className="team-match-access"><div><span className="section-kicker">DuoBull Eşleşmesi</span><h2>Takım eşleşme odası</h2><p>Oyuncu kodunu doğrula, maç durumunu takip et ve kaptansan maç sonucunu incelemeye gönder.</p></div><button type="button" onClick={() => setMatchOpen((value) => !value)} className="primary-button px-5 py-3">{matchState?.status === "matched" || matchState?.status === "completed" ? <CheckCircle2 /> : matchState?.status === "playing" || matchState?.status === "pending_review" ? <Clock3 /> : <KeyRound />}{matchState?.status === "completed" ? "Son Maç İstatistikleri" : matchState?.status === "pending_review" ? "Yönetici Onayı Bekleniyor" : matchState?.status === "playing" ? "Maç Sonucunu Gönder" : matchState?.status === "matched" ? "Eşleşmeyi Tamamla" : "Eşleşme Odasını Aç"}</button></div> : null}
      {matchState?.last_matches?.length ? <div className="team-match-history"><div><strong>{matchState.last_matches.length}</strong><span>Onaylı DuoBull Eşleşmesi</span></div><div><strong>{new Date(matchState.last_matches[0].completed_at).toLocaleDateString("tr-TR")}</strong><span>Son onaylanan maç</span></div><div><strong>Doğrulandı</strong><span>Yönetici kontrol durumu</span></div></div> : null}
      {matchOpen && isTeamMember ? <TeamMatchPopup team={team} state={matchState} isCaptain={captain} onRefresh={refreshMatch} onClose={() => setMatchOpen(false)} /> : null}
      {message ? <p className="mt-4 text-sm font-bold">{message}</p> : null}
    </div>
  </article>{bannerFile ? <BannerCropModal file={bannerFile} onCancel={() => setBannerFile(null)} onApply={(file) => uploadFile("banner", file)} /> : null}</section>;
}

function Field(props) { return <label className="text-xs font-bold">{props.label}<input value={props.value} onChange={props.onChange} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 p-3" /></label>; }
function Upload({ label, onChange, preview, wide }) { return <label className={`text-xs font-bold ${wide ? "sm:col-span-2" : ""}`}>{label}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={onChange} className="mt-2 block w-full rounded-lg border border-white/10 bg-black/30 p-2" />{preview ? <img src={preview} alt="Yüklenen görsel önizlemesi" className={`mt-3 w-full rounded-lg bg-black ${wide ? "h-32 object-cover" : "h-24 object-contain"}`} /> : null}</label>; }
function TeamStat({icon:Icon,label,value}){return <article><span><Icon/></span><div><small>{label}</small><strong>{value}</strong></div></article>}
function RosterCard({member,captainId}){return <Link to={`/oyuncu/${member.user_id}`} className="team-roster-card">{member.profiles?.avatar_url?<img src={member.profiles.avatar_url} alt=""/>:<span>{member.profiles?.username?.slice(0,2).toUpperCase()||"DB"}</span>}<div><strong>{member.profiles?.username||"Oyuncu"}{member.profiles?.is_verified?<BadgeCheck/>:null}{member.user_id===captainId?<em>Kaptan</em>:null}</strong><p>{member.role||"Rol belirtilmedi"}</p><small>{member.rank||"Rank belirtilmedi"}</small></div></Link>}
