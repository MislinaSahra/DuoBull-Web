import { Bell, LayoutDashboard, LogOut, Menu, Trash2, UserCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { brandAssets } from "../data/brandAssets.js";
import { navLinks } from "../data/mockData.js";
import { useNotifications } from "../context/NotificationContext.jsx";
import { getNotificationTarget } from "../utils/notificationNavigation.js";
import { useAdminOperations } from "../context/AdminOperationsContext.jsx";
import { useEngagement } from "../context/EngagementContext.jsx";
import { useSubscription } from "../context/SubscriptionContext.jsx";
import { fetchReportedPlayerReviews } from "../services/PlayerReviewService.js";
import { fetchOrders, subscribeToOrders } from "../services/OrderService.js";
import { supabase } from "../lib/supabase.js";
import { useHomeContent } from "../context/HomeContentContext.jsx";
import { fetchMatchEvidence } from "../services/TeamMatchService.js";

export default function Header() {
  const { images } = useHomeContent();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { notifications } = useNotifications();
  const operations = useAdminOperations();
  const engagement = useEngagement();
  const subscriptions = useSubscription();
  const [adminReviewReports,setAdminReviewReports]=useState(0);
  const [adminOrders,setAdminOrders]=useState([]);
  const [matchEvidenceCount,setMatchEvidenceCount]=useState(0);
  useEffect(()=>{if(!isAdmin)return undefined;const refresh=()=>fetchReportedPlayerReviews().then(items=>setAdminReviewReports(items.length)).catch(()=>setAdminReviewReports(0));refresh();const channel=supabase.channel("header-admin-review-badge").on("postgres_changes",{event:"*",schema:"public",table:"player_review_reports"},refresh).subscribe();return()=>supabase.removeChannel(channel);},[isAdmin]);
  useEffect(()=>{if(!isAdmin){setAdminOrders([]);return undefined;}const refresh=()=>fetchOrders().then(items=>setAdminOrders(Array.isArray(items)?items:[])).catch(()=>setAdminOrders([]));refresh();return subscribeToOrders(refresh,"header-admin-orders-live");},[isAdmin]);
  useEffect(()=>{if(!isAdmin){setMatchEvidenceCount(0);return undefined;}const refresh=()=>fetchMatchEvidence().then(items=>setMatchEvidenceCount(items.filter(item=>item.status==="pending").length)).catch(()=>setMatchEvidenceCount(0));refresh();const channel=supabase.channel("header-match-evidence-badge").on("postgres_changes",{event:"*",schema:"public",table:"team_match_rounds"},refresh).subscribe();return()=>supabase.removeChannel(channel);},[isAdmin]);
  const socialUnread = notifications.filter((item) => !(item.isRead ?? item.read) && ["direct_message", "team_message", "tournament_message"].includes(item.type)).length;
  const adminUnread = isAdmin ? operations.pendingTeams.length + operations.tournamentRequests.filter(item=>item.status==="pending").length + engagement.tickets.filter(item=>item.status!=="closed").length + engagement.reviewQueue.filter(item=>item.status==="pending").length + subscriptions.subscriptions.filter(item=>item.status==="pending").length + adminOrders.filter(item=>item.status!=="completed").length + adminReviewReports + matchEvidenceCount : 0;

  const linkClass = ({ isActive }) =>
    `whitespace-nowrap text-sm font-black transition ${
      isActive ? "relative text-bull-neon after:absolute after:-bottom-3 after:left-0 after:right-0 after:h-0.5 after:bg-bull-neon after:shadow-[0_0_12px_rgba(255,90,0,.6)]" : "text-white/70 hover:text-white"
    }`;

  const closeMenu = () => setIsOpen(false);
  const focusAuth = (mode) => window.dispatchEvent(new CustomEvent("duobull:focus-auth", { detail: { mode } }));

  return (
    <header className="site-header sticky top-0 z-50 border-b border-white/10 bg-[#04090c]/95 shadow-[0_10px_35px_rgba(0,0,0,.28)] backdrop-blur-2xl">
      <nav className="container-shell flex h-20 items-center justify-between gap-5">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="DuoBull ana sayfa">
          <img src={images["header-logo"] || brandAssets.logos.horizontalColor} alt="DuoBull" className="h-12 w-auto max-w-[220px] object-contain" />
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-7 xl:flex">
          {isAuthenticated ? navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              <span className="relative inline-flex items-center gap-1.5">{link.label}{link.to === "/sosyal" && socialUnread ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">{socialUnread}</span> : null}</span>
            </NavLink>
          )) : null}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {isAdmin ? (
            <Link to="/admin" className="secondary-button header-action-button px-4 py-2.5">
              <LayoutDashboard className="h-4 w-4" />
              <span className="relative">Admin{adminUnread?<span className="header-count-badge">{adminUnread}</span>:null}</span>
            </Link>
          ) : null}
          {isAuthenticated ? (
            <>
              <NotificationButton />
              <Link to="/profil" className="secondary-button header-action-button max-w-44 px-4 py-2.5">
                <UserCircle className="h-4 w-4 shrink-0" />
                <span className="truncate">{user.name}</span>
              </Link>
              <button className="secondary-button header-action-button px-4 py-2.5" type="button" onClick={() => setConfirmLogout(true)}>
                <LogOut className="h-4 w-4" />
                Çıkış
              </button>
            </>
          ) : <><Link to="/#hesap" onClick={() => focusAuth("giris")} className="secondary-button px-5 py-2.5">Giriş Yap</Link><Link to="/#hesap" onClick={() => focusAuth("kayit")} className="primary-button px-5 py-2.5">Kayıt Ol</Link></>}
        </div>

        {!isAuthenticated ? <div className="flex items-center gap-2 lg:hidden"><Link to="/#hesap" onClick={() => focusAuth("giris")} className="secondary-button px-3 py-2 text-xs">Giriş</Link><Link to="/#hesap" onClick={() => focusAuth("kayit")} className="primary-button px-3 py-2 text-xs">Kayıt Ol</Link></div> : null}

        {isAuthenticated ? <button
          className="secondary-button px-3 py-3 xl:hidden"
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          aria-label="Mobil menüyü aç"
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button> : null}
      </nav>

      {isOpen ? (
        <div className="mobile-nav-panel border-t border-white/10 bg-[#05090c] xl:hidden">
          <div className="mobile-nav-panel__inner container-shell grid gap-2 py-5 sm:grid-cols-2 lg:grid-cols-4">
            {isAuthenticated ? navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={closeMenu}
                className={({ isActive }) =>
                  `rounded-lg border px-3 py-3 text-sm font-bold transition ${
                    isActive
                      ? "border-bull-neon/30 bg-bull-neon/12 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/72 hover:bg-white/[0.06] hover:text-white"
                  }`
                }
              >
                <span className="flex items-center justify-between gap-2">{link.label}{link.to === "/sosyal" && socialUnread ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">{socialUnread}</span> : null}</span>
              </NavLink>
            )) : null}
            {isAdmin ? (
              <Link to="/admin" onClick={closeMenu} className="secondary-button py-2.5">
                <LayoutDashboard className="h-4 w-4" />
                Admin{adminUnread?<span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">{adminUnread}</span>:null}
              </Link>
            ) : null}
            {isAuthenticated ? (
              <>
                <NotificationButton mobile />
                <Link to="/profil" onClick={closeMenu} className="secondary-button py-2.5">
                  <UserCircle className="h-4 w-4" />
                  Profilim
                </Link>
                <button
                  className="secondary-button py-2.5"
                  type="button"
                  onClick={() => setConfirmLogout(true)}
                >
                  <LogOut className="h-4 w-4" />
                  Çıkış
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
      {confirmLogout ? createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030106]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="logout-title" onMouseDown={(event) => event.target === event.currentTarget && setConfirmLogout(false)}><section className="relative w-full max-w-md overflow-hidden rounded-2xl border border-bull-neon/25 bg-[#0b0712] p-6 text-left shadow-[0_0_60px_rgba(255,90,0,0.22)] sm:p-7"><div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-bull-neon/15 blur-3xl" /><div className="relative"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl border border-bull-neon/25 bg-bull-neon/10 text-bull-neon shadow-neon"><LogOut className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-bull-neon">Oturum işlemi</p><h2 id="logout-title" className="mt-1 text-xl font-black text-white">DuoBull’dan çıkış yapılsın mı?</h2></div></div><p className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-white/55">Oturumun güvenli şekilde kapatılacak. İstediğin zaman yeniden giriş yapabilirsin.</p><div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={() => setConfirmLogout(false)} className="secondary-button px-4 py-2.5 text-xs">Oturuma Dön</button><button type="button" onClick={() => { setConfirmLogout(false); closeMenu(); logout(); }} className="primary-button px-4 py-2.5 text-xs"><LogOut className="h-4 w-4" /> Çıkış Yap</button></div></div></section></div>, document.body) : null}
    </header>
  );
}

function NotificationButton({ mobile = false }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead: persistRead, markAllRead, deleteOne, clearAll } = useNotifications();
  const openNotification = async (notification) => {
    await persistRead(notification.id);
    const target = getNotificationTarget(notification);
    setOpen(false);
    if (target) navigate(target);
  };
  const markAsRead = (id) => {
    const notification = notifications.find((item) => item.id === id);
    return notification ? openNotification(notification) : persistRead(id);
  };
  return <div className={`relative ${mobile ? "sm:col-span-2" : ""}`}><button type="button" onClick={() => setOpen((value) => !value)} className={`secondary-button header-action-button notification-trigger relative ${mobile ? "w-full py-2.5" : "px-3 py-2.5"}`} aria-label="Bildirimleri aç" aria-expanded={open}><Bell className="h-4 w-4" />{mobile ? "Bildirimler" : null}{unreadCount ? <span className="notification-badge">{unreadCount}</span> : null}</button>{open ? <div className={`z-[70] mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#0b0711] shadow-2xl ${mobile ? "relative w-full" : "absolute right-0 w-80 max-w-[calc(100vw-2rem)]"}`}><div className="flex items-center justify-between border-b border-white/10 p-3"><h3 className="text-sm font-black">Bildirimler</h3><div className="flex gap-2">{unreadCount ? <button type="button" onClick={markAllRead} className="text-[11px] font-black text-bull-neon">Tümünü Oku</button> : null}{notifications.length ? <button type="button" onClick={clearAll} className="text-[11px] font-black text-red-300">Tümünü Temizle</button> : null}</div></div><div className="max-h-80 overflow-y-auto p-2">{notifications.map((notification) => { const isRead = notification.isRead ?? notification.read; return <div key={notification.id} className={`mb-1 flex items-start gap-1 rounded-lg border p-2 transition ${isRead ? "border-transparent text-white/40" : "border-bull-neon/15 bg-bull-neon/[0.06] text-white/80"}`}><button type="button" onClick={() => markAsRead(notification.id)} className="min-w-0 flex-1 p-1 text-left text-xs leading-5">{notification.message}<span className="mt-1 block text-[10px] text-white/30">{new Date(notification.createdAt).toLocaleString("tr-TR")}</span></button><button type="button" onClick={() => deleteOne(notification.id)} className="shrink-0 rounded-md p-2 text-white/35 hover:bg-red-400/10 hover:text-red-200" aria-label="Bildirimi sil"><Trash2 className="h-3.5 w-3.5" /></button></div>; })}{notifications.length === 0 ? <p className="p-5 text-center text-xs text-white/40">Henüz bildirimin yok.</p> : null}</div></div> : null}</div>;
}
