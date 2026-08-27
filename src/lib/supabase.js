import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase bağlantı bilgileri eksik. .env.local dosyasını kontrol edin.");
}

function isPrivilegedSupabaseKey(key) {
  if (key.startsWith("sb_secret_")) {
    return true;
  }

  // Eski tip JWT service_role anahtarlarının istemci paketine girmesini de engeller.
  const jwtParts = key.split(".");
  if (jwtParts.length !== 3) {
    return false;
  }

  try {
    const payload = jwtParts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(payload));
    return decoded?.role === "service_role";
  } catch {
    return false;
  }
}

if (isPrivilegedSupabaseKey(supabaseKey)) {
  throw new Error(
    "Güvenlik hatası: Service Role/secret anahtarı tarayıcı uygulamasında kullanılamaz. " +
      "VITE_SUPABASE_PUBLISHABLE_KEY alanına yalnızca publishable/anon anahtarını girin."
  );
}

const AUTH_PERSISTENCE_KEY = "duobull.rememberMe";
const authStorage = {
  getItem(key) { return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key); },
  setItem(key, value) {
    const persistent = window.localStorage.getItem(AUTH_PERSISTENCE_KEY) !== "false";
    const target = persistent ? window.localStorage : window.sessionStorage;
    const stale = persistent ? window.sessionStorage : window.localStorage;
    stale.removeItem(key); target.setItem(key, value);
  },
  removeItem(key) { window.localStorage.removeItem(key); window.sessionStorage.removeItem(key); }
};

export function setAuthPersistence(rememberMe) {
  window.localStorage.setItem(AUTH_PERSISTENCE_KEY, String(Boolean(rememberMe)));
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: authStorage
  }
});
