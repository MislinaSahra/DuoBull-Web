import { KeyRound, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { PASSWORD_MIN_LENGTH, validatePassword } from "../utils/passwordValidation.js";
import { useToast } from "../context/ToastContext.jsx";

export default function PasswordResetPage() {
  const { showToast } = useToast();
  const { updatePassword } = useAuth(); const navigate = useNavigate();
  const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  const submit = async (event) => { event.preventDefault(); const passwordError = validatePassword(password); if (passwordError) return setMessage(passwordError); if (password !== confirmation) return setMessage("Şifreler birbiriyle eşleşmiyor."); setSaving(true); const result = await updatePassword(password); setSaving(false); if (!result.ok) return setMessage(result.message); showToast("Şifreniz başarıyla değiştirildi!"); setMessage("Şifreniz başarıyla değiştirildi. Giriş ekranına yönlendiriliyorsunuz."); window.setTimeout(() => navigate("/giris", { replace: true }), 1600); };
  return <section className="container-shell py-16"><div className="glass-card mx-auto max-w-lg rounded-2xl p-6 sm:p-8"><span className="icon-tile"><KeyRound className="h-5 w-5" /></span><p className="mt-5 text-xs font-black uppercase tracking-widest text-bull-neon">Hesap güvenliği</p><h1 className="mt-2 text-3xl font-black">Yeni şifrenizi belirleyin</h1><p className="mt-3 text-sm leading-6 text-white/55">E-postanıza gönderilen doğrulama bağlantısını açtıktan sonra yeni şifrenizi oluşturabilirsiniz.</p><form onSubmit={submit} className="mt-6 space-y-4"><PasswordField label="Yeni şifre" value={password} onChange={setPassword} /><PasswordField label="Yeni şifre tekrar" value={confirmation} onChange={setConfirmation} />{message ? <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm font-bold text-white/70">{message}</p> : null}<button disabled={saving} className="primary-button w-full py-3 disabled:opacity-45"><LockKeyhole className="h-4 w-4" /> {saving ? "Değiştiriliyor..." : "Şifreyi Değiştir"}</button></form></div></section>;
}
function PasswordField({ label, value, onChange }) { return <label className="block text-sm font-bold text-white/70">{label}<input required minLength={PASSWORD_MIN_LENGTH} type="password" value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-bull-neon" /></label>; }
