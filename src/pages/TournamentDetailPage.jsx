import { ArrowLeft, CalendarDays, Check, ClipboardList, Copy, Gamepad2, GitBranch, ImageUp, MessageCircle, ShieldCheck, Trophy, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAdminOperations } from "../context/AdminOperationsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useHomeContent } from "../context/HomeContentContext.jsx";
import { supabase } from "../lib/supabase.js";

const tabs = [["overview","Genel Bakış"],["bracket","Turnuva Ağacı"],["rules","Kurallar"],["teams","Takımlar"],["matches","Maçlar"],["manage","Yönetim"]];

export default function TournamentDetailPage() {
  const { id } = useParams();
  const [query] = useSearchParams();
  const operations = useAdminOperations();
  const { user } = useAuth();
  const { images } = useHomeContent();
  const [tab,setTab]=useState(query.get("katil")==="1"?"teams":"overview");
  const [matches,setMatches]=useState([]);
  const [message,setMessage]=useState("");
  const [selectedApplication,setSelectedApplication]=useState(null);
  const [directCaptainTeams,setDirectCaptainTeams]=useState([]);
  const tournament=operations.tournamentDrafts.find((item)=>item.id===id);
  const applications=operations.tournamentApplications.filter((item)=>item.tournamentId===id);
  const approved=applications.filter((item)=>item.status==="approved");
  const own=tournament&&(tournament.ownerId===user?.id||tournament.ownerEmail===user?.email);
  const mine=applications.find((item)=>item.userId===user?.id||item.userEmail===user?.email);
  const normalize=value=>String(value||"").trim().toLocaleLowerCase("tr-TR").replace(/[^a-z0-9çğıöşü]+/g,"");
  const sameId=(left,right)=>Boolean(left&&right&&String(left)===String(right));
  const myTeamIds=operations.teams.filter(team=>(team.members||[]).some(member=>sameId(member.id,user?.id)||sameId(member.userId,user?.id)||normalize(member.email)===normalize(user?.email))).map(team=>team.id);
  const participantApplication=approved.find(app=>myTeamIds.includes(app.teamId));
  const allTeams=useMemo(()=>{
    const merged=new Map((operations.teams||[]).map(team=>[String(team.id),team]));
    directCaptainTeams.forEach(team=>{
      const previous=merged.get(String(team.id));
      merged.set(String(team.id),{...previous,...team,members:team.members?.length?team.members:(previous?.members||[])});
    });
    return [...merged.values()];
  },[operations.teams,directCaptainTeams]);
  const directCaptainIds=new Set(directCaptainTeams.map(team=>String(team.id)));
  const captainTeams=allTeams.filter((team)=>{
    const member=(team.members||[]).find(item=>sameId(item.id,user?.id)||sameId(item.userId,user?.id)||normalize(item.email)===normalize(user?.email));
    const isCaptain=directCaptainIds.has(String(team.id))||sameId(team.captainId,user?.id)||normalize(team.captainEmail)===normalize(user?.email)||(member&&normalize(member.name)===normalize(team.captain));
    return isCaptain&&["approved","active"].includes(normalize(team.status));
  });
  const ownTeams=captainTeams.filter((team)=>!tournament||normalize(team.game)===normalize(tournament.game));
  const [teamId,setTeamId]=useState("");
  const team=ownTeams.find((item)=>item.id===teamId);
  const [roster,setRoster]=useState([]);
  const [reserveId,setReserveId]=useState("");
  const [settings,setSettings]=useState({startsAt:"",rules:"",region:"",gameMode:"",entryFee:0,organizerContact:"",streamUrl:"",mapPoolText:"",checkInOpensAt:"",checkInClosesAt:""});
  const checkInOpen=useMemo(()=>{const now=Date.now();return tournament?.checkInOpensAt&&tournament?.checkInClosesAt&&now>=new Date(tournament.checkInOpensAt).getTime()&&now<=new Date(tournament.checkInClosesAt).getTime();},[tournament]);
  useEffect(()=>{if(id)operations.fetchTournamentMatches(id).then(setMatches);},[id,operations.tournamentDrafts]);
  useEffect(()=>{
    let active=true;
    if(!user?.id){setDirectCaptainTeams([]);return undefined;}
    (async()=>{
      const {data:teams,error}=await supabase.from("teams").select("*").eq("captain_id",user.id);
      if(error||!active){if(error)console.error("Kaptan takımları yüklenemedi:",error.message);return;}
      const ids=(teams||[]).map(team=>team.id);
      const {data:members}=ids.length?await supabase.from("team_members").select("team_id,user_id,member_role,rank,roster_type,profiles!team_members_user_id_fkey(username,avatar_url,player_role,rank)").in("team_id",ids):{data:[]};
      if(!active)return;
      setDirectCaptainTeams((teams||[]).map(team=>({
        id:team.id,name:team.name,game:team.game,status:team.status,captainId:team.captain_id,region:team.region,
        teamSize:Number(team.team_size||5),reserveEnabled:Boolean(team.reserve_enabled),reserveSize:Number(team.reserve_size||0),
        members:(members||[]).filter(member=>String(member.team_id)===String(team.id)).map(member=>({id:member.user_id,userId:member.user_id,name:member.profiles?.username||"Oyuncu",avatar:member.profiles?.avatar_url||"",role:member.member_role||member.profiles?.player_role||"Belirtilmedi",rank:member.rank||member.profiles?.rank||"Belirtilmedi",rosterType:member.roster_type||"main"}))
      })));
    })();
    return()=>{active=false;};
  },[user?.id,operations.teams.length]);
  useEffect(()=>{if(tournament)setSettings({startsAt:localDateTime(tournament.startsAt),rules:tournament.rules||"",region:tournament.region||"",gameMode:tournament.gameMode||"",entryFee:tournament.entryFee||0,organizerContact:tournament.organizerContact||"",streamUrl:tournament.streamUrl||"",mapPoolText:(tournament.mapPool||[]).join(", "),checkInOpensAt:localDateTime(tournament.checkInOpensAt),checkInClosesAt:localDateTime(tournament.checkInClosesAt)});},[tournament?.id]);
  if(!tournament)return <section className="container-shell py-20 text-center"><Trophy className="mx-auto h-10 w-10 text-bull-neon"/><h1 className="mt-4 text-2xl font-black">Turnuva bulunamadı</h1><Link to="/turnuvalar" className="secondary-button mt-6">Turnuvalara dön</Link></section>;

  const apply=async()=>{
    if(!team)return setMessage("Katılacağın takımı seçmelisin.");
    if(!roster.length)return setMessage("Turnuva kadrosundan en az bir oyuncu seçmelisin.");
    const result=await operations.submitTournamentApplication({tournamentId:tournament.id,tournamentName:tournament.name,ownerId:tournament.ownerId,ownerEmail:tournament.ownerEmail,ownerName:tournament.ownerName,userEmail:user.email,userName:user.name,playerRole:user.playerRole||"Kaptan",rank:user.rank||"Belirtilmedi",teamId:team.id,roster,reserveId:reserveId||null});
    setMessage(result.ok?"Turnuva başvurun ve kadron kaydedildi.":result.message);
  };
  const doCheckIn=async()=>{if(!mine)return;const result=await operations.checkInTournament(mine.id);setMessage(result.ok?"Check-in tamamlandı.":result.message);};

  return <main className="tournament-detail">
    <section className="tournament-detail-hero"><img src={images["tournaments-banner"]} alt=""/><div className="tournament-detail-veil"/><div className="container-shell tournament-detail-hero__content">
      <Link to="/turnuvalar" className="tournament-back"><ArrowLeft/>Turnuvalara dön</Link><span className="section-kicker">{statusLabel(tournament)}</span><h1>{tournament.name}</h1><p><Gamepad2/>{tournament.game}<CalendarDays/>{formatStart(tournament)}</p>
      <div className="tournament-detail-meta"><Meta label="Ödül havuzu" value={tournament.prize}/><Meta label="Katılım" value={approved.length+" / "+tournament.participantLimit+" takım"}/><Meta label="Format" value={tournament.formatName||"Belirtilmedi"}/><Meta label="Bölge / Mod" value={[tournament.region,tournament.gameMode].filter(Boolean).join(" • ")||"Belirtilmedi"}/></div>
      <div className="tournament-hero-cta">{own?<button className="primary-button" onClick={()=>setTab("manage")}>Turnuvayı Yönet</button>:!user?<Link className="primary-button" to="/?hesap=giris#hesap">Giriş Yap ve Katıl</Link>:statusLabel(tournament)==="Devam Ediyor"&&embedStream(tournament.streamUrl)?<a className="primary-button" href="#canli-yayin">Canlı İzle</a>:statusLabel(tournament)==="Devam Ediyor"?<button className="secondary-button" disabled>Turnuva Devam Ediyor</button>:mine?.status==="approved"&&checkInOpen&&!mine.checkedInAt?<button className="primary-button" onClick={doCheckIn}>Check-in Yap</button>:mine?<button className="secondary-button" disabled>{mine.status==="approved"?"Takımın Turnuvaya Katılıyor":"Başvurun Değerlendiriliyor"}</button>:ownTeams.length?<button className="primary-button" onClick={()=>setTab("teams")}>Takımla Başvur</button>:participantApplication?<button className="secondary-button" onClick={()=>setTab("matches")}>Takımın Turnuvaya Katılıyor</button>:<><Link className="primary-button" to="/takim-olustur">Takım Oluştur</Link><Link className="secondary-button" to="/takim-bul#oyuncu-pazari">Takıma Katıl</Link></>}</div>
    </div></section>
    <section className="container-shell tournament-detail-body">
      <nav>{tabs.filter(([key])=>key!=="manage"||own).map(([key,label])=><button key={key} className={tab===key?"is-active":""} onClick={()=>setTab(key)}>{label}</button>)}</nav>
      {tab==="overview"?<><div className="tournament-detail-grid"><Panel title="Turnuva hakkında" icon={Trophy}><p>{tournament.description||"Organizatör henüz turnuva açıklaması eklemedi."}</p></Panel><Panel title="Program" icon={CalendarDays}><Info label="Başlangıç" value={formatStart(tournament)}/><Info label="Check-in" value={tournament.checkInOpensAt?new Date(tournament.checkInOpensAt).toLocaleString("tr-TR")+" – "+new Date(tournament.checkInClosesAt).toLocaleString("tr-TR"):"Henüz belirlenmedi"}/></Panel><Panel title="Organizatör" icon={ShieldCheck}><Info label="Organizatör" value={tournament.ownerName||"DuoBull Yönetimi"}/><Info label="İletişim" value={tournament.organizerContact||"Henüz eklenmedi"}/>{contactHref(tournament.organizerContact)?<a className="secondary-button mt-4" href={contactHref(tournament.organizerContact)} target="_blank" rel="noreferrer"><MessageCircle/>Discord sunucusuna katıl</a>:null}</Panel></div>{embedStream(tournament.streamUrl)?<div id="canli-yayin"><Panel title="Canlı yayın" icon={Gamepad2}><div className="tournament-stream"><iframe src={embedStream(tournament.streamUrl)} title="Turnuva canlı yayını" allowFullScreen allow="autoplay; encrypted-media; picture-in-picture"/></div></Panel></div>:null}</>:null}
      {tab==="rules"?<Panel title="Kural kitabı" icon={ClipboardList}><div className="whitespace-pre-wrap">{tournament.rules||"Organizatör henüz BO formatı, harita seçimi, anti-cheat ve geç kalma kurallarını yayınlamadı."}</div></Panel>:null}
      {tab==="bracket"?<Panel title="Turnuva ağacı" icon={GitBranch}>{matches.length?<div className="bracket-board">{[...new Set(matches.map(m=>m.round_no))].map(round=><div key={round}><h3>{round}. Tur</h3>{matches.filter(m=>m.round_no===round).map(match=><article key={match.id}><span>{match.team_a_name||"Bekleniyor"}</span><b>{match.score_a??"-"} : {match.score_b??"-"}</b><span>{match.team_b_name||"Bekleniyor"}</span></article>)}</div>)}</div>:<Empty text="Kura henüz çekilmedi. Turnuva ağacı organizatör tarafından oluşturulduğunda burada yayınlanacak."/>}</Panel>:null}
      {tab==="teams"?<div className="tournament-detail-grid"><Panel title={"Katılımcılar ("+approved.length+")"} icon={Users}>{approved.length?approved.map(app=><article className="participant-card" key={app.id}><strong>{app.teamName||app.userName}</strong><span>{app.checkedInAt?"Check-in tamamlandı":"Onaylı"}</span><button className="secondary-button" onClick={()=>setSelectedApplication(app)}>Kadroyu İncele</button></article>):<Empty text="Henüz onaylanmış takım yok."/>}</Panel>{!own&&!mine?<Panel title="Turnuvaya başvur" icon={Users}><label>Takım<select value={teamId} onChange={e=>{setTeamId(e.target.value);setRoster([]);setReserveId("");}}><option value="">Takım seç</option>{ownTeams.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{!ownTeams.length&&captainTeams.length?<p className="form-note">Kaptanı olduğun onaylı takım bulunuyor; ancak takımın oyunu ({captainTeams.map(item=>item.game).join(", ")}) bu turnuvanın oyunuyla ({tournament.game}) eşleşmiyor.</p>:null}{!captainTeams.length?<p className="form-note">Başvuru yalnızca onaylı takım kaptanları tarafından yapılabilir.</p>:null}{team?<><p className="form-note">Turnuva kadrosunu seç:</p>{team.members.map(member=><label className="roster-option" key={member.id}><input type="checkbox" checked={roster.includes(member.id)} onChange={e=>setRoster(current=>e.target.checked?[...current,member.id]:current.filter(memberId=>memberId!==member.id))}/>{member.name} • {member.role}</label>)}<label>Yedek oyuncu<select value={reserveId} onChange={e=>setReserveId(e.target.value)}><option value="">Yedek yok</option>{team.members.filter(m=>!roster.includes(m.id)).map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label></>:null}<button className="primary-button mt-4 w-full" disabled={!team} onClick={apply}>Kadro ile başvur</button></Panel>:mine?<Panel title="Katılım durumun" icon={Check}><Info label="Başvuru" value={mine.status==="approved"?"Onaylandı":"Değerlendiriliyor"}/>{mine.status==="approved"&&checkInOpen&&!mine.checkedInAt?<button className="primary-button mt-4 w-full" onClick={async()=>{const result=await operations.checkInTournament(mine.id);setMessage(result.ok?"Check-in tamamlandı.":result.message);}}>Check-in yap</button>:null}{mine.checkedInAt?<p className="success-note">Check-in tamamlandı.</p>:null}</Panel>:null}</div>:null}
      {tab==="matches"?<Panel title="Maç programı ve aktif maçım" icon={Gamepad2}>{matches.length?matches.map(match=><PlayerMatchCard key={match.id} match={match} mapPool={tournament.mapPool||[]} canAccess={own||myTeamIds.includes(match.team_a_id)||myTeamIds.includes(match.team_b_id)} teamId={myTeamIds.find(teamId=>teamId===match.team_a_id||teamId===match.team_b_id)} operations={operations} onMessage={setMessage} onChanged={async()=>setMatches(await operations.fetchTournamentMatches(tournament.id))}/>):<Empty text="Maç programı kura çekiminden sonra yayınlanacak."/>}</Panel>:null}
      {tab==="manage"&&own?<div className="tournament-detail-grid"><Panel title="Turnuva ayarları" icon={ClipboardList}><SettingsForm value={settings} setValue={setSettings} onSave={async()=>{const result=await operations.saveTournamentManagement(tournament.id,{...settings,startsAt:toIso(settings.startsAt),checkInOpensAt:toIso(settings.checkInOpensAt),checkInClosesAt:toIso(settings.checkInClosesAt)});setMessage(result.ok?"Turnuva ayarları kaydedildi.":result.message);}}/></Panel><Panel title="Başvuran takımlar" icon={Users}>{applications.map(app=><article className="management-application" key={app.id}><span><strong>{app.teamName||app.userName}</strong><small>{app.status}</small></span>{app.status==="pending"?<div><button onClick={()=>operations.reviewTournamentApplication(app.id,"approved")}>Onayla</button><button onClick={()=>operations.reviewTournamentApplication(app.id,"rejected")}>Reddet</button></div>:null}</article>)}{!applications.length?<Empty text="Henüz başvuru yok."/>:null}</Panel><Panel title="Turnuva ağacı" icon={GitBranch}><p>Onaylanan takımlarla rastgele ilk tur eşleşmesi oluştur.</p><button className="primary-button mt-4" disabled={approved.length<2} onClick={async()=>{const result=await operations.generateTournamentBracket(tournament.id);setMessage(result.ok?"Turnuva ağacı oluşturuldu.":result.message);if(result.ok)setMatches(await operations.fetchTournamentMatches(tournament.id));}}>Kura çek ve ağacı oluştur</button></Panel><Panel title="Maç skor ve lobi yönetimi" icon={Gamepad2}>{matches.length?matches.map(match=><MatchManager key={match.id} match={match} operations={operations} onSaved={async text=>{setMessage(text);setMatches(await operations.fetchTournamentMatches(tournament.id));}}/>):<Empty text="Önce turnuva ağacını oluşturmalısın."/>}</Panel></div>:null}
      {message?<p className="tournament-detail-message">{message}</p>:null}
      {selectedApplication?<RosterModal application={selectedApplication} team={operations.teams.find(item=>item.id===selectedApplication.teamId)} onClose={()=>setSelectedApplication(null)}/>:null}
    </section>
  </main>;
}
function Panel({title,icon:Icon,children}){return <section className="tournament-detail-panel"><h2><Icon/>{title}</h2><div>{children}</div></section>}
function Meta({label,value}){return <div><span>{label}</span><strong>{value}</strong></div>}
function Info({label,value}){return <p className="detail-info"><span>{label}</span><strong>{value}</strong></p>}
function Empty({text}){return <div className="tournament-detail-empty">{text}</div>}
function formatStart(t){return t.startsAt?new Date(t.startsAt).toLocaleString("tr-TR"):new Date(t.date+"T12:00:00").toLocaleDateString("tr-TR")}
function statusLabel(t){if(t.status==="completed")return "Tamamlandı";const now=Date.now();if(t.startsAt&&now>=new Date(t.startsAt).getTime())return "Devam Ediyor";if(t.checkInOpensAt&&t.checkInClosesAt&&now>=new Date(t.checkInOpensAt).getTime()&&now<=new Date(t.checkInClosesAt).getTime())return "Check-in Başladı";return "Kayıtlar Açık"}
function contactHref(value){const clean=String(value||"").trim();if(/^https?:\/\/(www\.)?(discord\.gg|discord\.com\/invite)\//i.test(clean))return clean;if(/^(discord\.gg|discord\.com\/invite)\//i.test(clean))return "https://"+clean;return ""}
function embedStream(value){
  const clean=String(value||"").trim();
  if(!clean)return "";
  try{
    const url=new URL(/^https?:\/\//i.test(clean)?clean:`https://${clean}`);
    const host=url.hostname.replace(/^www\./,"").toLowerCase();
    if(host==="youtu.be")return `https://www.youtube.com/embed/${url.pathname.split("/").filter(Boolean)[0]||""}`;
    if(host==="youtube.com"||host==="m.youtube.com"){
      const id=url.searchParams.get("v")||url.pathname.match(/\/(?:live|embed)\/([^/?]+)/)?.[1];
      return id?`https://www.youtube.com/embed/${id}`:"";
    }
    if(host==="twitch.tv"){
      const part=url.pathname.split("/").filter(Boolean);
      const parent=typeof window!=="undefined"?window.location.hostname:"localhost";
      if(part[0]==="videos"&&part[1])return `https://player.twitch.tv/?video=v${part[1]}&parent=${encodeURIComponent(parent)}`;
      if(part[0])return `https://player.twitch.tv/?channel=${encodeURIComponent(part[0])}&parent=${encodeURIComponent(parent)}`;
    }
  }catch{return "";}
  return "";
}
function localDateTime(value){if(!value)return "";const date=new Date(value);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16)}
function toIso(value){return value?new Date(value).toISOString():null}
function RosterModal({application,team,onClose}){const roster=(team?.members||[]).filter(member=>(application.roster||[]).includes(member.id));const reserve=(team?.members||[]).find(member=>member.id===application.reserveId);return <div className="roster-modal" onMouseDown={event=>event.target===event.currentTarget&&onClose()}><section><button onClick={onClose}><X/></button><span className="section-kicker">Onay kadrosu</span><h2>{application.teamName||team?.name||application.userName}</h2><div>{roster.map(member=><article key={member.id}><strong>{member.name}</strong><span>{member.role} • {member.rank}</span></article>)}{!roster.length?<Empty text="Kadro bilgisi bulunmuyor."/>:null}</div>{reserve?<p className="roster-reserve">Yedek: <strong>{reserve.name}</strong></p>:null}</section></div>}
function PlayerMatchCard({match,mapPool,canAccess,teamId,operations,onMessage,onChanged}){const [file,setFile]=useState(null);const [vetoMap,setVetoMap]=useState("");const copy=value=>navigator.clipboard.writeText(value);const veto=async action=>{if(!vetoMap)return onMessage("Önce harita seçmelisin.");const result=await operations.submitTournamentMapVeto(match.id,vetoMap,action);onMessage(result.ok?`${vetoMap} için ${action==="ban"?"ban":"pick"} kaydedildi.`:result.message);if(result.ok)onChanged?.();};return <article className="active-match-card"><div><span>{match.scheduled_at?new Date(match.scheduled_at).toLocaleString("tr-TR"):"Saat bekleniyor"}</span><strong>{match.team_a_name||"Bekleniyor"} — {match.team_b_name||"Bekleniyor"}</strong><small>{match.status==="live"?"CANLI":match.status}</small></div>{canAccess?<><div className="match-access-grid"><Access label="Sunucu IP" value={match.server_ip} onCopy={copy}/><Access label="Lobi kodu" value={match.lobby_code} onCopy={copy}/><Access label="Server Pass" value={match.server_password} onCopy={copy}/><Access label="Harita / Veto" value={match.map_veto}/></div>{mapPool.length?<div className="map-veto-controls"><select value={vetoMap} onChange={event=>setVetoMap(event.target.value)}><option value="">Harita seç</option>{mapPool.map(map=><option key={map} value={map}>{map}</option>)}</select><button onClick={()=>veto("ban")}>Banla</button><button onClick={()=>veto("pick")}>Seç</button></div>:<p className="form-note">Organizatör henüz harita havuzu belirlemedi.</p>}</>:<p className="match-locked">Lobi bilgileri yalnızca eşleşmedeki takım oyuncularına açıktır.</p>}{canAccess&&teamId?<label className="evidence-upload"><ImageUp/>{file?file.name:"Skor kanıtı yükle"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>setFile(event.target.files?.[0]||null)}/><button disabled={!file} onClick={async event=>{event.preventDefault();const result=await operations.uploadTournamentEvidence(match.id,teamId,file);onMessage(result.ok?"Maç kanıtı yüklendi.":result.message);}}>Gönder</button></label>:null}{match.evidence_url?<a href={match.evidence_url} target="_blank" rel="noreferrer" className="evidence-link">Yüklenen kanıtı görüntüle</a>:null}</article>}
function Access({label,value,onCopy}){return <div><span>{label}</span><strong>{value||"Henüz paylaşılmadı"}</strong>{value&&onCopy?<button onClick={()=>onCopy(value)} aria-label={label+" kopyala"}><Copy/></button>:null}</div>}
function MatchManager({match,operations,onSaved}){const [form,setForm]=useState({scheduledAt:localDateTime(match.scheduled_at),serverIp:match.server_ip||"",serverPassword:match.server_password||"",lobbyCode:match.lobby_code||"",mapVeto:match.map_veto||"",status:match.status||"scheduled",scoreA:match.score_a??0,scoreB:match.score_b??0,ruling:match.ruling||""});const change=key=>event=>setForm(value=>({...value,[key]:event.target.value}));return <article className="match-manager"><h3>{match.team_a_name||"Bekleniyor"} — {match.team_b_name||"Bekleniyor"}</h3><div><label>Maç saati<input type="datetime-local" value={form.scheduledAt} onChange={change("scheduledAt")}/></label><label>Durum<select value={form.status} onChange={change("status")}><option value="scheduled">Planlandı</option><option value="live">Canlı</option><option value="completed">Tamamlandı</option><option value="cancelled">İptal</option></select></label><label>Sunucu IP<input value={form.serverIp} onChange={change("serverIp")}/></label><label>Server Pass<input value={form.serverPassword} onChange={change("serverPassword")}/></label><label>Lobi kodu<input value={form.lobbyCode} onChange={change("lobbyCode")}/></label><label>Harita / Map veto<input value={form.mapVeto} onChange={change("mapVeto")} placeholder="Mirage • BO1"/></label><label>{match.team_a_name||"A"} skoru<input type="number" min="0" value={form.scoreA} onChange={change("scoreA")}/></label><label>{match.team_b_name||"B"} skoru<input type="number" min="0" value={form.scoreB} onChange={change("scoreB")}/></label><label className="wide">Hakem kararı / Hükmen açıklaması<input value={form.ruling} onChange={change("ruling")}/></label></div><div className="match-manager-actions"><button onClick={async()=>{const result=await operations.saveTournamentMatch(match.id,{...form,scheduledAt:toIso(form.scheduledAt)});onSaved(result.ok?"Maç ve lobi bilgileri kaydedildi.":result.message);}}>Lobiyi Kaydet</button><button onClick={async()=>{const result=await operations.recordTournamentMatchResult(match.id,form);onSaved(result.ok?"Skor kaydedildi ve kazanan üst tura taşındı.":result.message);}}>Skoru Onayla</button><button onClick={async()=>{const result=await operations.recordTournamentMatchResult(match.id,{...form,status:"cancelled"});onSaved(result.ok?"Maç iptal edildi.":result.message);}}>Maçı İptal Et</button></div></article>}
function SettingsForm({value,setValue,onSave}){const change=key=>event=>setValue(current=>({...current,[key]:event.target.value}));return <div className="management-form"><label>Başlangıç<input type="datetime-local" value={value.startsAt} onChange={change("startsAt")}/></label><label>Bölge<input value={value.region} onChange={change("region")} placeholder="TR / EU"/></label><label>Oyun modu<input value={value.gameMode} onChange={change("gameMode")} placeholder="5v5 / 1v1"/></label><label>Katılım ücreti<input type="number" min="0" value={value.entryFee} onChange={change("entryFee")}/></label><label>Check-in başlangıcı<input type="datetime-local" value={value.checkInOpensAt} onChange={change("checkInOpensAt")}/></label><label>Check-in bitişi<input type="datetime-local" value={value.checkInClosesAt} onChange={change("checkInClosesAt")}/></label><label className="wide">Discord sunucu davet bağlantısı<input value={value.organizerContact} onChange={change("organizerContact")}/></label><label className="wide">Twitch / YouTube yayın bağlantısı<input value={value.streamUrl} onChange={change("streamUrl")} placeholder="https://twitch.tv/... veya https://youtube.com/watch?v=..."/></label><label className="wide">Harita havuzu (virgülle ayır)<input value={value.mapPoolText} onChange={change("mapPoolText")} placeholder="Mirage, Inferno, Ancient"/></label><label className="wide">Kural kitabı<textarea rows="8" value={value.rules} onChange={change("rules")} placeholder="BO formatı, harita ban sistemi, anti-cheat, geç kalma ve itiraz kuralları..."/></label><button className="primary-button wide" onClick={onSave}>Ayarları kaydet</button></div>}







