import { useLocation } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import SiteFrame from "../components/SiteFrame.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ProtectedUser } from "./RouteGuards.jsx";

/** Ortak sayfa iskeleti: üst menü, içerik ve footer. */
export default function AppLayout({ children }) {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  return (
    <SiteFrame>
      <Header />
      <main>{children}</main>
      {isAuthenticated || pathname === "/" ? <Footer /> : null}
    </SiteFrame>
  );
}

/** Oturum gerektirmeyen sayfaları ortak site iskeletinde gösterir. */
export function PublicPage({ children }) {
  return <AppLayout>{children}</AppLayout>;
}

/** Yalnızca giriş yapmış kullanıcıların erişebildiği sayfaları gösterir. */
export function UserPage({ children }) {
  return (
    <ProtectedUser>
      <AppLayout>{children}</AppLayout>
    </ProtectedUser>
  );
}
