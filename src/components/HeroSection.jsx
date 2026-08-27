import { ArrowRight, Eye, EyeOff, Headphones, Mail, ShieldCheck, Trophy, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useAdminOperations } from "../context/AdminOperationsContext.jsx";
import { useHomeContent } from "../context/HomeContentContext.jsx";
import { useGameCatalog } from "../context/GameCatalogContext.jsx";

export default function HeroSection() {
  const { isAuthenticated } = useAuth();
  const { featuredTournaments } = useAdminOperations();
  const { images } = useHomeContent();
  const featured = featuredTournaments[0];
  const focusAuth = (mode) => window.dispatchEvent(new CustomEvent("duobull:focus-auth", { detail: { mode } }));
  return <section id="anasayfa" className="home-hero relative overflow-hidden border-b border-bull-neon/20 bg-[#04090c]">
    <img src={images.hero || "/duobull/backgrounds/home-hero-v2.png"} alt="" className="absolute inset-0 h-full w-full object-cover object-[72%_center]" />
    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,9,12,.98)_0%,rgba(4,9,12,.86)_37%,rgba(4,9,12,.28)_68%,rgba(4,9,12,.06)_100%)]" />
    <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#05090c] to-transparent" />
    <div className="container-shell relative grid min-h-[560px] items-center gap-8 py-14 lg:min-h-[650px] lg:grid-cols-[minmax(0,1fr)_420px]"><div className="max-w-[760px] pb-14 lg:pb-20">
      <p className="home-eyebrow">/// &nbsp; Oyuncular için. Performans destekli. &nbsp; ///</p>
      <h1 className="mt-5 text-[clamp(3.15rem,7vw,6.5rem)] font-black uppercase italic leading-[.84] tracking-[-.055em] text-white">Oyna. Rekabet et.<br/><span className="text-bull-neon">Zirveye çık.</span></h1>
      <p className="mt-6 max-w-xl text-base leading-7 text-white/65">DuoBull, rekabetçi oyuncular için tasarlanmış yeni nesil topluluk platformu. Takımını bul, turnuvalara katıl ve gerçek ödüller kazan.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to={isAuthenticated?"/takim-bul":"/#hesap"} onClick={() => !isAuthenticated && focusAuth("kayit")} className="primary-button min-w-52">{isAuthenticated?"Takımını Bul":"DuoBull'a Katıl"}<ArrowRight className="h-4 w-4"/></Link><Link to={isAuthenticated?"/turnuvalar":"/#hesap"} onClick={() => !isAuthenticated && focusAuth("giris")} className="secondary-button min-w-52">Turnuvaları Keşfet<ArrowRight className="h-4 w-4"/></Link></div>
      <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3 text-xs font-bold text-white/62"><span className="flex items-center gap-2"><Zap className="h-4 w-4 text-bull-neon"/>Hızlı eşleşme</span><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-bull-neon"/>Güvenli ve adil oyun</span><span className="flex items-center gap-2"><Headphones className="h-4 w-4 text-bull-neon"/>7/24 destek</span></div>
    </div>{!isAuthenticated ? <HeroAuthPanel /> : null}</div>
    {featured?<div className="container-shell relative -mt-20 pb-5"><div className="home-featured-tournament"><div className="flex min-w-0 items-center gap-4"><span className="icon-tile h-14 w-14"><Trophy className="h-7 w-7"/></span><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.2em] text-bull-gold">Öne çıkan turnuva</p><h2 className="truncate text-xl font-black uppercase italic text-white sm:text-2xl">{featured.name}</h2></div></div><div className="hidden sm:block"><p className="text-[10px] font-black uppercase text-white/38">Ödül havuzu</p><p className="text-xl font-black text-bull-gold">{featured.prize}</p></div><div className="hidden lg:block"><p className="text-[10px] font-black uppercase text-white/38">Tarih</p><p className="font-black text-white">{new Date(featured.date).toLocaleDateString("tr-TR")}</p></div><Link to="/turnuvalar" className="primary-button shrink-0 px-6 py-2.5 text-xs">Hemen Kaydol<ArrowRight className="h-4 w-4"/></Link></div></div>:null}
  </section>;
}

