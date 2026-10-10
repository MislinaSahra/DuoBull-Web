import { Check, Edit3, PackagePlus, Plus, ShieldCheck, Trash2, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAdminOperations } from "../context/AdminOperationsContext.jsx";
import { games, productOptions } from "../data/mockData.js";
import { formatPrize, prizeInputValue } from "../utils/currency.js";
import { assignBalance, fetchBalanceUsers, fetchBalanceUserByEmail } from "../services/BalanceService.js";
import { assignLoyaltyXp } from "../services/LoyaltyService.js";
import { clearCompletedOrders, deleteOrder, deliverOrderCode, fetchOrders, subscribeToOrders } from "../services/OrderService.js";
import { useEngagement } from "../context/EngagementContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { deleteMatchEvidence, fetchMatchEvidence, reviewMatchEvidence } from "../services/TeamMatchService.js";

const titles = { teams: "Takım Onay Yönetimi", stock: "Ödül Stoğu Girişi", tournament: "Turnuva Yayınlama", balance: "Kullanıcı Bakiye / XP Tanımla", orders: "Sipariş Yönetimi", tournamentApplications: "Turnuva Katılım Başvuruları", tournamentRequests: "Turnuva Oluşturma Talepleri", support: "Destek Talepleri", matchEvidence: "Maç Sonucu Kanıtları" };

