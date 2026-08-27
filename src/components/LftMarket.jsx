import { BadgeCheck, Search, Send, Trash2, UserRoundSearch, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useAdminOperations } from "../context/AdminOperationsContext.jsx";
import { useGameCatalog } from "../context/GameCatalogContext.jsx";
import { filterOptions } from "../data/mockData.js";
import { closeLftListing, deleteLftListing, fetchLftListings, inviteLftPlayer, saveLftListing, subscribeLft } from "../services/LftService.js";

export default function LftMarket({ compact = false }) {
  const { user } = useAuth();
  const operations = useAdminOperations();
  const { gameNames, getGame } = useGameCatalog();
  const initialGame = gameNames.includes(user?.game) ? user.game : gameNames[0] || "";
  const [list, setList] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);
  const [showListings, setShowListings] = useState(false);
  const [page, setPage] = useState(1);
  const [invite, setInvite] = useState(null);
  const [message, setMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(false);
  const [form, setForm] = useState({ game: initialGame, role: getGame(initialGame).roles?.[0] || "", rank: user?.rank || "", region: user?.region || "Türkiye", availability: "", about: "" });
  const teams = operations.teams.filter((team) => team.captainId === user?.id && team.status === "approved");
  const refresh = () => fetchLftListings().then((result) => result.ok ? setList(result.list) : setMessage(result.message));
  useEffect(() => { refresh(); return subscribeLft(refresh); }, []);
  useEffect(() => {
    if (!gameNames.length || gameNames.includes(form.game)) return;
    const game = gameNames[0];
    setForm((current) => ({ ...current, game, role: getGame(game).roles?.[0] || "" }));
  }, [gameNames, form.game, getGame]);
  const filtered = useMemo(() => list.filter((item) => `${item.profiles?.username} ${item.game} ${item.role} ${item.rank} ${item.region}`.toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR"))), [list, search]);
  const pageSize = compact ? 1 : 6;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleListings = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [search, showListings]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  const updateGame = (game) => setForm((current) => ({ ...current, game, role: getGame(game).roles?.[0] || "" }));

  return <section className={`${compact ? "lft-market lft-market--compact" : "container-shell lft-market"}`} id="oyuncu-pazari">
    <div className="lft-toolbar"><div><span className="section-kicker">LFT • Oyuncu Pazarı</span><h2>Takım arayan oyuncular</h2><p>Serbest oyuncular ilan açar, kaptanlar doğrudan davet gönderir.</p></div><div className="lft-toolbar__actions"><button className="secondary-button" onClick={() => setShowListings((value) => !value)}>{showListings ? "İlanları Gizle" : `İlanları Gör${list.length ? ` (${list.length})` : ""}`}</button><button className="primary-button" onClick={() => setEditing((value) => !value)}><UserRoundSearch />{editing ? "Kapat" : "Takım Arıyorum"}</button></div></div>
    {editing ? <form className="lft-form" onSubmit={async (event) => { event.preventDefault(); const result = await saveLftListing(user.id, form); setMessage(result.ok ? "Oyuncu ilanınız yayınlandı." : result.message); if (result.ok) { setEditing(false); refresh(); } }}>
      <select required value={form.game} onChange={(event) => updateGame(event.target.value)}><option value="" disabled>Aktif oyun seç</option>{gameNames.map((game) => <option key={game}>{game}</option>)}</select>
      <select required value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="" disabled>Rol seç</option>{(getGame(form.game).roles || []).map((role) => <option key={role}>{role}</option>)}</select>
      <select value={form.rank} onChange={(event) => setForm({ ...form, rank: event.target.value })}><option value="">Rank / seviye seç</option>{(getGame(form.game).ranks || []).map((rank) => <option key={rank}>{rank}</option>)}</select>
      <select required value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })}>{filterOptions.regions.map((region) => <option key={region}>{region}</option>)}</select>
      <input value={form.availability} onChange={(event) => setForm({ ...form, availability: event.target.value })} placeholder="Uygun saatler" />
      <textarea value={form.about} onChange={(event) => setForm({ ...form, about: event.target.value })} placeholder="Oyun tarzın ve aradığın takım..." />
      <button className="primary-button">İlanı Yayınla</button><button type="button" className="secondary-button" onClick={async () => { const result = await closeLftListing(user.id); setMessage(result.ok ? "İlan kapatıldı." : result.message); refresh(); }}>Mevcut İlanımı Kapat</button>
    </form> : null}
    {showListings ? <><div className="lft-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Oyuncu, oyun veya rol ara..." /></div><div className="lft-grid">{visibleListings.map((item) => <article key={item.id}><Link to={`/oyuncu/${item.user_id}`} className="lft-player">{item.profiles?.avatar_url ? <img src={item.profiles.avatar_url} alt="" /> : <span>{item.profiles?.username?.slice(0, 2).toUpperCase()}</span>}<div><strong>{item.profiles?.username}{item.profiles?.is_verified ? <BadgeCheck /> : null}</strong><small>{item.region}</small></div></Link><div className="lft-tags"><b>{item.game}</b><b>{item.role}</b><b>{item.rank}</b></div>{item.about ? <p>{item.about}</p> : null}{item.user_id === user?.id ? <button className="secondary-button text-red-200" onClick={() => setDeleteTarget(true)}><Trash2 />İlanımı Sil</button> : teams.length ? <button className="secondary-button" onClick={() => setInvite(item)}><Send />Takıma Davet Et</button> : null}</article>)}{!filtered.length ? <div className="lft-empty">Aktif oyuncu ilanı yok.</div> : null}</div>{filtered.length > pageSize ? <nav className="lft-pagination" aria-label="Oyuncu ilanı sayfaları"><button type="button" disabled={page===1} onClick={()=>setPage(value=>value-1)}>‹</button><span>{page} / {pageCount}</span><button type="button" disabled={page===pageCount} onClick={()=>setPage(value=>value+1)}>›</button></nav> : null}</> : null}
    {message ? <p className="tournament-detail-message">{message}</p> : null}
    {invite ? <div className="roster-modal"><section><button onClick={() => setInvite(null)}><X /></button><span className="section-kicker">Takım Daveti</span><h2>{invite.profiles?.username}</h2><InviteForm teams={teams} onSend={async (teamId, note) => { const result = await inviteLftPlayer(invite.id, teamId, note); setMessage(result.ok ? "Takım daveti gönderildi." : result.message); if (result.ok) setInvite(null); }} /></section></div> : null}
    {deleteTarget ? <div className="roster-modal"><section><button onClick={() => setDeleteTarget(false)}><X /></button><span className="section-kicker">İlanı sil</span><h2>İlanını silmek istiyor musun?</h2><p className="mt-3 text-sm text-white/50">Bu işlem oyuncu pazarı ilanını kalıcı olarak kaldırır.</p><div className="mt-6 flex gap-3"><button className="secondary-button flex-1" onClick={() => setDeleteTarget(false)}>Vazgeç</button><button className="primary-button flex-1" onClick={async () => { const result = await deleteLftListing(user.id); setMessage(result.ok ? "İlan silindi." : result.message); if(result.ok){setDeleteTarget(false);refresh();} }}>İlanı Sil</button></div></section></div> : null}
  </section>;
}

function InviteForm({ teams, onSend }) { const [teamId, setTeamId] = useState(teams[0]?.id || ""); const [note, setNote] = useState(""); return <div className="lft-invite"><label>Takım<select value={teamId} onChange={(event) => setTeamId(event.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label>Mesaj<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Takımını ve teklifini kısaca anlat..." /></label><button className="primary-button" disabled={!teamId} onClick={() => onSend(teamId, note)}>Daveti Gönder</button></div>; }
