import { Activity, CheckCircle2, DatabaseZap, Edit3, ExternalLink, Gift, Headphones, ImageIcon, LayoutDashboard, Megaphone, PackagePlus, Plus, RotateCcw, Save, Settings, ShoppingBag, Trash2, Trophy, Upload, UserPlus, Users, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getTeamLogoOptions, homeImageFields, useHomeContent } from "../context/HomeContentContext.jsx";
import { useAdminOperations } from "../context/AdminOperationsContext.jsx";
import AdminManagementModal from "../components/AdminManagementModal.jsx";
import { useEngagement } from "../context/EngagementContext.jsx";
import { useSubscription } from "../context/SubscriptionContext.jsx";
import AdminMembersPanel from "../components/AdminMembersPanel.jsx";
import SeoContentCollapsible from "../components/SeoContentCollapsible.jsx";
import PlayerReviewModeration from "../components/PlayerReviewModeration.jsx";
import { fetchReportedPlayerReviews } from "../services/PlayerReviewService.js";
import { fetchOrders, subscribeToOrders } from "../services/OrderService.js";
import { supabase } from "../lib/supabase.js";
import CatalogManagement from "../components/CatalogManagement.jsx";
import AdminSectionErrorBoundary from "../components/AdminSectionErrorBoundary.jsx";
import VerificationRequestsPanel from "../components/VerificationRequestsPanel.jsx";
import { fetchProducts, saveProduct, subscribeToProducts } from "../services/ProductService.js";
import { useAuth } from "../context/AuthContext.jsx";
import { requestGlobalCacheClear } from "../services/CacheService.js";
import { fetchMatchEvidence } from "../services/TeamMatchService.js";
import { toWebpDataUrl } from "../lib/storageImages.js";

