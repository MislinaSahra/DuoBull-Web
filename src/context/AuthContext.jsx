import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { setAuthPersistence, supabase } from "../lib/supabase.js";
import { getTurkishAuthError } from "../utils/authErrorMessages.js";
import { validatePassword } from "../utils/passwordValidation.js";
import { getTotpFactors, verifyMfaChallenge } from "../services/MfaService.js";
import {
  captureReferralCode,
  clearPendingReferralCode,
  getPendingReferralCode
} from "../services/ReferralService.js";

const AuthContext = createContext(null);

function toPublicUser(authUser, profile) {
  if (!authUser) return null;
  return {
    id: authUser.id,
    email: authUser.email,
    name: profile?.username || authUser.user_metadata?.username || authUser.email?.split("@")[0] || "Oyuncu",
    game: profile?.game || authUser.user_metadata?.game || "Valorant",
    playerRole: profile?.player_role || authUser.user_metadata?.player_role || "Düellocu",
    region: profile?.region || "Türkiye",
    discord: profile?.discord || "",
    bio: profile?.bio || "",
    avatar: profile?.avatar_url || "",
    joinedAt: profile?.created_at || authUser.created_at || new Date().toISOString(),
    role: profile?.role || "user",
    isSuperAdmin: Boolean(profile?.is_super_admin),
    accountStatus: profile?.account_status === "suspended" && profile?.suspended_until && profile.suspended_until !== "infinity" && new Date(profile.suspended_until).getTime() <= Date.now() ? "active" : (profile?.account_status || "active"),
    suspendedUntil: profile?.suspended_until || null,
    rank: profile?.rank || "Belirtilmedi",
    mainCharacter: profile?.main_character || "",
    usesMicrophone: Boolean(profile?.uses_microphone),
    playHours: profile?.play_hours || "",
    playSchedule: profile?.play_schedule || "",
    loyaltyXp: Number(profile?.loyalty_xp || 0),
    usernameChangedAt: profile?.username_changed_at || null
    ,isVerified: Boolean(profile?.is_verified)
    ,customSlug: profile?.custom_slug || ""
    ,profileBanner: profile?.profile_banner_url || ""
  };
}

function clearDeletedUserCache(email) {
  const directKeys = ["duobull.session", "duobull.cart", `duobull.missions.${email}`, `duobull.loyalty.${email}`];
  directKeys.forEach((key) => window.localStorage.removeItem(key));
  const filteredCollections = [
    ["duobull.users", (item) => item.email !== email],
    ["duobull.orders", (item) => item.userEmail !== email],
    ["duobull.notifications", (item) => (item.recipientId || item.recipientEmail) !== email]
  ];
  filteredCollections.forEach(([key, keep]) => {
    try {
      const items = JSON.parse(window.localStorage.getItem(key) || "[]");
      window.localStorage.setItem(key, JSON.stringify(items.filter(keep)));
    } catch {
      window.localStorage.removeItem(key);
    }
  });
  try {
    const social = JSON.parse(window.localStorage.getItem("duobull.social") || "{}");
    window.localStorage.setItem("duobull.social", JSON.stringify({
      friendRequests: (social.friendRequests || []).filter((item) => item.fromEmail !== email && item.toEmail !== email),
      friendships: (social.friendships || []).filter((item) => !(item.users || []).includes(email)),
      messages: (social.messages || []).filter((item) => item.fromEmail !== email && item.toEmail !== email && item.senderEmail !== email)
    }));
  } catch { window.localStorage.removeItem("duobull.social"); }
  try {
    const engagement = JSON.parse(window.localStorage.getItem("duobull.engagement") || "{}");
    window.localStorage.setItem("duobull.engagement", JSON.stringify({
      ...engagement,
      reviews: (engagement.reviews || []).filter((item) => item.authorEmail !== email),
      tickets: (engagement.tickets || []).filter((item) => item.userEmail !== email)
    }));
  } catch { window.localStorage.removeItem("duobull.engagement"); }
}

