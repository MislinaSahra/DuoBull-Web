import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useMissions } from "../context/MissionContext.jsx";
import { supabase } from "../lib/supabase.js";
import { subscribeToGlobalCacheVersion } from "../services/CacheService.js";

const MISSION_BY_PATH = {
  "/takim-bul": "visit-team-finder",
  "/turnuvalar": "visit-tournaments",
  "/sosyal": "visit-social",
  "/profil": "visit-profile",
};

export function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname, search, hash]);

  return null;
}

/** Kullanıcının ziyaret tabanlı günlük görevlerini kaydeder. */
export function DailyMissionTracker() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { refresh } = useMissions();

  useEffect(() => {
    const missionId = MISSION_BY_PATH[pathname];
    if (!user?.id || !missionId) return;

    supabase
      .rpc("record_daily_mission", { target_mission_id: missionId })
      .then(() => refresh());
  }, [pathname, refresh, user?.id]);

  return null;
}

/** Her sayfada çalışan, görünür arayüz üretmeyen uygulama davranışları. */
export default function AppEffects() {
  useEffect(() => subscribeToGlobalCacheVersion(), []);
  useEffect(() => {
    let active = true;
    const checkVersion = async () => {
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
        const remote = await response.json();
        if (active && remote?.version && String(remote.version) !== String(__APP_VERSION__)) {
          if ("caches" in window) await Promise.all((await window.caches.keys()).map((key) => window.caches.delete(key)));
          const next = new URL(window.location.href); next.searchParams.set("app-version", remote.version);
          window.location.replace(next.toString());
        }
      } catch { /* çevrimdışıyken mevcut sürüm çalışmaya devam eder */ }
    };
    checkVersion();
    const timer = window.setInterval(checkVersion, 60000);
    const onVisible = () => document.visibilityState === "visible" && checkVersion();
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);
  return (
    <>
      <ScrollToTop />
      <DailyMissionTracker />
    </>
  );
}
