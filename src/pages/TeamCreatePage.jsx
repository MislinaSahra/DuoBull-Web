import { Plus, ShieldCheck, Users } from "lucide-react";
import PageHero from "../components/PageHero.jsx";
import { useState } from "react";
import { filterOptions } from "../data/mockData.js";
import { useAdminOperations } from "../context/AdminOperationsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useGameCatalog } from "../context/GameCatalogContext.jsx";
import { getTeamLogoOptions, useHomeContent } from "../context/HomeContentContext.jsx";

const initialForm = { name: "", game: "", role: "", wanted_roles: [], level: "", region: "", contact: "", description: "", logo_url: "", reserve_enabled: false, reserve_size: 0 };

export default function TeamCreatePage() {
  const { gameNames, getGame } = useGameCatalog();
  const { images } = useHomeContent();
  const availableTeamLogos = getTeamLogoOptions(images).map((item) => item.url);
  const [created, setCreated] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const operations = useAdminOperations();
  const { user } = useAuth();
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const updateGame = (event) => setForm((current) => ({ ...current, game: event.target.value, role: "", wanted_roles: [], level: "" }));
  const selectedGame = getGame(form.game);

  return (
    <>
      <PageHero
        kicker="Takım oluştur"
        eyebrow="Kaptan akışı"
        title="Ekibini kur, rolleri belirle, başvuruları yönet."
        description="Takım oluşturma ekranı oyun, rol, seviye, bölge ve başvuru kurallarını tek formda toplar. Kaptanlar için hızlı bir kurulum akışı hazırlandı."
        backgroundKey="team"
        iconKey="team"
      />
      <section className="container-shell pb-16">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <form
            className="glass-card rounded-xl p-6 sm:p-8"
            onSubmit={async (event) => {
              event.preventDefault();
              setSaving(true);
              setCreated(false);
              setMessage("");
              const result = await operations.createTeam({ ...form, team_size: selectedGame.team_size || 5, captain: user?.name || "Kaptan", captainEmail: user?.email, players: [user?.name || "Kaptan"], members: [{ name: user?.name || "Kaptan", email: user?.email, role: form.role, rank: form.level, game: form.game }] });
              setSaving(false);
              if (!result.ok) {
                setMessage(result.message);
                return;
              }
              setCreated(true);
              setForm(initialForm);
            }}
          >
            <div className="mb-6 flex items-center gap-3">
              <span className="icon-tile">
                <Users className="h-5 w-5" />
              </span>
              <h2 className="text-2xl font-black">Takım bilgileri</h2>
            </div>
            {form.game ? <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-sm font-black text-white">Aranan roller <span className="text-xs font-semibold text-white/35">(isteğe bağlı)</span></p><p className="mt-1 text-xs text-white/45">Kaptan dışındaki {Math.max(0, Number(selectedGame.team_size || 5) - 1)} koltuk için rol belirleyebilirsin. Boş bıraktığın koltuklar “Fark etmez” olarak yayınlanır.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{Array.from({ length: Math.max(0, Number(selectedGame.team_size || 5) - 1) }, (_, index) => <SelectField key={index} label={`${index + 2}. oyuncu rolü`} value={form.wanted_roles[index] || ""} onChange={(event) => setForm(current => { const wanted_roles = [...current.wanted_roles]; wanted_roles[index] = event.target.value; return { ...current, wanted_roles }; })} options={selectedGame.roles || []} placeholder="Fark etmez" />)}</div></div> : null}
            {form.game ? <div className="mt-4 rounded-xl border border-bull-neon/20 bg-bull-neon/[0.05] p-4"><p className="text-sm font-black text-white">Ana kadro: {selectedGame.team_size || 5} oyuncu</p><p className="mt-1 text-xs text-white/45">Kaptan dahil ana kadro kapasitesi oyun kataloğundan gelir.</p><label className="mt-4 flex items-center gap-3 text-sm font-bold text-white/70"><input type="checkbox" checked={form.reserve_enabled} onChange={(event) => setForm((current) => ({ ...current, reserve_enabled: event.target.checked, reserve_size: event.target.checked ? Math.max(1, Number(current.reserve_size || 1)) : 0 }))} /> Yedek oyuncu kadrosunu aç</label>{form.reserve_enabled ? <label className="mt-3 block text-xs font-bold text-white/55">Yedek kapasitesi<input type="number" min="1" max="20" value={form.reserve_size} onChange={(event) => setForm((current) => ({ ...current, reserve_size: Math.max(1, Number(event.target.value || 1)) }))} className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none" /></label> : null}</div> : null}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Takım adı" placeholder="Shadow Legends" required value={form.name} onChange={update("name")} />
              <SelectField label="Ana oyun" value={form.game} onChange={updateGame} options={gameNames} required />
              <SelectField label="Takımdaki rolün" value={form.role} onChange={update("role")} options={getGame(form.game).roles} required disabled={!form.game} placeholder={form.game ? "Kendi rolünü seç" : "Önce oyun seçiniz"} />
              <SelectField label="Seviye aralığı" value={form.level} onChange={update("level")} options={getGame(form.game).ranks} required disabled={!form.game} placeholder={form.game ? "Rank seçiniz" : "Önce oyun seçiniz"} />
              <SelectField label="Bölge" value={form.region} onChange={update("region")} options={filterOptions.regions} required />
              <Field label="İletişim" placeholder="Discord kullanıcı adı" required value={form.contact} onChange={update("contact")} />
            </div>
            <div className="mt-5">
              <p className="mb-3 text-sm font-bold text-white/70">Takım profil logosu</p>
              {availableTeamLogos.length ? <div className="team-logo-picker">
                {availableTeamLogos.map((logo) => <button key={logo} type="button" onClick={() => setForm((current) => ({ ...current, logo_url: logo }))} className={form.logo_url === logo ? "is-selected" : ""} aria-label="Bu takım logosunu seç"><img src={logo} alt="" /></button>)}
              </div> : <p className="rounded-lg border border-dashed border-white/10 p-4 text-xs text-white/40">Yönetici henüz hazır takım logosu eklemedi. Takım varsayılan arma ile oluşturulacak.</p>}
            </div>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-white/70">Takım açıklaması</span>
              <textarea value={form.description} onChange={update("description")} className="min-h-32 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/32" placeholder="Antrenman saatleri, hedefler ve takım kültürü" />
            </label>
            {created ? <p className="mt-5 rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm font-bold text-emerald-200">Takımın oluşturuldu ve yönetici onayına gönderildi.</p> : null}
            {message ? <p className="mt-5 rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-sm font-bold text-red-200">{message}</p> : null}
            <button type="submit" disabled={saving} className="primary-button mt-6 disabled:opacity-45">
              <Plus className="h-4 w-4" />
              {saving ? "Kaydediliyor..." : "Takımı Yayına Al"}
            </button>
          </form>

          <aside className="glass-card h-fit rounded-2xl p-6">
            <span className="icon-tile mb-5 h-14 w-14">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h3 className="text-2xl font-black">Kaptan kontrolü</h3>
            <p className="mt-3 text-sm leading-7 text-white/58">Takım yayına alındıktan sonra başvurular panelde incelenir.</p>
            <div className="mt-5 space-y-3">
              <Step title="1. Profil doğrulama" />
              <Step title="2. Rol ve seviye filtresi" />
              <Step title="3. Başvuru onayı" />
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function Field({ label, placeholder, required, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-white/70">{label}</span>
      <input required={required} value={value} onChange={onChange} className="w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/32" placeholder={placeholder} />
    </label>
  );
}

function SelectField({ label, options, value, onChange, required, disabled = false, placeholder = "Seçiniz" }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-white/70">{label}</span><select required={required} disabled={disabled} value={value} onChange={onChange} className="w-full rounded-lg border border-white/10 bg-[#0a0711] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-bull-neon/60 disabled:cursor-not-allowed disabled:opacity-45"><option value="" disabled={Boolean(required)}>{placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function Step({ title }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-white/72">
      {title}
    </div>
  );
}
