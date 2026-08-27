import { supabase } from "../lib/supabase.js";
import { removeStoredImage, uploadPublicImage } from "../lib/storageImages.js";

export async function fetchPlayerStats(id) {
  const { data, error } = await supabase.rpc("get_player_profile_stats", { target_user: id });
  if (error) return null;
  return data?.[0] || data || null;
}

export async function fetchPlayerLeaderboard(limit = 5) {
  const { data: profiles, error } = await supabase.from("profiles").select("id,username,avatar_url,is_verified,loyalty_xp,game,player_role,rank,main_character,uses_microphone").eq("account_status", "active");
  if (error) return [];
  const rows = await Promise.all((profiles || []).map(async (profile) => {
    const stats = await fetchPlayerStats(profile.id);
    const matchCount = Number(stats?.match_count || 0);
    const xp = Number(profile.loyalty_xp || 0);
    return { ...profile, matchCount, xp, score: matchCount * 1000 + xp };
  }));
  return rows.sort((a, b) => b.matchCount - a.matchCount || b.xp - a.xp || a.username.localeCompare(b.username, "tr")).slice(0, limit);
}

export async function setProfileVerified(id, isVerified) {
  const { error } = await supabase.rpc("admin_set_profile_verified", {
    target_user: id,
    next_verified: isVerified,
  });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function uploadProfileBanner(userId, file) {
  try {
    const uploaded = await uploadPublicImage({
      bucket: "profile-banners",
      prefix: userId,
      label: "banner",
      file,
    });
    return { ok: true, ...uploaded };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

export async function removeProfileBanner(url) {
  await removeStoredImage(url, ["profile-banners"]);
}

export async function fetchMyVerificationRequest() {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("profile_verification_requests")
    .select("*")
    .eq("user_id", auth.user?.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return error ? null : data;
}

export async function requestProfileVerification({ motivation, profileLink }) {
  const { error } = await supabase.rpc("request_profile_verification", { application_motivation: motivation, application_profile_link: profileLink || "" });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function fetchVerificationRequests() {
  const { data, error } = await supabase
    .from("profile_verification_requests")
    .select("*,profiles!profile_verification_requests_user_id_fkey(username,email,avatar_url)")
    .eq("status", "pending")
    .order("created_at");
  return error ? [] : data || [];
}

export async function reviewVerificationRequest(id, decision) {
  const { error } = await supabase.rpc("review_profile_verification", {
    request_id: id,
    decision,
  });
  return error ? { ok: false, message: error.message } : { ok: true };
}