export default function AdminDashboardPage() {
  const { isSuperAdmin } = useAuth();
  const { images, updateImage, removeImage, resetImages, partners, updatePartners, footerLinks, updateFooterLink, siteTexts, updateSiteText } = useHomeContent();
  const operations = useAdminOperations();
  const engagement = useEngagement();
  const subscriptions = useSubscription();
  const [activeView, setActiveView] = useState(null);
  const [adminSection, setAdminSection] = useState(() => { const section = new URLSearchParams(window.location.search).get("section") || "overview"; return section === "visuals" ? "site" : section; });
  const [matchEvidenceCount,setMatchEvidenceCount]=useState(0);
  const [reviewReportCount,setReviewReportCount]=useState(0);
  const [adminOrders,setAdminOrders]=useState([]);
  const [visualProducts,setVisualProducts]=useState([]);
  useEffect(()=>{const refresh=()=>fetchReportedPlayerReviews().then(items=>setReviewReportCount(items.length)).catch(()=>setReviewReportCount(0));refresh();const channel=supabase.channel("admin-review-report-badge").on("postgres_changes",{event:"*",schema:"public",table:"player_review_reports"},refresh).subscribe();return()=>supabase.removeChannel(channel);},[]);
  useEffect(()=>{const refresh=()=>fetchOrders().then(items=>setAdminOrders(Array.isArray(items)?items:[])).catch(()=>setAdminOrders([]));refresh();return subscribeToOrders(refresh,"admin-dashboard-orders-live");},[]);
  useEffect(()=>{const refresh=()=>fetchProducts().then(items=>setVisualProducts(Array.isArray(items)?items:[])).catch(()=>setVisualProducts([]));refresh();return subscribeToProducts(refresh,"admin-visual-products-live");},[]);
  useEffect(()=>{const refresh=()=>fetchMatchEvidence().then(items=>setMatchEvidenceCount(items.filter(item=>item.status==="pending").length)).catch(()=>setMatchEvidenceCount(0));refresh();const channel=supabase.channel("admin-match-evidence-count").on("postgres_changes",{event:"*",schema:"public",table:"team_match_rounds"},refresh).subscribe();return()=>supabase.removeChannel(channel);},[]);
  const [editingImages, setEditingImages] = useState(false);
  const openView = (view, entityId = null) => { setActiveView({ view, entityId }); setTimeout(() => document.querySelector(".admin-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40); };
  const changeSection = (section) => { setActiveView(null); setAdminSection(section); const url=new URL(window.location.href);section==="overview"?url.searchParams.delete("section"):url.searchParams.set("section",section);window.history.replaceState({},"",url);window.scrollTo({ top: 0, behavior: "smooth" }); };
  const pendingOrderCount = adminOrders.filter(item=>item.status!=="completed").length;
  const adminCounts = {
    overview: operations.pendingTeams.length + operations.tournamentRequests.filter(item=>item.status==="pending").length + engagement.tickets.filter(item=>item.status!=="closed").length + subscriptions.subscriptions.filter(item=>item.status==="pending").length + engagement.reviewQueue.filter(item=>item.status==="pending").length,
    orders: pendingOrderCount,
    subscriptions: subscriptions.subscriptions.filter(item=>item.status==="pending").length,
    moderation: engagement.reviewQueue.filter(item=>item.status==="pending").length + reviewReportCount
    ,"match-evidence": matchEvidenceCount
  };

  return (
    <>
      <section className="container-shell admin-dashboard-shell py-5 pb-16">
        <div className="grid items-start gap-4 lg:grid-cols-[230px_minmax(0,1fr)]"><AdminSidebar active={adminSection} onChange={changeSection} openView={openView} counts={adminCounts}/><main className="min-w-0">
        <section className="admin-dashboard-hero"><img src={images["admin-banner"]} alt="" /><div><p>Yönetici paneli</p><h1>DuoBull Yönetim Merkezi</h1><span>Operasyonları özet kartlardan takip edin; ayrıntıları yalnızca ihtiyaç duyduğunuzda açın.</span><footer><Activity /> Sistem Durumu <b>Sistem aktif</b><small>Canlı veriler otomatik güncellenir</small></footer></div></section>
        <AdminSoundAlerts operations={operations} engagement={engagement} subscriptions={subscriptions} orderCount={pendingOrderCount} reviewReportCount={reviewReportCount} />
        {adminSection === "overview" ? <>
        <AdminOverview operations={operations} engagement={engagement} subscriptions={subscriptions} orders={adminOrders} openView={openView} isSuperAdmin={isSuperAdmin} />
        </> : null}

        {adminSection === "site" ? <><div className="glass-card min-w-0 rounded-xl p-4 sm:p-5">
          <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${editingImages ? "border-b border-white/10 pb-5" : ""}`}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="icon-tile"><ImageIcon className="h-5 w-5" /></span>
              <div className="min-w-0">
                <h2 className="text-xl font-black sm:text-2xl">Site görsel yönetimi</h2>
                <p className="mt-1 text-sm text-white/48">Ana sayfa ve alt sayfa bannerlarını, header ve footer logolarını ayrı ayrı yönet.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">{editingImages ? <button className="secondary-button shrink-0 px-4 py-2.5" type="button" onClick={resetImages}><RotateCcw className="h-4 w-4" /> Varsayılanlara Dön</button> : null}<button className={editingImages ? "secondary-button shrink-0 px-4 py-2.5" : "primary-button shrink-0 px-4 py-2.5"} type="button" onClick={() => setEditingImages((value) => !value)}>{editingImages ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}{editingImages ? "Düzenlemeyi Kapat" : "Görselleri Düzenle"}</button></div>
          </div>
          {!editingImages ? <div className="mt-4 flex gap-2 overflow-hidden">{homeImageFields.slice(0, 5).map((field) => <div key={field.key} className="relative h-16 min-w-0 flex-1 overflow-hidden rounded-lg border border-white/10 bg-black/30"><img src={images[field.key]} alt={field.label} className="h-full w-full object-cover opacity-70" /><span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-2 py-1 text-[9px] font-bold text-white/70">{field.label}</span></div>)}</div> : null}
          {editingImages ? <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {homeImageFields.map((field) => (
              <ImageControl key={field.key} field={field} value={images[field.key]} onSave={updateImage} />
            ))}
          </div> : null}
        </div>
        {editingImages ? <div className="glass-card mt-5 min-w-0 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-3"><span className="icon-tile"><ImageIcon className="h-5 w-5" /></span><div><h2 className="text-xl font-black">Mağaza ürün görselleri</h2><p className="mt-1 text-sm text-white/48">Canlı mağaza kataloğuna eklenen her ürün burada otomatik görünür.</p></div></div>
          <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {visualProducts.map((product) => <ImageControl key={product.id} field={{ key: product.id, label: `${product.name} — ${product.type}`, group: "shop-products" }} value={product.image} onSave={async (_key, image) => { const result = await saveProduct({ ...product, image }); if (!result.ok) throw new Error(result.message); setVisualProducts((items) => items.map((item) => item.id === product.id ? { ...item, image } : item)); }} />)}
            {!visualProducts.length ? <p className="py-8 text-center text-xs text-white/40 md:col-span-2 2xl:col-span-3">Mağaza kataloğunda ürün bulunmuyor.</p> : null}
          </div>
        </div> : null}
        <TeamLogoManager images={images} onSave={updateImage} onRemove={removeImage} />
        <CollapsibleAdmin title="Site Bağlantıları ve Metinleri" description="Footer, sosyal medya, partner ve site genelindeki yönetilebilir metinleri tek yerden düzenleyin."><div className="grid items-start gap-4 xl:grid-cols-[minmax(320px,.8fr)_minmax(0,1.2fr)]"><div className="grid min-w-0 gap-4"><PartnerManager partners={partners} onSave={updatePartners} /><SiteTextManager content={siteTexts} onSave={updateSiteText} /></div><FooterLinkManager links={footerLinks} onSave={updateFooterLink} /></div></CollapsibleAdmin></> : null}

        {adminSection === "subscriptions" ? <><CollapsibleAdmin title="Abonelik Yönetimi" description="Paketleri ve bekleyen abonelik taleplerini yönetin."><SubscriptionAdmin subscriptions={subscriptions} /></CollapsibleAdmin>
        <CollapsibleAdmin title="Aktif Kullanıcı Abonelikleri" description="Aktif abonelikleri görüntüleyin veya iptal edin."><ActiveSubscriptionsAdmin subscriptions={subscriptions} /></CollapsibleAdmin>
        </> : null}
        {adminSection === "members" ? <CollapsibleAdmin title="Üye Yönetimi" description="Kullanıcı rollerini, hesap durumlarını ve doğrulama başvurularını yönetin."><div className="admin-members-layout"><AdminMembersPanel /><VerificationRequestsPanel /></div></CollapsibleAdmin> : null}
        {adminSection === "seo" ? <SeoContentCollapsible mode="seo" /> : null}
        {adminSection === "blog" ? <SeoContentCollapsible mode="blog" /> : null}
        {adminSection === "catalog" ? <CollapsibleAdmin title="Oyun ve Mağaza Kataloğu" description="Oyun kategorilerini ve mağaza ürünlerini ekleyin veya düzenleyin."><AdminSectionErrorBoundary><CatalogManagement /></AdminSectionErrorBoundary></CollapsibleAdmin> : null}
        {adminSection === "moderation" ? <><PlayerReviewModeration communityReviews={engagement.reviewQueue} onDeleteCommunity={engagement.deleteReview} />

        <CollapsibleAdmin title="Topluluk İçerikleri" description="Ana sayfa topluluk yorumlarını ve moderasyon kuyruğunu yönetin."><ReviewManager engagement={engagement} /></CollapsibleAdmin></> : null}
        {adminSection === "match-evidence" ? <AdminManagementModal embedded view="matchEvidence" onClose={()=>changeSection("overview")} /> : null}

        {activeView ? <div className="mt-4"><AdminManagementModal embedded view={activeView.view} entityId={activeView.entityId} onClose={() => setActiveView(null)} /></div> : null}
        </main></div>
      </section>
    </>
  );
}

function AdminSidebar({ active, onChange, openView, counts }) {
  const sections = [
    ["overview", "Genel Bakış"], ["members", "Üye Yönetimi"],
    ["subscriptions", "Abonelikler"], ["moderation", "Topluluk ve Yorumlar"], ["match-evidence", "Maç Kanıtları"], ["catalog", "Oyun ve Mağaza"], ["site", "Site Yönetimi"], ["seo", "SEO Ayarları"], ["blog", "Blog Yönetimi"]
  ];
  return <aside className="admin-sidebar sticky top-5 overflow-hidden"><div className="admin-sidebar__brand"><span><Settings /></span><div><p>Yönetim paneli</p><h2>DuoBull Yönetim Merkezi</h2></div></div><button type="button" className="admin-view-site" onClick={() => window.open("/", "_blank", "noopener,noreferrer")}><ExternalLink />Siteyi görüntüle</button><nav>{sections.map(([id,label]) => <button key={id} type="button" onClick={() => onChange(id)} className={active === id ? "is-active" : ""}><LayoutDashboard /><span>{label}</span>{counts[id]>0?<b>{counts[id]}</b>:null}</button>)}</nav><div className="admin-sidebar__quick"><p>Hızlı işlemler</p><button type="button" onClick={() => openView("orders")}><ShoppingBag />Siparişler{counts.orders>0?<b>{counts.orders}</b>:null}</button><button type="button" onClick={() => openView("stock")}><Gift />Ödül Stoğu Ekle</button><button type="button" onClick={() => openView("support")}><Headphones />Destek Talepleri</button><button type="button" onClick={() => openView("balance")}><Activity />Bakiye / XP</button></div></aside>;
}

function AdminSoundAlerts({ operations, engagement, subscriptions, orderCount = 0, reviewReportCount = 0 }) {
  const total = (operations.pendingTeams?.length || 0) + (operations.tournamentRequests || []).filter((item) => item.status === "pending").length + (subscriptions.subscriptions || []).filter((item) => item.status === "pending").length + (engagement.reviewQueue || []).filter((item) => item.status === "pending").length + (engagement.tickets || []).filter((item) => item.status !== "closed").length + orderCount + reviewReportCount;
  const previous = useRef(total);
  const [enabled, setEnabled] = useState(() => window.localStorage.getItem("duobull.admin.sound") !== "off");
  useEffect(() => { if (enabled && total > previous.current) { try { const AudioContext = window.AudioContext || window.webkitAudioContext; const context = new AudioContext(); const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.frequency.setValueAtTime(740,context.currentTime); oscillator.frequency.exponentialRampToValueAtTime(1040,context.currentTime+0.18); gain.gain.setValueAtTime(0.12,context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001,context.currentTime+0.32); oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime+0.32); } catch { /* browser may require interaction */ } } previous.current=total; },[enabled,total]);
  return <div className="my-4 flex items-center justify-between rounded-xl border border-bull-neon/20 bg-bull-neon/[0.05] p-3"><p className="text-xs font-bold text-white/60">Yeni operasyon, abonelik, yorum ve destek işlemleri için sesli uyarı</p><button type="button" onClick={()=>setEnabled((value)=>{window.localStorage.setItem("duobull.admin.sound",value?"off":"on");return !value;})} className="secondary-button px-3 py-2 text-xs">Ses {enabled?"Açık":"Kapalı"}</button></div>;
}

function CollapsibleAdmin({ title, description, children }) { return <div className="mt-6"><section className="glass-card rounded-2xl p-5"><h2 className="text-xl font-black">{title}</h2><p className="mt-1 text-xs text-white/45">{description}</p></section><div className="mt-3">{children}</div></div>; }

function AdminOverview({ operations, engagement, subscriptions, orders, openView, isSuperAdmin }) {
  const openTickets = engagement.tickets.filter((item) => item.status !== "closed");
  const pendingSubscriptions = subscriptions.subscriptions.filter((item) => item.status === "pending");
  const pendingTournaments = operations.tournamentRequests.filter((item) => item.status === "pending");
  const alerts = [
    operations.pendingTeams.length ? { text: `${operations.pendingTeams.length} takım başvurusu onay bekliyor.`, action: "teams" } : null,
    pendingSubscriptions.length ? { text: `${pendingSubscriptions.length} abonelik talebi onay bekliyor.`, action: null } : null,
    openTickets.length ? { text: `${openTickets.length} destek talebi yanıt bekliyor.`, action: "support" } : null,
    orders.filter((item) => item.status !== "completed").length ? { text: `${orders.filter((item) => item.status !== "completed").length} sipariş işlemi bekliyor.`, action: "orders" } : null
  ].filter(Boolean);
  return <>
    <div className="admin-metric-grid"><Metric icon={Users} label="Takım başvurusu" value={operations.pendingTeams.length} onClick={() => openView("teams")} /><Metric icon={Trophy} label="Aktif turnuva" value={operations.publishedTournaments.length} onClick={() => openView("tournament")} /><Metric icon={PackagePlus} label="Ödül stoğu" value={operations.stock} onClick={() => openView("stock")} /><Metric icon={Headphones} label="Açık destek" value={openTickets.length} onClick={() => openView("support")} /></div>
    <div className="admin-overview-grid">
      <section className="admin-recent admin-operation-center"><header><h2>Operasyon Merkezi</h2><span>Canlı işlem kuyruğu</span></header><div className="admin-operation-center__queue">
        {operations.pendingTeams.map((team) => <button type="button" onClick={() => openView("teams", team.id)} key={`team-${team.id}`}><strong>{team.name}</strong><span>Takım onayı</span><b>Beklemede</b></button>)}
        {pendingTournaments.map((item) => <button type="button" onClick={() => openView("tournamentRequests", item.id)} key={`tournament-${item.id}`}><strong>{item.name}</strong><span>Turnuva talebi</span><b>Beklemede</b></button>)}
        {openTickets.map((ticket) => <button type="button" onClick={() => openView("support", ticket.id)} key={`ticket-${ticket.id}`}><strong>{ticket.subject}</strong><span>Destek talebi</span><b>Yanıt bekliyor</b></button>)}
        {orders.filter((item) => item.status !== "completed").map((item) => <button type="button" onClick={() => openView("orders", item.id)} key={`order-${item.id}`}><strong>{item.product_name || item.productName || "Mağaza siparişi"}</strong><span>Sipariş</span><b>İşlem bekliyor</b></button>)}
        {!operations.pendingTeams.length && !pendingTournaments.length && !openTickets.length && !orders.some((item) => item.status !== "completed") ? <p className="admin-overview-empty">Bekleyen operasyon bulunmuyor.</p> : null}
      </div></section>
      <div className="admin-overview-side"><section className="admin-quick-actions"><header><Zap />Hızlı işlemler</header><div><Quick icon={Trophy} label="Turnuva Ekle" onClick={() => openView("tournament")} /><Quick icon={Users} label="Takım Onayla" onClick={() => openView("teams")} /><Quick icon={Gift} label="Ödül Ekle" onClick={() => openView("stock")} /><Quick icon={UserPlus} label="Bakiye / XP" onClick={() => openView("balance")} /><Quick icon={Headphones} label="Destek Talepleri" onClick={() => openView("support")} /><Quick icon={ShoppingBag} label="Siparişler" onClick={() => openView("orders")} /></div></section><section className="admin-alerts"><header><Activity />Sistem uyarıları</header>{alerts.map((item,index) => <button key={index} type="button" onClick={() => item.action && openView(item.action)}><span>!</span><p>{item.text}</p></button>)}{!alerts.length ? <p className="admin-overview-empty">Bekleyen sistem uyarısı yok.</p> : null}</section></div>
    </div>
    {isSuperAdmin ? <CacheControl /> : null}
  </>;
}

function CacheControl() {
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
  const clear=async()=>{setBusy(true);setMessage("");const result=await requestGlobalCacheClear();setBusy(false);setMessage(result.ok?`Cache sürümü ${result.version} olarak yenilendi. Açık istemciler güncel verilerle yeniden yüklenecek.`:result.message);};
  return <section className="glass-card mt-5 flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="icon-tile"><DatabaseZap className="h-5 w-5"/></span><div><h2 className="text-lg font-black">Uygulama Cache Yönetimi</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-white/45">Tarayıcıdaki DuoBull önbelleklerini ve yayın cache sürümünü yeniler. Oturum anahtarları korunur. Bu işlem yalnızca ana yöneticiye açıktır.</p>{message?<p className="mt-2 text-xs font-bold text-emerald-200">{message}</p>:null}</div></div><button type="button" disabled={busy} onClick={clear} className="primary-button shrink-0 px-5 py-3 disabled:opacity-50"><RotateCcw className={busy?"h-4 w-4 animate-spin":"h-4 w-4"}/>{busy?"Temizleniyor...":"Cache'i Temizle"}</button></section>;
}

function Quick({ icon: Icon, label, onClick }) { return <button type="button" onClick={onClick}><Icon /><span>{label}</span></button>; }

function Metric({ icon: Icon, label, value, onClick }) {
  return (
    <button type="button" onClick={onClick} className="admin-metric">
      <span className="icon-tile mb-5">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-white/42">{label}</p>
      <small>Detayları gör →</small>
    </button>
  );
}

function PartnerManager({ partners, onSave }) {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => setValue(partners.map((item) => item.name).join(", ")), [partners]);
  return <form className="glass-card rounded-2xl p-5" onSubmit={async (event) => { event.preventDefault(); await onSave(value.split(",")); setMessage("Partner listesi güncellendi."); }}><h3 className="text-xl font-black">Partner Yönetimi</h3><p className="mt-1 text-xs text-white/45">Partnerleri virgülle ayırarak yaz.</p><input value={value} onChange={(event) => setValue(event.target.value)} className="mt-4 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-bull-neon" placeholder="PUBG, RIOT, RAZER" /><button className="primary-button mt-3 px-4 py-2.5 text-xs">Partnerleri Kaydet</button>{message ? <p className="mt-2 text-xs font-bold text-emerald-200">{message}</p> : null}</form>;
}

function FooterLinkManager({ links, onSave }) {
  const [drafts, setDrafts] = useState([]);
  const [status, setStatus] = useState("");
  useEffect(() => {
    setDrafts(links.filter((item) => ["Destek", "Topluluk"].includes(item.section)).map((item) => ({ ...item, url: item.section === "Topluluk" && !/^https?:\/\//i.test(item.url) ? "" : item.url })));
  }, [links]);
  const update = (id, key, value) => setDrafts((current) => current.map((item) => item.id === id ? { ...item, [key]: value } : item));
  const save = async (item) => {
    setStatus("");
    try {
      await onSave(item);
      setStatus(`${item.label} bağlantısı güncellendi.`);
    } catch (error) {
      setStatus(error?.message || "Bağlantı kaydedilemedi.");
    }
  };
  return <section className="glass-card rounded-2xl p-5">
    <h3 className="text-xl font-black">Footer Bağlantıları</h3>
    <p className="mt-1 text-xs text-white/45">Destek ve topluluk alanındaki yazıları, hedef adresleri ve görünürlüğü yönetin.</p>
    <div className="mt-4 grid gap-4">{["Destek", "Topluluk"].map((section) => <div key={section} className="rounded-xl border border-white/10 bg-black/20 p-4">
      <h4 className="font-black text-bull-neon">{section}</h4>
      <div className="mt-3 grid gap-2">{drafts.filter((item) => item.section === section).sort((a,b) => a.sortOrder-b.sortOrder).map((item) => <div key={item.id} className="grid items-end gap-2 rounded-lg border border-white/10 bg-white/[0.025] p-3 md:grid-cols-[minmax(130px,.8fr)_minmax(180px,1.2fr)_auto_auto]">
        <div className="contents">
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Bağlantı adı<input value={item.label} onChange={(event) => update(item.id,"label",event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-bull-neon" /></label>
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Hedef adres<input type={section === "Topluluk" ? "url" : "text"} value={item.url} onChange={(event) => update(item.id,"url",event.target.value)} placeholder={section === "Topluluk" ? "https://..." : "/destek#sss"} className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-bull-neon" /></label>
        </div>
        <label className="flex h-10 items-center gap-2 whitespace-nowrap text-xs font-bold text-white/60"><input type="checkbox" checked={item.isActive !== false} onChange={(event) => update(item.id,"isActive",event.target.checked)} /> Göster</label><button type="button" onClick={() => save(item)} disabled={!item.label.trim() || !item.url.trim()} className="primary-button button-compact disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-3.5 w-3.5" /> Kaydet</button>
      </div>)}</div>
    </div>)}</div>
    {status ? <p className="mt-3 text-xs font-bold text-emerald-200">{status}</p> : null}
  </section>;
}

function SiteTextManager({ content, onSave }) {
  const [drafts, setDrafts] = useState(() => structuredClone(content));
  const [status, setStatus] = useState("");
  useEffect(() => setDrafts(structuredClone(content)), [content]);
  const setPage = (key, value) => setDrafts((current) => ({ ...current, [key]: value }));
  const save = async (key) => {
    setStatus("");
    try { await onSave(key, drafts[key]); setStatus("İçerik güncellendi."); }
    catch (error) { setStatus(error?.message || "İçerik kaydedilemedi."); }
  };
  const updateFaq = (index, field, value) => setPage("faq", { ...drafts.faq, items: drafts.faq.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) });
  const updateLegal = (key, index, field, value) => setPage(key, { ...drafts[key], sections: drafts[key].sections.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) });
  return <section className="glass-card rounded-2xl p-5">
    <h3 className="text-xl font-black">Destek ve Yasal Metinler</h3><p className="mt-1 text-xs text-white/45">SSS, kullanım koşulları ve gizlilik politikası içeriklerini düzenleyin.</p>
    <div className="mt-4 space-y-3">
      <details className="rounded-xl border border-white/10 bg-black/20 p-4"><summary className="cursor-pointer font-black text-bull-neon">Sık Sorulan Sorular</summary><div className="mt-4 space-y-3"><input value={drafts.faq.title} onChange={(event) => setPage("faq", { ...drafts.faq, title: event.target.value })} className="w-full rounded-lg border border-white/10 bg-black/30 p-3 font-bold text-white outline-none focus:border-bull-neon" />{drafts.faq.items.map((item,index) => <div key={index} className="rounded-lg border border-white/10 p-3"><input value={item.question} onChange={(event) => updateFaq(index,"question",event.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm font-bold text-white outline-none" /><textarea value={item.answer} onChange={(event) => updateFaq(index,"answer",event.target.value)} className="mt-2 min-h-20 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white outline-none" /><button type="button" onClick={() => setPage("faq", { ...drafts.faq, items: drafts.faq.items.filter((_,itemIndex) => itemIndex !== index) })} className="mt-2 text-xs font-bold text-red-200">Soruyu kaldır</button></div>)}<div className="flex flex-wrap justify-between gap-2"><button type="button" onClick={() => setPage("faq", { ...drafts.faq, items: [...drafts.faq.items, { question: "Yeni soru", answer: "Yanıt" }] })} className="secondary-button px-3 py-2 text-xs">Yeni Soru</button><button type="button" onClick={() => save("faq")} className="primary-button px-4 py-2 text-xs"><Save className="h-4 w-4" /> SSS'yi Kaydet</button></div></div></details>
      {[{ key:"terms", label:"Kullanım Koşulları" }, { key:"privacy", label:"Gizlilik Politikası" }].map(({key,label}) => <details key={key} className="rounded-xl border border-white/10 bg-black/20 p-4"><summary className="cursor-pointer font-black text-bull-neon">{label}</summary><div className="mt-4 grid gap-3"><input value={drafts[key].title} onChange={(event) => setPage(key,{...drafts[key],title:event.target.value})} className="rounded-lg border border-white/10 bg-black/30 p-3 font-bold text-white outline-none" /><textarea value={drafts[key].description} onChange={(event) => setPage(key,{...drafts[key],description:event.target.value})} className="min-h-16 rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white outline-none" /><input value={drafts[key].updatedAt} onChange={(event) => setPage(key,{...drafts[key],updatedAt:event.target.value})} placeholder="Son güncelleme tarihi" className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white outline-none" />{drafts[key].sections.map((item,index) => <div key={index} className="rounded-lg border border-white/10 p-3"><input value={item.title} onChange={(event) => updateLegal(key,index,"title",event.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm font-bold text-white outline-none" /><textarea value={item.text} onChange={(event) => updateLegal(key,index,"text",event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white outline-none" /><button type="button" onClick={() => setPage(key,{...drafts[key],sections:drafts[key].sections.filter((_,itemIndex)=>itemIndex!==index)})} className="mt-2 text-xs font-bold text-red-200">Maddeyi kaldır</button></div>)}<div className="flex flex-wrap justify-between gap-2"><button type="button" onClick={() => setPage(key,{...drafts[key],sections:[...drafts[key].sections,{title:"Yeni başlık",text:"Metin"}]})} className="secondary-button px-3 py-2 text-xs">Yeni Madde</button><button type="button" onClick={() => save(key)} className="primary-button px-4 py-2 text-xs"><Save className="h-4 w-4" /> Kaydet</button></div></div></details>)}
    </div>{status ? <p className="mt-3 text-xs font-bold text-emerald-200">{status}</p> : null}
  </section>;
}

function ReviewManager({ engagement }) {
  const reviews = engagement.reviewQueue.filter((review) => review.status === "pending");
  return <section className="glass-card rounded-2xl p-5"><h3 className="text-xl font-black">Yorum Yönetimi</h3><p className="mt-1 text-xs text-white/45">Bekleyen yorumları onaylayabilir, tüm yorumları kalıcı olarak silebilirsiniz.</p><div className="mt-4 max-h-96 space-y-2 overflow-y-auto">{reviews.map((review) => <article key={review.id} className="rounded-lg border border-white/10 bg-black/20 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-white/75">{review.quote}</p><p className="mt-2 text-xs font-bold text-white/40">{review.name}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${review.status === "approved" ? "bg-emerald-400/10 text-emerald-200" : "bg-amber-400/10 text-amber-200"}`}>{review.status === "approved" ? "Yayında" : "Bekliyor"}</span></div><div className="mt-3 flex gap-2"><button type="button" onClick={() => engagement.deleteReview(review.id)} className="secondary-button border-red-300/20 px-3 py-2 text-xs text-red-200">Sil</button>{review.status !== "approved" ? <button type="button" onClick={() => engagement.moderateReview(review.id, "approved")} className="primary-button px-3 py-2 text-xs">Onayla</button> : null}</div></article>)}{reviews.length === 0 ? <p className="py-5 text-center text-xs text-white/40">Henüz yorum yok.</p> : null}</div></section>;
}

const emptyPlan = { id: "", name: "", description: "", price_try: 0, duration_days: 30, bp_enabled: true, tournament_creation: false, multiple_teams: false, loyalty_shop: false, custom_profile:false, max_teams: 1, is_active: true, is_popular: false };
function SubscriptionAdmin({ subscriptions }) {
  const [form, setForm] = useState(emptyPlan);
  const [message, setMessage] = useState("");
  const pending = subscriptions.subscriptions.filter((item) => item.status === "pending");
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const fields = [["bp_enabled","Görev BP ödülü"],["tournament_creation","Turnuva oluşturma"],["multiple_teams","Birden fazla takım"],["loyalty_shop","Sadakat mağazası"],["custom_profile","Özel profil adresi ve banner"],["is_popular","En popüler paket"],["is_active","Paket aktif"]];
  return <section className="glass-card mt-6 rounded-2xl p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-2xl font-black">Abonelik Yönetimi</h2><p className="mt-1 text-xs text-white/45">Paket fiyatlarını ve özellik haklarını yönetin.</p></div><button type="button" onClick={() => setForm(emptyPlan)} className="primary-button px-4 py-2.5 text-xs">Yeni Paket</button></div><div className="mt-5 grid gap-5 xl:grid-cols-2"><div><h3 className="mb-3 font-black">Paketler</h3><div className="space-y-2">{subscriptions.plans.map((plan) => <button type="button" key={plan.id} onClick={() => setForm(plan)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left"><span><strong>{plan.name}</strong><small className="mt-1 block">₺{Number(plan.price_try).toLocaleString("tr-TR")} / {plan.duration_days} gün</small></span><span className="text-xs font-black text-bull-neon">Düzenle</span></button>)}</div><h3 className="mb-3 mt-6 font-black">Bekleyen Talepler</h3>{pending.map((item) => <article key={item.id} className="mb-2 rounded-xl border border-white/10 bg-black/20 p-4"><strong>{subscriptions.plans.find((plan) => plan.id === item.plan_id)?.name || item.plan_id}</strong><p className="mt-1 text-xs text-white/40">Kullanıcı: {item.user_id}</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => subscriptions.review(item.id,"rejected")} className="secondary-button px-3 py-2 text-xs text-red-200">Reddet</button><button type="button" onClick={() => subscriptions.review(item.id,"active")} className="primary-button px-3 py-2 text-xs">Aktifleştir</button></div></article>)}{pending.length === 0 ? <p className="py-4 text-center text-xs text-white/40">Bekleyen talep yok.</p> : null}</div><form className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4" onSubmit={async (event) => { event.preventDefault(); const result = await subscriptions.savePlan(form); setMessage(result.ok ? "Paket kaydedildi." : result.message); if (result.ok) setForm(emptyPlan); }}><div className="grid gap-3 sm:grid-cols-2"><PlanInput label="Paket kodu" value={form.id} disabled={subscriptions.plans.some((item) => item.id === form.id)} onChange={(value) => update("id",value)} /><PlanInput label="Paket adı" value={form.name} onChange={(value) => update("name",value)} /><PlanInput label="Fiyat (₺)" type="number" value={form.price_try} onChange={(value) => update("price_try",value)} /><PlanInput label="Süre (gün)" type="number" value={form.duration_days} onChange={(value) => update("duration_days",value)} /><PlanInput label="Takım limiti" type="number" value={form.max_teams} onChange={(value) => update("max_teams",value)} /></div><label className="text-xs font-bold text-white/60">Açıklama<textarea value={form.description} onChange={(event) => update("description",event.target.value)} className="mt-2 min-h-20 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white outline-none" /></label><div className="grid gap-2 sm:grid-cols-2">{fields.map(([key,label]) => <label key={key} className="flex items-center gap-2 rounded-lg border border-white/10 p-3 text-xs font-bold"><input type="checkbox" checked={Boolean(form[key])} onChange={(event) => update(key,event.target.checked)} />{label}</label>)}</div><button className="primary-button py-2.5">Paketi Kaydet</button>{message ? <p className="text-xs font-bold text-emerald-200">{message}</p> : null}</form></div></section>;
}
function PlanInput({ label, value, onChange, type="text", disabled=false }) { const currency = label.includes("Fiyat"); return <label className="text-xs font-bold text-white/60">{label}{currency ? <div className="currency-input mt-2"><b>₺</b><input required disabled={disabled} type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} className="border-0 bg-transparent p-3 text-white outline-none disabled:opacity-40" /></div> : <input required disabled={disabled} type={type} min={type === "number" ? 0 : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white outline-none disabled:opacity-40" />}</label>; }

function ActiveSubscriptionsAdmin({ subscriptions }) {
  const active = subscriptions.subscriptions.filter((item) => item.status === "active" && new Date(item.ends_at).getTime() > Date.now());
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("tr-TR");
  const visible = active.filter((item) => !normalized || `${item.userName} ${item.userEmail} ${item.user_id}`.toLocaleLowerCase("tr-TR").includes(normalized));
  return <section className="glass-card rounded-2xl p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-xl font-black">Aktif Aboneler</h2><span className="rounded-full bg-bull-neon/10 px-2 py-1 text-[10px] font-black text-bull-neon">{active.length}</span></div><p className="mt-1 text-xs text-white/45">Kullanıcı, paket ve bitiş tarihini tek listeden yönetin.</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kullanıcı veya e-posta ara" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white sm:w-64" /></div><div className="mt-4 max-h-[430px] space-y-2 overflow-y-auto pr-1">{visible.map((item) => <article key={item.id} className="grid items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3 md:grid-cols-[minmax(0,1fr)_minmax(150px,.55fr)_auto]"><div className="min-w-0"><strong className="block truncate">{item.userName}</strong><p className="mt-1 truncate text-xs text-white/45">{item.userEmail || item.user_id}</p></div><div><strong className="block text-xs text-white/70">{subscriptions.plans.find((plan) => plan.id === item.plan_id)?.name || item.plan_id}</strong><small className="mt-1 block text-white/35">Bitiş: {new Date(item.ends_at).toLocaleDateString("tr-TR")}</small></div><button type="button" onClick={async () => { if (!window.confirm(`${item.userName} kullanıcısının aboneliği iptal edilsin mi?`)) return; const result = await subscriptions.cancel(item.id); setMessage(result.ok ? "Abonelik iptal edildi." : result.message); }} className="secondary-button button-compact border-red-300/20 text-red-200">İptal Et</button></article>)}{visible.length === 0 ? <p className="py-8 text-center text-xs text-white/40">{active.length ? "Aramayla eşleşen abone yok." : "Aktif kullanıcı aboneliği yok."}</p> : null}</div>{message ? <p className="mt-3 text-xs font-bold text-emerald-200">{message}</p> : null}</section>;
}

function ImageControl({ field, value, onSave }) {
  const [input, setInput] = useState(value);
  const [status, setStatus] = useState("");

  useEffect(() => setInput(value), [value]);

  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("Lütfen bir görsel dosyası seç.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setStatus("Dosya 8 MB'dan küçük olmalı.");
      return;
    }
    try {
      const image = await compressImage(file);
      setInput(image);
      await onSave(field.key, image);
      setStatus("Görsel güncellendi.");
    } catch {
      setStatus("Görsel işlenemedi.");
    }
  };

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-black/25">
      <div className="aspect-[16/8] overflow-hidden bg-black/40">
        {value ? <img src={value} alt={field.label} className={`h-full w-full ${field.group === "team-logos" ? "object-contain p-3" : "object-cover"}`} /> : <div className="flex h-full items-center justify-center text-white/25"><ImageIcon className="h-9 w-9" /></div>}
      </div>
      <form
        className="p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!input.trim()) return;
          await onSave(field.key, input.trim());
          setStatus("Görsel güncellendi.");
        }}
      >
        <h3 className="truncate text-sm font-black text-white" title={field.label}>{field.label}</h3>
        <label className="mt-3 block">
          <span className="sr-only">Görsel adresi</span>
          <input className="w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-bull-neon/60" value={input} onChange={(event) => setInput(event.target.value)} placeholder="/gorsel.png veya https://..." />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="secondary-button cursor-pointer px-3 py-2 text-xs">
            <Upload className="h-4 w-4" /> Dosya Seç
            <input className="sr-only" type="file" accept="image/*" onChange={upload} />
          </label>
          <button className="primary-button px-3 py-2 text-xs" type="submit"><Save className="h-4 w-4" /> Kaydet</button>
        </div>
        {status ? <p className="mt-2 text-xs font-bold text-emerald-200">{status}</p> : null}
      </form>
    </article>
  );
}

function TeamLogoManager({ images, onSave, onRemove }) {
  const logos = getTeamLogoOptions(images);
  const [draftKey, setDraftKey] = useState("");
  const [message, setMessage] = useState("");
  const addLogo = () => { setDraftKey(`team-logo-${Date.now()}`); setMessage(""); };
  return <section className="glass-card mt-5 min-w-0 rounded-xl p-4 sm:p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="icon-tile"><ImageIcon className="h-5 w-5" /></span><div><h2 className="text-xl font-black sm:text-2xl">Hazır Takım Logoları</h2><p className="mt-1 text-sm text-white/48">Oyuncuların takım oluştururken seçebileceği logoları bağımsız olarak ekle, değiştir veya kaldır.</p></div></div><button type="button" onClick={addLogo} disabled={Boolean(draftKey)} className="primary-button shrink-0 px-4 py-2.5 disabled:opacity-45"><Plus className="h-4 w-4" /> Yeni Logo Ekle</button></div>
    <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {logos.map((logo, index) => <div key={logo.key} className="team-logo-admin-item"><ImageControl field={{ key: logo.key, label: `Hazır takım logosu ${index + 1}`, group: "team-logos" }} value={logo.url} onSave={onSave} /><button type="button" className="team-logo-remove" onClick={async () => { if (!window.confirm("Bu hazır takım logosu kaldırılsın mı?")) return; await onRemove(logo.key); setMessage("Takım logosu kaldırıldı."); }}><Trash2 className="h-4 w-4" /> Logoyu Kaldır</button></div>)}
      {draftKey ? <div className="team-logo-admin-item"><ImageControl field={{ key: draftKey, label: "Yeni hazır takım logosu", group: "team-logos" }} value="" onSave={async (key, value) => { await onSave(key, value); setDraftKey(""); setMessage("Yeni takım logosu eklendi."); }} /><button type="button" className="team-logo-remove" onClick={() => setDraftKey("")}><X className="h-4 w-4" /> Eklemeden Vazgeç</button></div> : null}
    </div>
    {!logos.length && !draftKey ? <div className="mt-5 rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-white/40">Henüz hazır takım logosu eklenmedi.</div> : null}
    {message ? <p className="mt-4 text-xs font-bold text-emerald-200">{message}</p> : null}
  </section>;
}

function compressImage(file) {
  return toWebpDataUrl(file, 0.86, 1600);
}
