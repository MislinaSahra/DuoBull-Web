import { CalendarDays, CheckCircle2, Plus, ShieldCheck, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero.jsx";
import { useAdminOperations } from "../context/AdminOperationsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useGameCatalog } from "../context/GameCatalogContext.jsx";
import { formatPrize } from "../utils/currency.js";
import { fetchTournamentFormats } from "../services/TournamentFormatService.js";

const emptyForm = { name: "", game: "", prize: "", date: "", participantLimit: 64, formatId: "" };

export default function TournamentCreatePage() {
  const { user } = useAuth();
  const { gameNames } = useGameCatalog();
  const operations = useAdminOperations();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [formats, setFormats] = useState([]);
  useEffect(() => { fetchTournamentFormats({ activeOnly: true }).then(setFormats); }, []);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setResult("");
    const selectedFormat = formats.find((item) => item.id === form.formatId);
    const response = await operations.submitTournamentRequest({ ...form, formatName: selectedFormat?.name || "", participantLimit: Number(form.participantLimit), prize: formatPrize(form.prize), requesterEmail: user.email, requesterName: user.name });
    setSaving(false);
    if (!response.ok) { setError(response.message); return; }
    setResult("Turnuva başvurun yönetici incelemesine gönderildi.");
    setForm(emptyForm);
  };

  return <><PageHero eyebrow="Organizatör başvurusu" title="Turnuvanı planla." highlightedTitle="Başvurunu gönder." description="Turnuva bilgilerini eksiksiz doldur. Başvurun yönetici incelemesinden sonra yayınlanır ve profilindeki Turnuvalarım alanından takip edilir." backgroundKey="tournaments" actions={<><a href="#turnuva-basvurusu" className="primary-button">Başvuruyu Başlat</a><Link to="/profil?tab=tournaments" className="secondary-button">Turnuvalarımı Gör</Link></>} />
    <section id="turnuva-basvurusu" className="container-shell tournament-create-layout pb-16">
      <form onSubmit={submit} className="tournament-create-form">
        <div className="flex items-center gap-3"><span className="icon-tile"><Trophy className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-widest text-white/35">Turnuva başvurusu</p><h2 className="text-2xl font-black">Turnuva bilgileri</h2></div></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Turnuva adı" value={form.name} onChange={update("name")} placeholder="Turnuva adını yaz" />
          <label><span>Oyun</span><select required value={form.game} onChange={update("game")}><option value="" disabled>Oyun seçiniz</option>{gameNames.map((game) => <option key={game}>{game}</option>)}</select></label>
          <label><span>Turnuva formatı</span><select required value={form.formatId} onChange={update("formatId")} disabled={!formats.length}><option value="" disabled>{formats.length ? "Format seçiniz" : "Admin henüz format eklemedi"}</option>{formats.map((format) => <option key={format.id} value={format.id}>{format.name}</option>)}</select>{form.formatId ? <small className="mt-2 block text-[10px] font-normal leading-4 text-white/35">{formats.find((item) => item.id === form.formatId)?.description}</small> : null}</label>
          <CurrencyField label="Ödül havuzu" value={form.prize} onChange={(prize) => setForm((current) => ({ ...current, prize }))} placeholder="Ödül tutarı" />
          <Field label="Katılım sınırı" value={form.participantLimit} onChange={update("participantLimit")} type="number" min="2" />
          <Field label="Turnuva tarihi" value={form.date} onChange={update("date")} type="date" />
        </div>
        {result ? <p className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-200"><CheckCircle2 className="h-5 w-5" />{result}</p> : null}
        {error ? <p className="mt-5 rounded-lg border border-red-300/20 bg-red-400/10 p-4 text-sm font-bold text-red-200">{error}</p> : null}
        <button disabled={saving} className="primary-button mt-6 w-full py-3 disabled:opacity-45"><Plus className="h-4 w-4" />{saving ? "Gönderiliyor..." : "Turnuva Başvurusunu Gönder"}</button>
      </form>
      <aside className="tournament-create-info"><ShieldCheck /><h3>Başvuru süreci</h3><p>Gönderdiğin bilgiler yönetici tarafından incelenir. Onaylanan turnuva yayınlanır ve katılımcı kabul etmeye başlar.</p><div><Step icon={CheckCircle2} title="Bilgileri tamamla" /><Step icon={ShieldCheck} title="Yönetici incelemesi" /><Step icon={CalendarDays} title="Takvimde yayınlanma" /><Step icon={Users} title="Katılımcı yönetimi" /></div><Link to="/profil?tab=tournaments" className="secondary-button mt-5 w-full">Mevcut Turnuvalarımı Gör</Link></aside>
    </section>
  </>;
}

function Field({ label, ...props }) { return <label><span>{label}</span><input required {...props} /></label>; }
function CurrencyField({ label, value, onChange, placeholder }) {
  const change = (event) => {
    const digits = event.target.value.replace(/\D/g, "");
    onChange(digits ? Number(digits).toLocaleString("tr-TR") : "");
  };
  return <label><span>{label}</span><div className="currency-input"><b>₺</b><input required inputMode="numeric" value={value} onChange={change} placeholder={placeholder} /></div></label>;
}
function Step({ icon: Icon, title }) { return <div><Icon /><span>{title}</span></div>; }
