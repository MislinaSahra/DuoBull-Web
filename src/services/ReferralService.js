import { supabase } from "../lib/supabase.js";

const REFERRAL_STORAGE_KEY = "duobull.referralCode";

export function captureReferralCode() {
  const code = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase();
  if (code) window.sessionStorage.setItem(REFERRAL_STORAGE_KEY, code);
  return code || null;
}

export function getPendingReferralCode() {
  return window.sessionStorage.getItem(REFERRAL_STORAGE_KEY);
}

export function clearPendingReferralCode() {
  window.sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
}

export async function getReferralSummary() {
  const { data, error } = await supabase.rpc("get_my_referral_summary");
  if (error) return { ok: false, message: "Referans bilgileri yüklenemedi." };
  const summary = Array.isArray(data) ? data[0] : data;
  return {
    ok: true,
    summary: {
      code: summary?.referral_code || "",
      total: Number(summary?.total_referrals || 0),
      rewarded: Number(summary?.rewarded_referrals || 0),
      earnedBp: Number(summary?.earned_bp || 0)
      ,rewardType: summary?.reward_type || "fixed"
      ,rewardValue: Number(summary?.reward_value || 100)
    }
  };
}
