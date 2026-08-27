import { supabase } from "../lib/supabase.js";

const VERSION_KEY = "duobull.cache.version";

export async function clearBrowserApplicationCache() {
  let cacheCount = 0;
  if ("caches" in window) {
    const keys = await window.caches.keys();
    await Promise.all(keys.map((key) => window.caches.delete(key)));
    cacheCount = keys.length;
  }
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
  // Oyuncu bakiyesi, görev ilerlemesi ve oturum tercihleri uygulama verisidir;
  // tarayıcı cache'i temizlenirken local/session storage kesinlikle silinmez.
  return cacheCount;
}

export async function requestGlobalCacheClear() {
  const { data, error } = await supabase.rpc("clear_application_cache");
  if (error) return { ok: false, message: error.message };
  window.localStorage.setItem(VERSION_KEY, String(data));
  const cacheCount = await clearBrowserApplicationCache();
  return { ok: true, version: data, cacheCount };
}

export function subscribeToGlobalCacheVersion(onChanged) {
  let active = true;
  const check = async () => {
    const { data } = await supabase.from("app_cache_state").select("version").eq("id", true).maybeSingle();
    if (!active || data?.version == null) return;
    const incoming = String(data.version);
    const current = window.localStorage.getItem(VERSION_KEY);
    if (current == null) window.localStorage.setItem(VERSION_KEY, incoming);
    else if (current !== incoming) {
      window.localStorage.setItem(VERSION_KEY, incoming);
      await clearBrowserApplicationCache();
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("cache-version", incoming);
      window.location.replace(nextUrl.toString());
    }
  };
  check();
  const channel = supabase.channel("global-cache-version").on("postgres_changes", { event: "UPDATE", schema: "public", table: "app_cache_state" }, check).subscribe();
  return () => { active = false; supabase.removeChannel(channel); };
}
