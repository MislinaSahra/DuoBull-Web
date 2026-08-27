import { Check, Crown, Headphones, RefreshCw, ShieldCheck, ShoppingBag, Sparkles, Trophy, Users, X, Zap } from "lucide-react";
import { useState } from "react";
import PageHero from "../components/PageHero.jsx";
import { useSubscription } from "../context/SubscriptionContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const advantages = [
  [Zap, "Daha Fazla BP", "Günlük görevlerden daha fazla BP kazan."],
  [Sparkles, "Sadakat Avantajı", "Sadakat XP kazan ve özel indirimlerden yararlan."],
  [Trophy, "Turnuva Gücü", "Turnuvalar oluştur, yönet ve topluluğunu büyüt."],
  [Users, "Takım Yönetimi", "Paketinin izin verdiği kadar takımı birlikte yönet."],
  [Crown, "Özel Rozet ve Profil", "Abonelik ayrıcalığını profilinde görünür kıl."]
];

export default function SubscriptionPage() {
  const subscriptions = useSubscription();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [confirmPlan, setConfirmPlan] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const plans = subscriptions.plans.filter((plan) => plan.is_active);
  const pending = subscriptions.subscriptions.some((item) => item.status === "pending");
  const openManagement = () => { setManageOpen(true); window.setTimeout(() => document.getElementById("subscription-management")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); };

  const confirmRequest = async () => {
    const result = await subscriptions.request(confirmPlan.id);
    setMessage(result.ok ? "Abonelik talebin yönetici onayına gönderildi." : result.message);
    setConfirmPlan(null);
  };

  return <>
    <PageHero
      eyebrow="Daha güçlü bir profil, daha büyük bir topluluk"
      title="Oyunculuğunu,"
      highlightedTitle="zirveye taşı."
      description="DuoBull abonelik paketleri ile profilini geliştir, topluluğuna değer kat ve turnuvalarda öne çık."
      backgroundKey="subscription"
      showTrust={false}
      actions={<div className="subscription-hero-benefits"><HeroBenefit icon={Sparkles} title="Öne Çık" text="Profilini güçlendir" /><HeroBenefit icon={Zap} title="Daha Fazla Kazan" text="BP ve sadakat avantajları" /><HeroBenefit icon={Users} title="Topluluğunu Büyüt" text="Takımını ve topluluğunu geliştir" /></div>}
    />
    <main className="container-shell subscription-page pb-14">
      {subscriptions.activePlan ? <section className="subscription-active">
        <div className="subscription-active__identity"><span><ShieldCheck /></span><div><small>Aktif abonelik</small><strong>{subscriptions.activePlan.name}</strong><p>Bitiş: {new Date(subscriptions.activeSubscription.ends_at).toLocaleDateString("tr-TR")}</p></div></div>
        <ActiveBenefit icon={Zap} label="Günlük BP Kazancı" value={subscriptions.activePlan.bp_enabled ? "Aktif" : "Kapalı"} />
        <ActiveBenefit icon={ShoppingBag} label="Sadakat Mağazası" value={subscriptions.activePlan.loyalty_shop ? "Erişim Açık" : "Kapalı"} />
        <ActiveBenefit icon={Trophy} label="Takım Yönetimi" value={`${subscriptions.activePlan.max_teams || 1} takım`} />
        <button type="button" onClick={openManagement} className="secondary-button">Aboneliği Yönet</button>
      </section> : null}

      <div className="subscription-layout">
        <section className="subscription-plans">
          {plans.map((plan) => <PlanCard key={plan.id} plan={plan} featured={Boolean(plan.is_popular)} disabled={Boolean(subscriptions.activeSubscription) || pending} onSelect={() => { setConfirmPlan(plan); setTermsAccepted(false); setTimeout(() => document.getElementById("subscription-request")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }} />)}
          {plans.length === 0 ? <div className="subscription-empty">Şu anda satışa açık abonelik paketi bulunmuyor.</div> : null}
        </section>
        <aside className="subscription-advantages">
          <h2>Neden abone olunur?</h2>
          <div>{advantages.map(([Icon, title, text]) => <article key={title}><span><Icon /></span><p><strong>{title}</strong><small>{text}</small></p></article>)}</div>
        </aside>
      </div>

      {message ? <p className="subscription-message">{message}</p> : null}
      <section className="subscription-assurances"><Assurance icon={ShieldCheck} title="%100 Güvenli Ödeme" text="Tüm ödemeler güvenli altyapı ile korunur." /><Assurance icon={RefreshCw} title="Esnek İptal" text="Aboneliğini istediğin zaman iptal edebilirsin." /><Assurance icon={Headphones} title="7/24 Destek" text="Soruların için her zaman buradayız." /></section>
    </main>
    {confirmPlan ? <section id="subscription-request" className="container-shell subscription-request"><header><div><span className="section-kicker">Abonelik başvurusu</span><h2>{confirmPlan.name} başvurusu</h2><p>Başvurunu göndermeden önce paket ve hesap bilgilerini kontrol et.</p></div><button type="button" onClick={() => setConfirmPlan(null)} className="secondary-button"><X /> Başvuruyu Kapat</button></header><div className="subscription-request__grid"><div className="subscription-request__summary"><h3>Paket bilgileri</h3><p><span>Paket</span><strong>{confirmPlan.name}</strong></p><p><span>Ücret</span><strong>₺{Number(confirmPlan.price_try).toLocaleString("tr-TR")}</strong></p><p><span>Kullanım dönemi</span><strong>{confirmPlan.duration_days} gün</strong></p><p><span>Başvuru durumu</span><strong>Yönetici onayına gönderilecek</strong></p></div><div className="subscription-request__account"><h3>Başvuru sahibi</h3><label>Oyuncu adı<input value={user.name} readOnly /></label><label>E-posta<input value={user.email} readOnly /></label><label className="subscription-request__terms"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} /><span>Paket süresini, ücretini ve abonelik koşullarını okudum; başvurunun yönetici incelemesine gönderileceğini kabul ediyorum.</span></label><button type="button" disabled={!termsAccepted} onClick={confirmRequest} className="primary-button">Abonelik Başvurusunu Gönder</button></div></div></section> : null}
    {manageOpen && subscriptions.activePlan ? <section id="subscription-management" className="container-shell subscription-management-panel scroll-mt-28">
      <div className="subscription-management-panel__head"><div><span className="section-kicker">Abonelik yönetimi</span><h2>{subscriptions.activePlan.name}</h2><p>Planını, kullanım süreni ve yenileme durumunu buradan takip edebilirsin.</p></div><button type="button" onClick={() => { setManageOpen(false); setCancelConfirm(false); }} className="secondary-button"><X /> Yönetimi Kapat</button></div>
      <div className="subscription-manage-details"><p><span>Paket ücreti</span><strong>₺{Number(subscriptions.activePlan.price_try).toLocaleString("tr-TR")}</strong></p><p><span>Başlangıç</span><strong>{subscriptions.activeSubscription.starts_at ? new Date(subscriptions.activeSubscription.starts_at).toLocaleDateString("tr-TR") : "—"}</strong></p><p><span>Bitiş</span><strong>{new Date(subscriptions.activeSubscription.ends_at).toLocaleDateString("tr-TR")}</strong></p><p><span>Yenileme</span><strong>{subscriptions.activeSubscription.cancel_at_period_end ? "Kapalı" : "Aktif"}</strong></p></div>
      {subscriptions.activeSubscription.cancel_at_period_end ? <div className="subscription-cancel-notice"><ShieldCheck /><p><strong>Aboneliğin dönem sonunda sona erecek.</strong><span>Ayrıcalıklarını {new Date(subscriptions.activeSubscription.ends_at).toLocaleDateString("tr-TR")} tarihine kadar kullanmaya devam edebilirsin.</span></p></div> : cancelConfirm ? <div className="subscription-cancel-confirm"><div><strong>Otomatik yenilemeyi kapatmak istiyor musun?</strong><p>Ücretini ödediğin dönem korunur. Paket ayrıcalıkların {new Date(subscriptions.activeSubscription.ends_at).toLocaleDateString("tr-TR")} tarihinde sona erer.</p></div><div><button type="button" onClick={() => setCancelConfirm(false)} className="secondary-button">Vazgeç</button><button type="button" disabled={cancelling} onClick={async () => { setCancelling(true); const result = await subscriptions.cancel(subscriptions.activeSubscription.id); setCancelling(false); setMessage(result.ok ? `Aboneliğinin yenilenmesi durduruldu. Ayrıcalıkların ${new Date(subscriptions.activeSubscription.ends_at).toLocaleDateString("tr-TR")} tarihine kadar devam edecek.` : result.message); if (result.ok) setCancelConfirm(false); }} className="secondary-button border-red-400/25 text-red-200">{cancelling ? "İşleniyor..." : "Yenilemeyi Durdur"}</button></div></div> : <button type="button" onClick={() => setCancelConfirm(true)} className="subscription-stop-renewal">Abonelik Yenilemesini Durdur</button>}
    </section> : null}
  </>;
}