async function loadUser(authUser) {
  if (!authUser) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
  if (error) console.error("Profil yüklenemedi:", error.message);
  return toPublicUser(authUser, data);
}

async function loadAuthenticatedUser(authUser) {
  if (!authUser?.email_confirmed_at) return null;
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (data?.nextLevel === "aal2" && data?.currentLevel !== "aal2") return null;
  return loadUser(authUser);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    captureReferralCode();
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const nextUser = await loadAuthenticatedUser(data.session?.user);
      if (active) {
        setUser(nextUser?.accountStatus === "suspended" ? null : nextUser);
        setLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") window.sessionStorage.setItem("duobull.passwordRecovery", "verified");
      window.setTimeout(async () => {
        const nextUser = await loadAuthenticatedUser(session?.user);
        if (active) {
          setUser(nextUser?.accountStatus === "suspended" ? null : nextUser);
          setLoading(false);
        }
      }, 0);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;
    const channel = supabase.channel(`account-status-${user.id}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, async () => {
      const nextUser = await loadUser({ id: user.id, email: user.email, created_at: user.joinedAt, user_metadata: {} });
      if (nextUser?.accountStatus === "suspended") { await supabase.auth.signOut(); setUser(null); return; }
      setUser(nextUser);
    }).subscribe();
    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  useEffect(() => {
    const reloadCurrentMember = async (event) => {
      if (!user?.id || event.detail?.userId !== user.id) return;
      const { data } = await supabase.auth.getUser();
      const nextUser = await loadUser(data.user);
      if (nextUser?.accountStatus === "suspended") { await supabase.auth.signOut(); setUser(null); return; }
      setUser(nextUser);
    };
    window.addEventListener("duobull:member-updated", reloadCurrentMember);
    return () => window.removeEventListener("duobull:member-updated", reloadCurrentMember);
  }, [user?.id]);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === "admin",
    isSuperAdmin: Boolean(user?.isSuperAdmin),
    async register(form) {
      const email = form.email.trim().toLowerCase();
      const username = form.name?.trim();
      if (!email || !form.password || !username) return { ok: false, message: "Oyuncu adı, e-posta ve şifre zorunlu." };
      const passwordError = validatePassword(form.password);
      if (passwordError) return { ok: false, message: passwordError };
      const { data: available, error: availabilityError } = await supabase.rpc("is_username_available", { candidate: username });
      if (availabilityError) return { ok: false, message: "Kullanıcı adı kontrol edilemedi. Lütfen tekrar deneyin." };
      if (!available) {
        const { data: pending } = await supabase.rpc("is_pending_signup", { candidate_username: username, candidate_email: email });
        if (pending) {
          const { error: resendError } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${window.location.origin}/` } });
          return resendError
            ? { ok: false, message: getTurkishAuthError(resendError, "Hesabınız oluşturulmuş ancak doğrulama e-postası yeniden gönderilemedi.") }
            : { ok: true, needsEmailConfirmation: true, message: "Hesabınız zaten oluşturulmuş. Doğrulama e-postası yeniden gönderildi." };
        }
        return { ok: false, message: "Bu kullanıcı adı kullanılıyor. Lütfen başka bir kullanıcı adı seçin." };
      }
      const referralCode = captureReferralCode() || getPendingReferralCode();
      let { data, error } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/giris`,
          data: {
            username,
            game: form.game || "Valorant",
            player_role: form.playerRole || "Düellocu",
            referral_code: referralCode || undefined
          }
        }
      });
      const isDatabaseSignupError = error && (
        error.status >= 500 ||
        error.code === "unexpected_failure" ||
        String(error.message || "").toLowerCase().includes("database error saving new user")
      );
      if (isDatabaseSignupError && referralCode) {
        clearPendingReferralCode();
        ({ data, error } = await supabase.auth.signUp({
          email,
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/giris`,
            data: {
              username,
              game: form.game || "Valorant",
              player_role: form.playerRole || "Düellocu"
            }
          }
        }));
      }
      if (error) {
        console.error("Kayıt işlemi başarısız:", { code: error.code, status: error.status, message: error.message });
        return { ok: false, message: getTurkishAuthError(error, "Kayıt oluşturulamadı. Lütfen kısa süre sonra tekrar deneyin.") };
      }
      clearPendingReferralCode();
      if (!data.session) return { ok: true, needsEmailConfirmation: true, message: "Kayıt tamamlandı. E-posta adresindeki doğrulama bağlantısını aç." };
      const nextUser = await loadUser(data.user);
      if (nextUser?.accountStatus === "suspended") { await supabase.auth.signOut(); setUser(null); return { ok: false, message: "Hesabınız yönetici tarafından askıya alınmıştır." }; }
      setUser(nextUser);
      return { ok: true, user: nextUser };
    },
    async verifyMfa(factorId, code) {
      try {
        await verifyMfaChallenge(factorId, code);
        const { data } = await supabase.auth.getUser();
        const nextUser = await loadUser(data.user);
        setUser(nextUser);
        return { ok: true, user: nextUser };
      } catch (error) {
        return { ok: false, message: getTurkishAuthError(error, "Doğrulama kodu geçersiz veya süresi dolmuş.") };
      }
    },
    async login(form) {
      setAuthPersistence(form.rememberMe !== false);
      const { data, error } = await supabase.auth.signInWithPassword({ email: form.email.trim().toLowerCase(), password: form.password });
      if (error?.code === "email_not_confirmed" || error?.message?.toLowerCase().includes("email not confirmed")) return { ok: false, needsEmailConfirmation: true, message: "Giriş yapmadan önce e-posta adresinizi doğrulayın." };
      if (error) return { ok: false, message: "E-posta veya şifre hatalı." };
      if (!data.user?.email_confirmed_at) { await supabase.auth.signOut(); setUser(null); return { ok: false, needsEmailConfirmation: true, message: "Giriş yapmadan önce e-posta adresinizi doğrulayın." }; }
      const factors = await getTotpFactors();
      const verifiedFactor = factors.find((factor) => factor.status === "verified");
      if (verifiedFactor) { setUser(null); return { ok: false, needsMfa: true, factorId: verifiedFactor.id, message: "Authenticator uygulamanızdaki 6 haneli kodu girin." }; }
      const nextUser = await loadUser(data.user);
      if (nextUser?.accountStatus === "suspended") { await supabase.auth.signOut(); setUser(null); return { ok: false, message: "Hesabınız yönetici tarafından askıya alınmıştır." }; }
      setUser(nextUser);
      return { ok: true, user: nextUser };
    },
    async resendVerificationEmail(email) {
      const cleanEmail = email?.trim().toLowerCase();
      if (!cleanEmail) return { ok: false, message: "Lütfen e-posta adresinizi yazın." };
      const { error } = await supabase.auth.resend({ type: "signup", email: cleanEmail, options: { emailRedirectTo: `${window.location.origin}/giris` } });
      return error ? { ok: false, message: getTurkishAuthError(error, "Doğrulama e-postası gönderilemedi.") } : { ok: true, message: "Doğrulama e-postası yeniden gönderildi." };
    },
    async verifyRecoveryCode(code) {
      const { data, error } = await supabase.rpc("consume_mfa_recovery_code", { p_code: code.trim().toUpperCase() });
      if (error || !data) return { ok: false, message: "Kurtarma kodu geçersiz veya daha önce kullanılmış." };
      const { data: authData } = await supabase.auth.getUser();
      const nextUser = await loadUser(authData.user); setUser(nextUser);
      return { ok: true, user: nextUser };
    },
    async requestPasswordReset(email) {
      const cleanEmail = email?.trim().toLowerCase();
      if (!cleanEmail) return { ok: false, message: "Lütfen e-posta adresinizi yazın." };
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: `${window.location.origin}/sifre-yenile` });
      return error ? { ok: false, message: getTurkishAuthError(error, "Şifre değiştirme bağlantısı gönderilemedi.") } : { ok: true, message: "Şifre değiştirme bağlantısı e-posta adresinize gönderildi." };
    },
    async updatePassword(password) {
      const passwordError = validatePassword(password);
      if (passwordError) return { ok: false, message: passwordError };
      if (window.sessionStorage.getItem("duobull.passwordRecovery") !== "verified") return { ok: false, message: "Önce e-postanıza gönderilen doğrulama bağlantısını açmalısınız." };
      const { error } = await supabase.auth.updateUser({ password });
      if (!error) window.sessionStorage.removeItem("duobull.passwordRecovery");
      return error ? { ok: false, message: getTurkishAuthError(error, "Şifre güncellenemedi.") } : { ok: true };
    },
    async logout() {
      await supabase.auth.signOut();
      setUser(null);
    },
    async requestAccountDeletionCode() {
      if (!user || user.role === "admin") return { ok: false, message: "Bu hesap silinemez." };
      const { error } = await supabase.auth.signInWithOtp({ email: user.email, options: { shouldCreateUser: false } });
      return error
        ? { ok: false, message: getTurkishAuthError(error, "Doğrulama kodu gönderilemedi.") }
        : { ok: true, message: "Hesap silme doğrulama kodu e-posta adresinize gönderildi." };
    },
    async deleteAccount(code) {
      if (!user || user.role === "admin") return { ok: false, message: "Bu hesap silinemez." };
      if (!/^\d{6}$/.test(String(code||"").trim())) return { ok: false, message: "E-postanıza gönderilen 6 haneli doğrulama kodunu girin." };
      const { error: verifyError } = await supabase.auth.verifyOtp({ email: user.email, token: String(code).trim(), type: "email" });
      if (verifyError) return { ok: false, message: getTurkishAuthError(verifyError, "Doğrulama kodu geçersiz veya süresi dolmuş.") };
      const { error } = await supabase.rpc("delete_my_account");
      if (error) return { ok: false, message: error.message.includes("EMAIL_VERIFICATION_REQUIRED") ? "Hesabı silmeden önce e-posta doğrulamasını tamamlayın." : "Hesap silinemedi. Lütfen tekrar deneyin." };
      await supabase.auth.signOut();
      clearDeletedUserCache(user.email);
      setUser(null);
      return { ok: true };
    },
    async updateProfile(form) {
      if (!user) return { ok: false, message: "Profilini düzenlemek için giriş yapmalısın." };
      const nextUsername = form.name?.trim() || user.name;
      if (nextUsername.toLocaleLowerCase("tr-TR") !== user.name.toLocaleLowerCase("tr-TR")) {
        const { data: available, error: availabilityError } = await supabase.rpc("is_username_available", { candidate: nextUsername });
        if (availabilityError) return { ok: false, message: "Kullanıcı adı kontrol edilemedi." };
        if (!available) return { ok: false, message: "Bu kullanıcı adı zaten kullanılıyor." };
      }
      const updates = {
        username: nextUsername,
        game: form.game || user.game,
        player_role: form.playerRole || user.playerRole,
        region: form.region || user.region,
        discord: form.discord ?? user.discord,
        bio: form.bio ?? user.bio,
        avatar_url: form.avatar ?? user.avatar,
        rank: form.rank ?? user.rank,
        main_character: form.mainCharacter ?? user.mainCharacter,
        uses_microphone: Boolean(form.usesMicrophone),
        play_hours: form.playHours ?? user.playHours,
        play_schedule: form.playSchedule ?? user.playSchedule,
        custom_slug: form.customSlug?.trim() || null,
        profile_banner_url: form.profileBanner ?? user.profileBanner,
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabase.from("profiles").update(updates).eq("id", user.id).select().single();
      if (error) return { ok: false, message: error.code === "23505" ? "Bu kullanıcı adı zaten kullanılıyor." : "Profil güncellenemedi. Lütfen tekrar deneyin." };
      const nextUser = toPublicUser({ id: user.id, email: user.email, created_at: user.joinedAt }, data);
      setUser(nextUser);
      return { ok: true, user: nextUser };
    }
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
