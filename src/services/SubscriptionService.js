import { supabase } from "../lib/supabase.js";

export async function fetchSubscriptionData() {
  const [plans, subscriptions, profiles] = await Promise.all([
    supabase.from("subscription_plans").select("*").order("sort_order"),
    supabase.from("user_subscriptions").select("*").order("requested_at", { ascending: false }),
    supabase.from("profiles").select("id,email,username")
  ]);
  if (plans.error) throw plans.error;
  if (subscriptions.error) throw subscriptions.error;
  if (profiles.error) throw profiles.error;
  const profileMap = new Map((profiles.data || []).map((profile) => [profile.id, profile]));
  return { plans: plans.data || [], subscriptions: (subscriptions.data || []).map((item) => ({ ...item, user_uuid: item.user_id, user_id: profileMap.get(item.user_id)?.email || item.user_id, userEmail: profileMap.get(item.user_id)?.email || "", userName: profileMap.get(item.user_id)?.username || "Oyuncu" })), profiles: profiles.data || [] };
}

export async function requestSubscription(planId) {
  const { data, error } = await supabase.rpc("request_subscription", { requested_plan: planId });
  return error ? { ok: false, message: error.message } : { ok: true, id: data };
}

export async function reviewSubscription(id, decision) {
  const { error } = await supabase.rpc("review_subscription", { subscription_id: id, decision });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function cancelSubscription(id) {
  const { error } = await supabase.rpc("cancel_user_subscription", { target_subscription_id: id });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function saveSubscriptionPlan(plan) {
  if (plan.is_popular) {
    const { error: popularError } = await supabase.from("subscription_plans").update({ is_popular: false }).neq("id", plan.id || "");
    if (popularError) return { ok: false, message: popularError.message };
  }
  const record = {
    id: plan.id.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-"), name: plan.name.trim(), description: plan.description.trim(),
    price_try: Number(plan.price_try), duration_days: Number(plan.duration_days), bp_enabled: plan.bp_enabled,
    tournament_creation: plan.tournament_creation, multiple_teams: plan.multiple_teams,
    loyalty_shop: plan.loyalty_shop, custom_profile: Boolean(plan.custom_profile), max_teams: Number(plan.max_teams), is_active: plan.is_active, is_popular: Boolean(plan.is_popular),
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from("subscription_plans").upsert(record);
  return error ? { ok: false, message: error.message } : { ok: true };
}

export function subscribeToSubscriptions(refresh) {
  const channel = supabase.channel("subscriptions-live");
  ["subscription_plans", "user_subscriptions"].forEach((table) => channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh));
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}