function HeroAuthPanel() {
  const { login, register, requestPasswordReset, verifyMfa, verifyRecoveryCode } = useAuth();
  const { gameNames, getGame } = useGameCatalog();
  const [mode, setMode] = useState("giris");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [highlighted, setHighlighted] = useState(false);
  const [mfa, setMfa] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", game: gameNames[0] || "Valorant", playerRole: getGame(gameNames[0] || "Valorant").roles[0] || "" });
  useEffect(() => { if (!gameNames.length || gameNames.includes(form.game)) return; const game = gameNames[0]; setForm(value => ({ ...value, game, playerRole: getGame(game).roles[0] || "" })); }, [gameNames, form.game, getGame]);
  useEffect(() => { const focus = event => { if (event?.detail?.mode) { setMode(event.detail.mode); setMfa(null); setMessage(""); } document.getElementById("hesap")?.scrollIntoView({ behavior: "smooth", block: "center" }); setHighlighted(false); requestAnimationFrame(() => setHighlighted(true)); window.setTimeout(() => setHighlighted(false), 1600); }; window.addEventListener("duobull:focus-auth", focus); if (window.location.hash === "#hesap") window.setTimeout(() => focus(), 120); return () => window.removeEventListener("duobull:focus-auth", focus); }, []);
  const update = key => event => setForm(value => ({ ...value, [key]: event.target.value }));
  const updateGame = event => { const game = event.target.value; setForm(value => ({ ...value, game, playerRole: getGame(game).roles[0] || "" })); };
  const submit = async event => { event.preventDefault(); setMessage(""); if (mfa) { const result = useRecoveryCode ? await verifyRecoveryCode(mfaCode) : await verifyMfa(mfa.factorId, mfaCode); setMessage(result.ok ? "Doğrulama başarılı." : result.message); return; } const result = mode === "kayit" ? await register(form) : await login(form); if (result.needsMfa) setMfa({ factorId: result.factorId }); setMessage(result.ok ? (result.message || (mode === "kayit" ? "Kayıt tamamlandı. E-posta doğrulamanı kontrol et." : "Giriş başarılı.")) : result.message); };
  const forgot = async () => setMessage((await requestPasswordReset(form.email)).message);
  return <aside id="hesap" className={`hero-auth-panel scroll-mt-28 ${highlighted ? "is-highlighted" : ""}`}>
    <div className="flex gap-2"><button type="button" onClick={() => { setMode("giris"); setMfa(null); setMessage(""); }} className={mode === "giris" ? "primary-button flex-1 py-2.5" : "secondary-button flex-1 py-2.5"}>Giriş Yap</button><button type="button" onClick={() => { setMode("kayit"); setMfa(null); setMessage(""); }} className={mode === "kayit" ? "primary-button flex-1 py-2.5" : "secondary-button flex-1 py-2.5"}>Kayıt Ol</button></div>
    <form onSubmit={submit} className="mt-4 grid gap-3">
      {mfa ? <><p className="hero-auth-message">Authenticator uygulamanızdaki 6 haneli kodu girin.</p><input required autoFocus value={mfaCode} onChange={event => setMfaCode(useRecoveryCode ? event.target.value.toUpperCase().slice(0, 11) : event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={useRecoveryCode ? "Kurtarma kodu" : "123456"} autoComplete="one-time-code" /><button type="button" onClick={() => { setUseRecoveryCode(value => !value); setMfaCode(""); }} className="justify-self-end text-[11px] font-black text-bull-neon">{useRecoveryCode ? "Authenticator kodu kullan" : "Kurtarma kodu kullan"}</button></> : <>{mode === "kayit" ? <input required value={form.name} onChange={update("name")} placeholder="Oyuncu adı" /> : null}
      <label><Mail /><input required type="email" value={form.email} onChange={update("email")} placeholder="E-posta adresi" /></label>
      <label><input required type={showPassword ? "text" : "password"} value={form.password} onChange={update("password")} placeholder="Şifre" /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label="Şifre görünürlüğünü değiştir">{showPassword ? <EyeOff /> : <Eye />}</button></label>
      {mode === "kayit" ? <div className="grid grid-cols-2 gap-2"><select required value={form.game} onChange={updateGame}><option value="" disabled>Oyun seç</option>{gameNames.map(game => <option key={game}>{game}</option>)}</select><select required value={form.playerRole} onChange={update("playerRole")}><option value="" disabled>Rol seç</option>{getGame(form.game).roles.map(role => <option key={role}>{role}</option>)}</select></div> : <button type="button" onClick={forgot} className="justify-self-end text-[11px] font-black text-bull-neon">Şifremi unuttum</button>}</>}
      {message ? <p className="hero-auth-message" role="status">{message}</p> : null}
      <button type="submit" className="primary-button w-full py-3">{mfa ? "Kodu Doğrula" : mode === "kayit" ? "Hesabını Oluştur" : "Giriş Yap"}</button>
    </form>
  </aside>;
}
