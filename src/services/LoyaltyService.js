import { supabase } from "../lib/supabase.js";

export async function assignLoyaltyXp(userId, amount) {
  const { data, error } = await supabase.rpc("assign_wallet", { target_user_id: userId, balance_delta: 0, xp_delta: amount });
  return error ? { ok: false, message: error.message } : { ok: true, xp: data?.[0]?.loyalty_xp || 0 };
}

export function subscribeToLoyalty(listener) {
  const channel = supabase.channel("loyalty-live").on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, listener).subscribe();
  return () => supabase.removeChannel(channel);
}