export default function AdminManagementModal({ view, entityId, onClose, embedded = false }) {
  const operations = useAdminOperations();
  const engagement = useEngagement();
  const { user } = useAuth();
  const [amount, setAmount] = useState(25);
  const [selectedProduct, setSelectedProduct] = useState(productOptions[0].id);
  const [stockOperation, setStockOperation] = useState("add");
  const [message, setMessage] = useState("");

  const content = <section className={embedded ? "admin-workspace" : "glass-card max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl p-6"}>
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div><p className="text-xs font-black uppercase tracking-widest text-bull-neon">Yönetim görünümü</p><h2 id="admin-modal-title" className="mt-1 text-2xl font-black">{titles[view]}</h2></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Paneli kapat"><X className="h-5 w-5" /></button>
        </div>

        {view === "teams" ? <><TeamView operations={operations} entityId={entityId} />{!entityId ? <ActiveTeams operations={operations} setMessage={setMessage} /> : null}</> : null}
        {view === "stock" ? (
          <form className="mt-6 grid max-w-md gap-4" onSubmit={async (event) => { event.preventDefault(); const value = Number(amount); if (value > 0) { const result = await operations.updateProductStock(selectedProduct, stockOperation === "add" ? value : -value); setMessage(result.ok ? `${result.product} stoğu ${result.stockCount} olarak güncellendi.` : result.message); } }}>
            <label className="block text-sm font-bold text-white/70">Ürün kategorisi<select value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0a0711] px-4 py-3 text-white outline-none focus:border-bull-neon">{productOptions.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
            <fieldset><legend className="text-sm font-bold text-white/70">İşlem tipi</legend><div className="mt-2 grid grid-cols-2 gap-2">{[["add", "Ekle"], ["remove", "Çıkar"]].map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-bold ${stockOperation === value ? "border-bull-neon/50 bg-bull-neon/10 text-white" : "border-white/10 bg-white/[0.03] text-white/55"}`}><input type="radio" name="stock-operation" value={value} checked={stockOperation === value} onChange={(event) => setStockOperation(event.target.value)} />{label}</label>)}</div></fieldset>
            <label className="block text-sm font-bold text-white/70">Eklenecek stok adedi<input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-bull-neon" /></label>
            <button type="submit" className="primary-button"><PackagePlus className="h-4 w-4" /> Stoğu Kaydet</button>
          </form>
        ) : null}
        {view === "tournament" ? <TournamentDrafts operations={operations} setMessage={setMessage} /> : null}
        {view === "tournament" ? <FeaturedTournamentManager operations={operations} setMessage={setMessage} /> : null}
        {view === "balance" ? <BalanceLookupView setMessage={setMessage} /> : null}
        {view === "orders" ? <OrdersView /> : null}
        {view === "tournamentApplications" ? <TournamentApplicationsView operations={operations} /> : null}
        {view === "tournamentRequests" ? <TournamentRequestsView operations={operations} /> : null}
        {view === "support" ? <SupportTicketsView engagement={engagement} adminName={user.name} /> : null}
        {view === "matchEvidence" ? <MatchEvidenceView /> : null}
        {message ? <p className="mt-5 rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm font-bold text-emerald-200" aria-live="polite">{message}</p> : null}
      </section>;
  if (embedded) return content;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>{content}</div>;
}

function MatchEvidenceView() {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(null);
  const refresh = () => fetchMatchEvidence().then(setItems);
  useEffect(() => { refresh(); }, []);

  const review = async (id, decision) => {
    const result = await reviewMatchEvidence(id, decision);
    setMessage(result.ok ? (decision === "verified" ? "Maç doğrulandı ve DuoBull Eşleşmesi sayısına eklendi." : "Maç kanıtı reddedildi.") : result.message);
    if (result.ok) refresh();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await deleteMatchEvidence(deleting.id, deleting.url);
    setMessage(result?.ok === false ? result.message : "Maç kanıtı kalıcı olarak silindi.");
    setDeleting(null);
    if (result?.ok !== false) refresh();
  };

  return <div className="mt-5">
    <p className="mb-4 text-xs leading-5 text-white/45">Takım Bul maç odasından yüklenen sonuçları kontrol edin. Yalnızca onaylanan sonuçlar DuoBull Eşleşmesi sayılır.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
        <a href={item.url} target="_blank" rel="noreferrer"><img src={item.url} alt={`${item.teamName} maç sonucu`} className="h-44 w-full rounded-lg object-cover" /></a>
        <div className="mt-3">
          <div className="flex items-center justify-between gap-3">
            <div><h3 className="font-black">{item.teamName}</h3><p className="mt-1 text-xs text-white/45">{item.status === "pending" ? "Yönetici kontrolü bekliyor" : item.status === "verified" ? "Doğrulandı" : "Reddedildi"} • {new Date(item.completedAt).toLocaleDateString("tr-TR")}</p></div>
            <button type="button" onClick={() => setDeleting(item)} className="secondary-button border-red-300/20 p-2 text-red-200" aria-label="Maç kanıtını sil"><Trash2 className="h-4 w-4" /></button>
          </div>
          {item.status === "pending" ? <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => review(item.id, "rejected")} className="secondary-button border-red-300/20 py-2 text-xs text-red-200">Kanıtı Reddet</button><button type="button" onClick={() => review(item.id, "verified")} className="primary-button py-2 text-xs">Maçı Doğrula</button></div> : null}
        </div>
      </article>)}
      {!items.length ? <Empty text="Yüklenmiş maç kanıtı bulunmuyor." /> : null}
    </div>
    {message ? <p className="mt-4 text-xs font-bold text-emerald-200">{message}</p> : null}
    {deleting ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="evidence-delete-title" onMouseDown={(event) => event.target === event.currentTarget && setDeleting(null)}>
      <section className="glass-card w-full max-w-md rounded-2xl border border-red-300/20 p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-bull-neon">Kalıcı silme işlemi</p>
        <h3 id="evidence-delete-title" className="mt-2 text-xl font-black">Maç kanıtı silinsin mi?</h3>
        <p className="mt-3 text-sm leading-6 text-white/55"><strong className="text-white">{deleting.teamName}</strong> takımına ait kanıt ve inceleme kaydı kalıcı olarak kaldırılacak.</p>
        <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={() => setDeleting(null)} className="secondary-button py-3">Vazgeç</button><button type="button" onClick={confirmDelete} className="rounded-lg bg-red-500 px-4 py-3 text-sm font-black text-white hover:bg-red-400">Evet, Sil</button></div>
      </section>
    </div> : null}
  </div>;
}

function SupportTicketsView({ engagement, adminName }) {
  const [replying,setReplying]=useState(null); const [reply,setReply]=useState(""); const [deleting,setDeleting]=useState(null);
  return <div className="mt-5 space-y-3">{engagement.tickets.map(ticket=><article key={ticket.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-black">{ticket.subject}</h3><p className="mt-1 text-xs text-white/45">{ticket.userName} • {ticket.category} • {ticket.id}</p><p className="mt-3 text-sm leading-6 text-white/60">{ticket.message}</p></div><span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-200">{ticket.status==="answered"?"Yanıtlandı":ticket.status==="closed"?"Kapalı":"Açık"}</span></div>{(ticket.replies||[]).map(item=><p key={item.id} className="mt-3 rounded-lg bg-bull-neon/[0.06] p-3 text-sm text-white/65">{item.message}</p>)}{ticket.status!=="closed"?<div className="mt-4 flex flex-wrap gap-2">{replying===ticket.id?<form className="flex w-full gap-2" onSubmit={event=>{event.preventDefault();engagement.replyTicket(ticket.id,reply,adminName);setReply("");setReplying(null);}}><input required value={reply} onChange={event=>setReply(event.target.value)} placeholder="Yanıtınızı yazın..." className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white"/><button className="primary-button px-3 py-2 text-xs">Yanıtla</button></form>:<button type="button" onClick={()=>setReplying(ticket.id)} className="primary-button px-3 py-2 text-xs">Yanıt Yaz</button>}<button type="button" onClick={()=>engagement.closeTicket(ticket.id)} className="secondary-button px-3 py-2 text-xs">Talebi Kapat</button></div>:<div className="mt-4 flex justify-end">{deleting===ticket.id?<div className="flex items-center gap-2 rounded-lg border border-red-300/20 bg-red-400/[0.06] p-2"><span className="text-xs font-bold text-red-100">Geçmişten kalıcı olarak silinsin mi?</span><button type="button" onClick={()=>setDeleting(null)} className="secondary-button px-3 py-2 text-xs">Vazgeç</button><button type="button" onClick={async()=>{await engagement.deleteTicket(ticket.id);setDeleting(null);}} className="rounded-lg bg-red-500 px-3 py-2 text-xs font-black text-white">Evet, Sil</button></div>:<button type="button" onClick={()=>setDeleting(ticket.id)} className="rounded-lg border border-red-300/20 px-3 py-2 text-xs font-black text-red-200 hover:bg-red-400/10">Geçmişten Sil</button>}</div>}</article>)}{engagement.tickets.length===0?<Empty text="Destek talebi bulunmuyor."/>:null}</div>;
}

function TeamView({ operations, entityId }) {
  const visibleTeams = entityId ? operations.pendingTeams.filter((team) => team.id === entityId) : operations.pendingTeams;
  return <div className="mt-5 space-y-3">{visibleTeams.map((team) => <article key={team.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-lg font-black">{team.name}</h3><p className="mt-1 text-sm text-bull-neon">{team.game}</p><div className="mt-3 grid gap-1 text-xs text-white/50"><p>Kaptan: {team.captain || team.players[0]}</p><p>Oyuncular: {team.players.join(", ")}</p>{team.role ? <p>Aranan rol: {team.role}</p> : null}{team.level ? <p>Seviye: {team.level}</p> : null}{team.region ? <p>Bölge: {team.region}</p> : null}<p>Başvuru: {team.appliedAt}</p></div></div><div className="flex gap-2"><button type="button" onClick={() => operations.reviewTeam(team.id, "rejected")} className="secondary-button px-3 py-2 text-xs"><XCircle className="h-4 w-4" /> Reddet</button><button type="button" onClick={() => operations.approveTeam(team.id)} className="primary-button px-3 py-2 text-xs"><Check className="h-4 w-4" /> Onayla</button></div></div></article>)}{visibleTeams.length === 0 ? <Empty text="Bu takım başvurusu artık beklemede değil." /> : null}</div>;
}

function ActiveTeams({ operations, setMessage }) {
  return <div className="mt-7 border-t border-white/10 pt-5"><h3 className="mb-3 text-lg font-black">Onaylanmış Takımlar</h3><div className="space-y-3">{operations.activeTeams.map((team) => <article key={team.id} className="flex flex-col gap-3 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between"><div><span className="text-xs font-black text-emerald-200">Aktif • {team.game}</span><h4 className="mt-1 font-black">{team.name}</h4><p className="mt-1 text-xs text-white/45">Kaptan: {team.captain || team.players[0]}</p></div><button type="button" onClick={() => { const result = operations.deleteTeam(team.id); if (result.ok) setMessage(`${team.name} ve ilişkili turnuva kayıtları kaldırıldı.`); }} className="secondary-button border-red-300/20 px-3 py-2 text-red-200"><Trash2 className="h-4 w-4" /> Takımı Kaldır</button></article>)}{operations.activeTeams.length === 0 ? <Empty text="Onaylanmış takım bulunmuyor." /> : null}</div></div>;
}

function TournamentDrafts({ operations, setMessage }) {
  const [creating, setCreating] = useState(false);
  return <div className="mt-5"><div className="mb-4 flex flex-col gap-3 rounded-xl border border-bull-neon/20 bg-bull-neon/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-black">Yeni turnuva taslağı</h3><p className="mt-1 text-xs text-white/50">Turnuva bilgilerini oluştur, daha sonra düzenle veya yayınla.</p></div><button type="button" onClick={() => setCreating((value) => !value)} className="primary-button shrink-0 px-4 py-2.5"><Plus className="h-4 w-4" /> Turnuva Oluştur</button></div>{creating ? <CreateTournamentForm operations={operations} onCreated={(name) => { setCreating(false); setMessage(`${name} taslak olarak oluşturuldu.`); }} /> : null}<div className="space-y-3">{operations.draftTournaments.map((tournament) => <TournamentDraftCard key={tournament.id} tournament={tournament} operations={operations} setMessage={setMessage} />)}{operations.draftTournaments.length === 0 ? <Empty text="Yayınlanmayı bekleyen turnuva taslağı bulunmuyor." /> : null}</div>{operations.publishedTournaments.length ? <div className="mt-7"><h3 className="mb-3 text-lg font-black">Yayınlanan Turnuvalar</h3><div className="space-y-3">{operations.publishedTournaments.map((tournament) => <article key={tournament.id} className="flex flex-col gap-3 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between"><div><span className="text-xs font-black text-emerald-200">Yayınlandı • {tournament.game}</span><h4 className="mt-1 font-black">{tournament.name}</h4></div><button type="button" onClick={() => { operations.deleteTournament(tournament.id); setMessage(`${tournament.name} kalıcı olarak silindi.`); }} className="secondary-button border-red-300/20 px-3 py-2 text-red-200"><Trash2 className="h-4 w-4" /> Sil</button></article>)}</div></div> : null}</div>;
}

function FeaturedTournamentManager({ operations, setMessage }) {
  if (!operations.publishedTournaments.length) return null;
  return <section className="mt-7 border-t border-white/10 pt-5"><h3 className="text-lg font-black">Ana Sayfa Seçimi</h3><p className="mt-1 text-xs text-white/45">Yalnızca işaretlenen turnuvalar ana sayfada gösterilir.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{operations.publishedTournaments.map((tournament) => <button type="button" key={tournament.id} onClick={() => { operations.setTournamentFeatured(tournament.id, !tournament.isFeatured); setMessage(`${tournament.name} ${tournament.isFeatured ? "öne çıkanlardan kaldırıldı" : "öne çıkarıldı"}.`); }} className={`rounded-xl border p-4 text-left transition ${tournament.isFeatured ? "border-bull-neon/50 bg-bull-neon/10" : "border-white/10 bg-white/[0.03]"}`}><span className="text-xs font-black text-bull-neon">{tournament.game}</span><span className="mt-1 block font-black">{tournament.name}</span><span className="mt-2 block text-xs text-white/45">{tournament.isFeatured ? "✓ Ana sayfada gösteriliyor" : "Ana sayfaya eklemek için tıkla"}</span></button>)}</div></section>;
}

function CreateTournamentForm({ operations, onCreated }) {
  const [form, setForm] = useState({ name: "", game: "", date: "", prize: "", participantLimit: 64 });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <form className="mb-4 grid gap-3 rounded-xl border border-white/10 bg-black/25 p-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); operations.createTournamentDraft({ ...form, prize: formatPrize(form.prize), participantLimit: Number(form.participantLimit) }); onCreated(form.name); }}><EditField label="Turnuva adı" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} /><label className="text-xs font-bold text-white/60">Oyun<select required value={form.game} onChange={update("game")} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0a0711] px-3 py-2.5 text-sm text-white outline-none focus:border-bull-neon"><option value="" disabled>Oyun seçiniz</option>{games.map((game) => <option key={game.id} value={game.name}>{game.name}</option>)}</select></label><EditField label="Tarih" type="date" value={form.date} onChange={(value) => setForm((current) => ({ ...current, date: value }))} /><EditField label="Ödül havuzu" prefix="₺" value={form.prize} onChange={(value) => setForm((current) => ({ ...current, prize: value }))} /><EditField label="Katılım sınırı" type="number" value={form.participantLimit} onChange={(value) => setForm((current) => ({ ...current, participantLimit: value }))} /><button type="submit" className="primary-button self-end py-2.5"><Plus className="h-4 w-4" /> Taslak Oluştur</button></form>;
}

function TournamentDraftCard({ tournament, operations, setMessage }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ date: tournament.date, prize: prizeInputValue(tournament.prize), participantLimit: tournament.participantLimit || 64 });
  const gameStyle = tournament.game === "Valorant" ? "border-red-300/30 bg-red-500/15 text-red-200" : tournament.game.includes("Counter") ? "border-amber-300/30 bg-amber-500/15 text-amber-200" : "border-purple-300/30 bg-purple-500/15 text-purple-200";
  return <article className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${gameStyle}`}>{tournament.game}</span><h3 className="mt-3 text-lg font-black">{tournament.name}</h3><p className="mt-2 text-xs text-white/50">{tournament.date} • {tournament.prize} • {tournament.participantLimit || 64} takım</p></div><div className="flex flex-wrap gap-2"><button type="button" className="secondary-button px-4 py-2.5" onClick={() => setEditing((value) => !value)}><Edit3 className="h-4 w-4" /> Düzenle</button><button type="button" className="primary-button px-4 py-2.5" onClick={() => { const response = operations.publishTournament(tournament.id); setMessage(response.ok ? `${response.name} (${tournament.game}) durumu: Yayınlandı.` : response.message); }}><ShieldCheck className="h-4 w-4" /> Yayınla</button></div></div>{editing ? <form className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-3" onSubmit={(event) => { event.preventDefault(); operations.updateTournamentDraft(tournament.id, { ...form, prize: formatPrize(form.prize), participantLimit: Number(form.participantLimit) }); setEditing(false); setMessage(`${tournament.name} taslağı güncellendi.`); }}><EditField label="Tarih" type="date" value={form.date} onChange={(value) => setForm((current) => ({ ...current, date: value }))} /><EditField label="Ödül havuzu" prefix="₺" value={form.prize} onChange={(value) => setForm((current) => ({ ...current, prize: value }))} /><EditField label="Katılım sınırı" type="number" value={form.participantLimit} onChange={(value) => setForm((current) => ({ ...current, participantLimit: value }))} /><button type="submit" className="primary-button py-2 sm:col-span-3">Değişiklikleri Kaydet</button></form> : null}</article>;
}

function EditField({ label, type = "text", value, onChange, prefix }) { return <label className="text-xs font-bold text-white/60">{label}<span className={`mt-2 flex overflow-hidden rounded-lg border border-white/10 bg-black/35 focus-within:border-bull-neon ${prefix ? "" : "block"}`}>{prefix ? <span className="flex items-center border-r border-white/10 px-3 text-sm font-black text-bull-gold">{prefix}</span> : null}<input required type={type} min={type === "number" ? 2 : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none" /></span></label>; }

function Empty({ text }) { return <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">{text}</p>; }

function BalanceLookupView({ setMessage }) {
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState(1000);
  const [type, setType] = useState("balance");
  const [searchMessage, setSearchMessage] = useState("");
  const search = async () => {
    const result = await fetchBalanceUserByEmail(email);
    setSelected(result);
    setSearchMessage(result ? "" : "Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.");
  };
  return <form noValidate className="mt-6 grid max-w-md gap-4" onSubmit={async (event) => { event.preventDefault(); if (!selected) return search(); const value = Number(amount); if (!Number.isInteger(value) || value < 1 || value > 1000000) { setMessage("Miktar 1 ile 1.000.000 arasında tam sayı olmalıdır."); return; } const result = type === "xp" ? await assignLoyaltyXp(selected.id, value) : await assignBalance(selected.id, value); setMessage(result.ok ? `${selected.email} hesabına ${value.toLocaleString("tr-TR")} ${type === "xp" ? "XP" : "BP"} tanımlandı.` : result.message); }}><label className="text-sm font-bold text-white/70">Kullanıcı e-postası<div className="mt-2 flex gap-2"><input required type="email" value={email} onChange={(event) => { setEmail(event.target.value); setSelected(null); }} placeholder="oyuncu@ornek.com" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-bull-neon" /><button type="button" onClick={search} className="secondary-button px-4">Ara</button></div></label>{searchMessage ? <p className="text-xs font-bold text-red-200">{searchMessage}</p> : null}{selected ? <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/[0.06] p-4"><p className="font-black">{selected.name}</p><p className="mt-1 text-xs text-white/50">{selected.email}</p></div> : null}<fieldset disabled={!selected}><legend className="text-sm font-bold text-white/70">Tanımlama türü</legend><div className="mt-2 grid grid-cols-2 gap-2">{[["balance", "Bull Puan"], ["xp", "Sadakat XP"]].map(([id, label]) => <label key={id} className={`cursor-pointer rounded-lg border p-3 text-center text-sm font-black ${type === id ? "border-bull-neon/40 bg-bull-neon/10" : "border-white/10 bg-white/[0.03] text-white/50"}`}><input type="radio" className="sr-only" name="assignment-type" value={id} checked={type === id} onChange={(event) => setType(event.target.value)} />{label}</label>)}</div></fieldset><label className="text-sm font-bold text-white/70">Miktar<input required disabled={!selected} type="number" min="1" max="1000000" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-white outline-none disabled:opacity-40" /><small className="mt-1 block text-[10px] text-white/35">Tek işlemde en fazla 1.000.000.</small></label><button type="submit" disabled={!selected} className="primary-button disabled:opacity-45">{type === "xp" ? "XP Tanımla" : "Bakiye Tanımla"}</button></form>;
}

function BalanceView({ setMessage }) {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState(1000);
  const [type, setType] = useState("balance");
  useEffect(() => { fetchBalanceUsers().then((items) => { setUsers(items); setUserId((current) => current || items[0]?.id || ""); }); }, []);
  return <form noValidate className="mt-6 grid max-w-md gap-4" onSubmit={async (event) => { event.preventDefault(); const value = Number(amount); if (!userId) { setMessage("Önce bir kullanıcı seçin."); return; } if (!Number.isInteger(value) || value < 1 || value > 1000000) { setMessage("Miktar 1 ile 1.000.000 arasında tam sayı olmalıdır."); return; } const result = type === "xp" ? await assignLoyaltyXp(userId, value) : await assignBalance(userId, value); const selected = users.find((item) => item.id === userId); setMessage(result.ok ? type === "xp" ? `${selected?.email} hesabına ${value.toLocaleString("tr-TR")} XP tanımlandı. Yeni sadakat XP'si: ${result.xp.toLocaleString("tr-TR")}.` : `${selected?.email} hesabına ${value.toLocaleString("tr-TR")} BP tanımlandı. Yeni bakiye: ${result.balance.toLocaleString("tr-TR")} BP.` : result.message); }}><label className="text-sm font-bold text-white/70">Kullanıcı<select required value={userId} onChange={(event) => setUserId(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0a0711] px-4 py-3 text-white outline-none focus:border-bull-neon"><option value="" disabled>Kullanıcı seçiniz</option>{users.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.email}</option>)}</select></label><fieldset><legend className="text-sm font-bold text-white/70">Tanımlama türü</legend><div className="mt-2 grid grid-cols-2 gap-2">{[["balance", "Bull Puan"], ["xp", "Sadakat XP"]].map(([id, label]) => <label key={id} className={`cursor-pointer rounded-lg border p-3 text-center text-sm font-black ${type === id ? "border-bull-neon/40 bg-bull-neon/10 text-white" : "border-white/10 bg-white/[0.03] text-white/50"}`}><input type="radio" className="sr-only" name="assignment-type" value={id} checked={type === id} onChange={(event) => setType(event.target.value)} />{label}</label>)}</div></fieldset><label className="text-sm font-bold text-white/70">Tanımlanacak {type === "xp" ? "XP" : "BP"}<input required type="number" min="1" max="1000000" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-bull-neon" /><small className="mt-1 block text-[10px] text-white/35">Tek işlemde en fazla 1.000.000.</small></label><button type="submit" disabled={!users.length} className="primary-button disabled:opacity-45">{type === "xp" ? "XP Tanımla" : "Bakiye Tanımla"}</button>{!users.length ? <p className="text-xs text-amber-200">Henüz kayıtlı kullanıcı bulunmuyor.</p> : null}</form>;
}

function OrdersView() {
  const [orders, setOrders] = useState([]);
  const [deliveringId, setDeliveringId] = useState(null);
  const [deliveryCode, setDeliveryCode] = useState("");
  const [deliveryMessage, setDeliveryMessage] = useState("");
  useEffect(() => { const refresh = () => fetchOrders().then(setOrders); refresh(); return subscribeToOrders(refresh); }, []);
  const handleDeliverCode = async (orderId) => { const result = await deliverOrderCode(orderId, deliveryCode); setDeliveryMessage(result.ok ? "Ürün kodu teslim edildi ve kullanıcı bilgilendirildi." : result.message); if (result.ok) { setDeliveringId(null); setDeliveryCode(""); } };
  return <div className="mt-5 space-y-3">{orders.some((order) => order.status === "completed") ? <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="font-black">Tamamlanan Siparişler</p><button type="button" onClick={() => { const result = clearCompletedOrders(); setDeliveryMessage(`${result.removed} tamamlanan sipariş silindi.`); }} className="secondary-button border-red-300/20 px-3 py-2 text-red-200"><Trash2 className="h-4 w-4" /> Geçmişi Temizle</button></div> : null}{orders.map((order) => <article key={order.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-black">{order.items.map((item) => item.name).join(", ")}</h3><p className="mt-1 text-xs text-white/45">{order.userEmail} • {new Date(order.createdAt).toLocaleString("tr-TR")} • {order.total.toLocaleString("tr-TR")} BP</p>{order.delivery_code ? <p className="mt-2 text-xs font-bold text-emerald-200">Teslim kodu: {order.delivery_code}</p> : null}</div>{order.status === "completed" ? <div className="flex items-center gap-2"><span className="text-sm font-black text-emerald-200">Tamamlandı</span><button type="button" onClick={() => deleteOrder(order.id)} className="secondary-button border-red-300/20 px-2.5 py-2 text-red-200" aria-label="Siparişi sil"><Trash2 className="h-4 w-4" /></button></div> : <button type="button" onClick={() => { setDeliveringId(order.id); setDeliveryCode(""); setDeliveryMessage(""); }} className="primary-button px-3 py-2 text-xs">Kodu Teslim Et</button>}</div>{deliveringId === order.id ? <form className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row" onSubmit={(event) => { event.preventDefault(); handleDeliverCode(order.id); }}><input required value={deliveryCode} onChange={(event) => setDeliveryCode(event.target.value)} placeholder="Ürün kodunu girin" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white outline-none focus:border-bull-neon" /><button type="submit" className="primary-button px-4 py-2.5">Gönder</button><button type="button" onClick={() => setDeliveringId(null)} className="secondary-button px-4 py-2.5">Vazgeç</button></form> : null}</article>)}{deliveryMessage ? <p className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm font-bold text-emerald-200">{deliveryMessage}</p> : null}{orders.length === 0 ? <Empty text="Henüz sipariş bulunmuyor." /> : null}</div>;
}

function TournamentApplicationsView({ operations }) {
  const pending = operations.tournamentApplications.filter((item) => item.status === "pending");
  return <div className="mt-5 space-y-3">{pending.map((item) => <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-black">{item.tournamentName}</h3><p className="mt-1 text-xs text-white/45">{item.userName} • {item.userEmail}</p></div><div className="flex gap-2"><button type="button" onClick={() => operations.reviewTournamentApplication(item.id, "rejected")} className="secondary-button px-3 py-2 text-xs">Reddet</button><button type="button" onClick={() => operations.reviewTournamentApplication(item.id, "approved")} className="primary-button px-3 py-2 text-xs">Onayla</button></div></div></article>)}{pending.length === 0 ? <Empty text="Bekleyen turnuva katılım başvurusu yok." /> : null}</div>;
}

function TournamentRequestsView({ operations }) {
  const [statusMessage, setStatusMessage] = useState("");
  const pending = operations.tournamentRequests.filter((item) => item.status === "pending");
  const review = async (id, decision) => { const result = await operations.reviewTournamentRequest(id, decision); setStatusMessage(result.ok ? decision === "approved" ? "Turnuva onaylandı ve yayınlandı." : "Turnuva talebi reddedildi." : `İşlem tamamlanamadı: ${result.message}`); };
  return <div className="mt-5 space-y-3">{pending.map((item) => <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><h3 className="font-black">{item.name}</h3><p className="mt-1 text-xs text-bull-neon">{item.game} • {item.formatName || "Format belirtilmedi"}</p><p className="mt-2 text-xs text-white/45">Talep sahibi: {item.requesterName} • {item.date} • {item.prize}</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => review(item.id, "rejected")} className="secondary-button px-3 py-2 text-xs">Reddet</button><button type="button" onClick={() => review(item.id, "approved")} className="primary-button px-3 py-2 text-xs">Onayla ve Yayınla</button></div></article>)}{statusMessage ? <p className="rounded-lg border border-white/10 p-3 text-xs font-bold">{statusMessage}</p> : null}{pending.length === 0 ? <Empty text="Bekleyen turnuva oluşturma talebi yok." /> : null}</div>;
}
