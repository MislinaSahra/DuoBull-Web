import { supabase } from "../lib/supabase.js";

export async function fetchSupportTickets() {
  const [ticketsResult, profilesResult] = await Promise.all([
    supabase.from("support_tickets").select("*,support_replies(*)").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id,email,username")
  ]);
  if (ticketsResult.error) return [];
  const profiles = new Map((profilesResult.data || []).map((item) => [item.id, item]));
  return ticketsResult.data.map((ticket) => ({
    id: ticket.id, subject: ticket.subject, category: ticket.category, message: ticket.message, status: ticket.status,
    userId: ticket.user_id, userEmail: profiles.get(ticket.user_id)?.email || "", userName: profiles.get(ticket.user_id)?.username || "Oyuncu",
    createdAt: ticket.created_at, closedAt: ticket.closed_at,
    replies: (ticket.support_replies || []).map((reply) => ({ id: reply.id, message: reply.message, adminName: profiles.get(reply.admin_id)?.username || "DuoBull Yönetimi", createdAt: reply.created_at }))
  }));
}

export async function createSupportTicket(userId, form) {
  const { data, error } = await supabase.from("support_tickets").insert({ user_id: userId, subject: form.subject, category: form.category, message: form.message }).select().single();
  return error ? { ok: false, message: error.message } : { ok: true, ticket: data };
}

export async function replySupportTicket(id, message) {
  const { error } = await supabase.rpc("reply_support_ticket", { target_ticket_id: id, reply_message: message });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function closeSupportTicket(id) {
  const { error } = await supabase.rpc("close_support_ticket", { target_ticket_id: id });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function deleteSupportTicket(id) {
  const { error } = await supabase.rpc("delete_closed_support_ticket", { target_ticket_id: id });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export function subscribeToSupport(listener) {
  const channel = supabase.channel("support-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, listener)
    .on("postgres_changes", { event: "*", schema: "public", table: "support_replies" }, listener)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
