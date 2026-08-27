import { supabase } from "../lib/supabase.js";

export async function fetchBalanceUsers() {
  const { data, error } = await supabase.from("profiles").select("id,email,username,balance,loyalty_xp").order("username");
  return error ? [] : data.map((item) => ({ id: item.id, email: item.email, name: item.username, balance: item.balance, xp: item.loyalty_xp }));
}

export async function fetchBalanceUserByEmail(email) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;
  const { data, error } = await supabase.from("profiles").select("id,email,username,balance,loyalty_xp").eq("email", cleanEmail).maybeSingle();
  if (error || !data) return null;
  return { id: data.id, email: data.email, name: data.username, balance: data.balance, xp: data.loyalty_xp };
}

export async function assignBalance(userId, amount) {
  const { data, error } = await supabase.rpc("assign_wallet", { target_user_id: userId, balance_delta: amount, xp_delta: 0 });
  return error ? { ok: false, message: error.message } : { ok: true, balance: data?.[0]?.balance || 0 };
}

export function subscribeToBalance(listener) {
  const channel = supabase.channel("wallet-admin-live").on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, listener).subscribe();
  return () => supabase.removeChannel(channel);
}
