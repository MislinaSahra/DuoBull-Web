import { supabase } from "../lib/supabase.js";

export async function fetchAdminMembers(query = "") {
  const clean = query.trim();
  const pageSize = 1000;
  const members = [];
  for (let from = 0; ; from += pageSize) {
    let request = supabase.from("profiles").select("id,email,username,role,is_super_admin,is_verified,account_status,balance,loyalty_xp,referral_reward_type,referral_reward_value,created_at").order("created_at", { ascending: false }).range(from, from + pageSize - 1);
    if (clean) request = request.or(`email.ilike.%${clean}%,username.ilike.%${clean}%`);
    const { data, error } = await request;
    if (error) throw error;
    members.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return members;
}

export async function updateReferralReward(userId, rewardType, rewardValue) {
  const { error } = await supabase.rpc("admin_set_referral_reward", { p_user_id: userId, p_reward_type: rewardType, p_reward_value: Number(rewardValue) });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function updateAdminMember(member) {
  const { data, error } = await supabase.rpc("admin_save_member", { p_user_id: member.id, p_username: member.username, p_role: member.role, p_status: member.account_status });
  if (error) return { ok: false, message: error.message };
  const saved = data?.[0];
  if (!saved) return { ok: false, message: "Kullanıcı güncellenemedi." };
  window.dispatchEvent(new CustomEvent("duobull:member-updated", { detail: { userId: saved.member_id } }));
  return { ok: true, member: { ...member, username: saved.member_username, role: saved.member_role, account_status: saved.member_status, is_super_admin: saved.member_super_admin } };
}

export async function moderateAdminMember(userId, minutes) {
  const { error } = await supabase.rpc("admin_moderate_account", { target_user_id: userId, suspension_minutes: minutes });
  return error ? { ok: false, message: error.message } : { ok: true };
}
