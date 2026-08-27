import { supabase } from "../lib/supabase.js";

async function resolveUserId(recipient) {
  if (!recipient) return null;
  if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(recipient)) return recipient;
  const { data } = await supabase.from("profiles").select("id").eq("email", recipient).maybeSingle();
  return data?.id || null;
}

export async function createNotification(recipient, message, type = "general", entityId = null) {
  const recipientId = await resolveUserId(recipient);
  if (!recipientId) return null;
  const { data, error } = await supabase.rpc("create_system_notification", { target_user_id: recipientId, notification_message: message, kind: type, related_id: entityId });
  if (error) console.error("Bildirim oluşturulamadı:", error.message);
  return error ? null : data;
}

export async function fetchNotifications(recipient) {
  const recipientId = await resolveUserId(recipient);
  if (!recipientId) return [];
  const { data, error } = await supabase.from("notifications").select("*").eq("recipient_id", recipientId).order("created_at", { ascending: false });
  if (error) {
    console.error("Bildirimler alınamadı:", error.message);
    return [];
  }
  return data.map((item) => ({ id: item.id, recipientId: item.recipient_id, message: item.message, type: item.notification_type, entityId: item.entity_id, isRead: item.is_read, createdAt: item.created_at }));
}

export async function markNotificationsRead(recipient, types = []) {
  const recipientId = await resolveUserId(recipient);
  if (!recipientId) return;
  let query = supabase.from("notifications").update({ is_read: true }).eq("recipient_id", recipientId).eq("is_read", false);
  if (types.length) query = query.in("notification_type", types);
  const { error } = await query;
  if (error) throw error;
}

export function markNotificationRead(notificationId) {
  return supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
}

export function deleteNotification(id) {
  return supabase.from("notifications").delete().eq("id", id).select("id").single();
}

export async function clearAllNotifications(recipient) {
  const recipientId = await resolveUserId(recipient);
  if (!recipientId) return;
  const { error } = await supabase.from("notifications").delete().eq("recipient_id", recipientId);
  if (error) throw error;
}

export function subscribeToNotifications(recipientId, listener) {
  const channel = supabase.channel(`notifications-${recipientId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${recipientId}` }, listener)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
