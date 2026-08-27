import { Camera, KeyRound, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { fileToDataUrl } from "../services/UserActions.js";
import { useGameCatalog } from "../context/GameCatalogContext.jsx";
import { useSubscription } from "../context/SubscriptionContext.jsx";
import { removeProfileBanner, uploadProfileBanner } from "../services/ProfileFeatureService.js";
import BannerCropModal from "./BannerCropModal.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function ProfileEditModal({ onClose, embedded = false }) {
  const { showToast } = useToast();
  const { user, updateProfile, deleteAccount, requestAccountDeletionCode, requestPasswordReset } = useAuth();
  const { gameNames, getGame } = useGameCatalog();
  const { hasFeature } = useSubscription();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: user.name, game: user.game, playerRole: user.playerRole, region: user.region, discord: user.discord, bio: user.bio, avatar: user.avatar || "", rank: user.rank || "", mainCharacter: user.mainCharacter || "", usesMicrophone: Boolean(user.usesMicrophone), playHours: user.playHours || "", playSchedule: user.playSchedule || "", customSlug:user.customSlug||"", profileBanner:user.profileBanner||"" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteCodeSent, setDeleteCodeSent] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [bannerFile, setBannerFile] = useState(null);
  const [staleBannerUrls, setStaleBannerUrls] = useState([]);
  const nextUsernameChange = user.usernameChangedAt ? new Date(new Date(user.usernameChangedAt).getTime() + 30 * 24 * 60 * 60 * 1000) : null;
  const usernameLocked = Boolean(nextUsernameChange && nextUsernameChange > new Date());
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const updateGame = (event) => { const game = event.target.value; const selected=getGame(game); setForm((current) => ({ ...current, game, rank: selected.ranks[0] || "Belirtilmedi", mainCharacter: selected.characters[0] || "", playerRole:selected.roles[0]||current.playerRole })); };
  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    const avatar = await fileToDataUrl(file);
    setForm((current) => ({ ...current, avatar }));
  };
  const uploadBanner = async (file) => {
    const previousUrl = form.profileBanner;
    const result = await uploadProfileBanner(user.id, file);
    if (result.ok) {
      if (previousUrl && previousUrl !== result.url) {
        setStaleBannerUrls((current) => [...new Set([...current, previousUrl])]);
      }
      setForm((current) => ({ ...current, profileBanner: result.url }));
      setBannerFile(null);
    } else setMessage(result.message);
  };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    const result = await updateProfile(form);
    if (result.ok) {
      await Promise.all(staleBannerUrls.map((url) => removeProfileBanner(url)));
      setStaleBannerUrls([]);
      showToast("Profiliniz başarıyla güncellendi!");
    }
    setMessage(result.ok ? "Profil güncellendi." : result.message);
    setSaving(false);
  };
  const removeAccount = async () => {
    setSaving(true);
    const result = await deleteAccount(deleteCode);
    if (result.ok) navigate("/", { replace: true });
    else {
      setMessage(result.message);
      setSaving(false);
    }
  };

  const sendPasswordLink = async () => {
    const result = await requestPasswordReset(user.email);
    setMessage(result.message);
  };


  const content = <section id="profile-edit-panel" className={embedded ? "profile-edit-panel" : "glass-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6"}>
        <div className="flex justify-between"><h2 className="text-2xl font-black">Profili Düzenle</h2><button type="button" onClick={onClose} className="p-2 text-white/50"><X className="h-5 w-5" /></button></div>
        <div className="mt-5 flex items-center gap-4">{form.avatar ? <img src={form.avatar} alt="Profil" className="h-20 w-20 rounded-xl object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-bull-neon/15 text-2xl font-black">{form.name.slice(0, 2).toUpperCase()}</div>}<label className="secondary-button cursor-pointer px-4 py-2.5"><Camera className="h-4 w-4" /> Fotoğraf Yükle<input type="file" accept="image/*" className="sr-only" onChange={upload} /></label></div>
        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={save}>
          <Input label="Kullanıcı adı" value={form.name} onChange={update("name")} disabled={usernameLocked} />
          {usernameLocked ? <p className="-mt-2 text-xs font-bold text-amber-200 sm:col-span-2">Kullanıcı adını tekrar {nextUsernameChange.toLocaleDateString("tr-TR")} tarihinde değiştirebilirsin.</p> : null}
          <Input label="Discord" value={form.discord} onChange={update("discord")} />
          <Select label="Ana oyun" value={form.game} onChange={updateGame} options={gameNames} />
          <Select label="Bölge" value={form.region} onChange={update("region")} options={["Türkiye", "Avrupa", "MENA", "Global"]} />
          <Select label="Rank / seviye" value={form.rank} onChange={update("rank")} options={getGame(form.game).ranks || ["Belirtilmedi"]} />
          <Select label="En çok oynadığın ajan / karakter" value={form.mainCharacter} onChange={update("mainCharacter")} options={getGame(form.game).characters} />
          <Input label="Toplam oyun saati" value={form.playHours} onChange={update("playHours")} placeholder="Örn. 1250 saat" />
          <Input label="Genellikle oynadığın saatler" value={form.playSchedule} onChange={update("playSchedule")} placeholder="Örn. 20:00 - 00:00" />
          <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm font-bold text-white/70 sm:col-span-2"><input type="checkbox" checked={form.usesMicrophone} onChange={(event) => setForm((current) => ({ ...current, usesMicrophone: event.target.checked }))} /> Mikrofon kullanıyorum</label>
          {hasFeature("custom_profile")?<div className="grid gap-4 rounded-xl border border-bull-neon/20 bg-bull-neon/[0.04] p-4 sm:col-span-2 sm:grid-cols-2"><div><Input label="Özel profil adresi" value={form.customSlug} onChange={update("customSlug")} placeholder="kullanici-adin"/>{form.customSlug?<button type="button" onClick={()=>setForm(current=>({...current,customSlug:""}))} className="mt-2 text-[10px] font-black text-red-200">Özel adresi temizle</button>:null}</div><label className="text-sm font-bold text-white/70">Profil bannerı<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event)=>setBannerFile(event.target.files?.[0]||null)} className="mt-2 block w-full rounded-lg border border-white/10 bg-black/35 p-2 text-xs"/></label>{form.profileBanner?<img src={form.profileBanner} alt="Profil bannerı" className="h-32 w-full rounded-lg bg-black object-contain sm:col-span-2"/>:null}</div>:<p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/45 sm:col-span-2">Özel profil adresi ve banner abonelik özelliğidir.</p>}
          <label className="sm:col-span-2 text-sm font-bold text-white/70">Hakkında<textarea value={form.bio} onChange={update("bio")} className="mt-2 min-h-24 w-full rounded-lg border border-white/10 bg-black/35 p-3 text-white outline-none" /></label>
          <button type="submit" disabled={saving} className="primary-button sm:col-span-2 disabled:opacity-45"><Save className="h-4 w-4" /> {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}</button>
        </form>
        {message ? <p className="mt-3 text-sm font-bold text-emerald-200">{message}</p> : null}
        <div className="mt-6 border-t border-white/10 pt-5"><h3 className="font-black">Şifre güvenliği</h3><p className="mt-1 text-sm text-white/50">Şifreni değiştirmek için e-posta adresine tek kullanımlık doğrulama bağlantısı gönderilir.</p><button type="button" onClick={sendPasswordLink} className="secondary-button mt-3"><KeyRound className="h-4 w-4" /> Şifre Değiştirme Bağlantısı Gönder</button></div>
        <div className="mt-6 border-t border-red-300/15 pt-5">
          {!confirmDelete ? <button type="button" onClick={() => setConfirmDelete(true)} className="secondary-button border-red-300/20 text-red-200"><Trash2 className="h-4 w-4" /> Hesabımı Sil</button> : <div className="rounded-xl border border-red-300/20 bg-red-400/[0.06] p-4"><p className="font-black text-red-100">E-posta doğrulaması gerekli</p><p className="mt-1 text-xs text-white/50">Hesabın ancak e-posta adresine gönderilen tek kullanımlık kod doğrulandıktan sonra kalıcı olarak silinir.</p>{deleteCodeSent?<input inputMode="numeric" autoComplete="one-time-code" maxLength="6" value={deleteCode} onChange={event=>setDeleteCode(event.target.value.replace(/\D/g,""))} placeholder="6 haneli doğrulama kodu" className="mt-3 w-full rounded-lg border border-red-300/20 bg-black/35 px-3 py-2.5 text-white outline-none"/>:null}<div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => {setConfirmDelete(false);setDeleteCodeSent(false);setDeleteCode("");}} className="secondary-button py-2">Vazgeç</button>{!deleteCodeSent?<button type="button" onClick={async()=>{const result=await requestAccountDeletionCode();setMessage(result.message);if(result.ok)setDeleteCodeSent(true);}} className="primary-button bg-red-600 py-2">Kodu E-postama Gönder</button>:<button type="button" disabled={saving||deleteCode.length!==6} onClick={removeAccount} className="primary-button bg-red-600 py-2 disabled:opacity-45"><Trash2 className="h-4 w-4" /> Doğrula ve Hesabı Sil</button>}</div></div>}
        </div>
      {bannerFile ? <BannerCropModal file={bannerFile} onCancel={() => setBannerFile(null)} onApply={uploadBanner} /> : null}
      </section>;
  if (embedded) return content;
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">{content}</div>;
}

function Input({ label, ...props }) { return <label className="text-sm font-bold text-white/70">{label}<input {...props} className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-white outline-none" /></label>; }
function Select({ label, options, ...props }) { const values = props.value && !options.includes(props.value) ? [props.value, ...options] : options; return <label className="text-sm font-bold text-white/70">{label}<select {...props} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0a0711] px-3 py-2.5 text-white outline-none">{values.map((option) => <option key={option}>{option}</option>)}</select></label>; }
