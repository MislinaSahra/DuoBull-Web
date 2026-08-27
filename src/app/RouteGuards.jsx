import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function LoadingScreen() {
  return <div className="min-h-screen bg-[#05090c]" />;
}

/** Yalnızca yönetici hesaplarının erişebildiği sayfaları korur. */
export function ProtectedAdmin({ children }) {
  const location = useLocation();
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) {
    return <Navigate to="/giris" replace state={{ from: location.pathname, reason: "admin" }} />;
  }
  if (!isAdmin) return <Navigate to="/403" replace />;
  return children;
}

/** Oturum gerektiren kullanıcı sayfalarını korur. */
export function ProtectedUser({ children }) {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/giris" replace state={{ from }} />;
  }
  return children;
}