function HeroBenefit({ icon: Icon, title, text }) { return <div><span><Icon /></span><p><strong>{title}</strong><small>{text}</small></p></div>; }
function ActiveBenefit({ icon: Icon, label, value }) { return <div className="subscription-active__benefit"><Icon /><p><small>{label}</small><strong>{value}</strong></p></div>; }
function Assurance({ icon: Icon, title, text }) { return <article><Icon /><p><strong>{title}</strong><small>{text}</small></p></article>; }

function PlanCard({ plan, featured, disabled, onSelect }) {
  const features = [
    [plan.bp_enabled, "Günlük görevlerden BP"],
    [true, "Görevlerden sadakat XP"],
    [plan.tournament_creation, "Turnuva oluşturma"],
    [plan.multiple_teams, `Birden fazla takım (${plan.max_teams || 1} takım)`],
    [plan.loyalty_shop, "Sadakat mağazasından alışveriş"],
    [plan.custom_profile, "Özel profil adresi ve banner"]
  ];
  return <article className={`subscription-plan ${featured ? "subscription-plan--featured" : ""}`}>
    {featured ? <span className="subscription-plan__badge">En popüler</span> : null}
    <Crown className="subscription-plan__crown" />
    <h2>{plan.name}</h2>
    <p className="subscription-plan__description">{plan.description}</p>
    <p className="subscription-plan__price">₺{Number(plan.price_try).toLocaleString("tr-TR")} <small>/{plan.duration_days} gün</small></p>
    <div className="subscription-plan__features">{features.map(([enabled, text]) => <p key={text} className={!enabled ? "is-disabled" : ""}><Check />{text}</p>)}</div>
    <button disabled={disabled} type="button" onClick={onSelect} className="primary-button"><ShieldCheck />{disabled ? "Şu Anda Kullanılamıyor" : `${plan.name}'a Abone Ol`}</button>
    <small className="subscription-plan__cancel">İstediğin zaman iptal edebilirsin.</small>
  </article>;
}
