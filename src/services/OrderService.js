import { supabase } from "../lib/supabase.js";

function mapOrder(order, profiles = new Map()) {
  return {
    id: order.id,
    userId: order.user_id,
    userEmail: profiles.get(order.user_id)?.email || "",
    items: (order.order_items || []).map((item) => ({ name: item.product_name, type: item.product_type, price: item.unit_price_bp, quantity: item.quantity })),
    total: order.total_bp,
    status: order.status,
    delivery_code: order.delivery_code,
    createdAt: order.created_at,
    completedAt: order.completed_at
  };
}

export async function createOrder({ productIds }) {
  const { data, error } = await supabase.rpc("checkout", { product_ids: productIds });
  if (error) return { ok: false, message: error.message };
  const { data: order, error: orderError } = await supabase.from("orders").select("*,order_items(*)").eq("id", data).single();
  return orderError ? { ok: false, message: orderError.message } : { ok: true, order: mapOrder(order) };
}

export async function fetchOrders(userEmail) {
  const [ordersResult, profilesResult] = await Promise.all([
    supabase.from("orders").select("*,order_items(*)").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id,email")
  ]);
  if (ordersResult.error) return [];
  const profiles = new Map((profilesResult.data || []).map((profile) => [profile.id, profile]));
  const orders = ordersResult.data.map((order) => mapOrder(order, profiles));
  return userEmail ? orders.filter((order) => order.userEmail === userEmail) : orders;
}

export async function deliverOrderCode(id, deliveryCode) {
  const code = deliveryCode.trim();
  if (!code) return { ok: false, message: "Ürün kodu zorunlu." };
  const { error } = await supabase.rpc("deliver_order", { target_order_id: id, code });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function deleteOrder(id) {
  const { error } = await supabase.rpc("delete_completed_order", { target_order_id: id });
  return error ? { ok: false, message: error.message } : { ok: true, id };
}

export async function clearCompletedOrders() {
  const { data, error } = await supabase.rpc("clear_completed_orders");
  return error ? { ok: false, removed: 0, message: error.message } : { ok: true, removed: data || 0 };
}

export function subscribeToOrders(listener, channelName = "orders-live") {
  const channel = supabase.channel(channelName)
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, listener)
    .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, listener)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
