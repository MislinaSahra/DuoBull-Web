import { supabase } from "../lib/supabase.js";

export async function fetchTournamentFormats({ activeOnly = false } = {}) {
  let query = supabase.from("tournament_formats").select("*").order("sort_order").order("name");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function saveTournamentFormat(format) {
  const payload = { name: format.name.trim(), description: format.description?.trim() || "", is_active: format.is_active !== false, sort_order: Number(format.sort_order || 0), updated_at: new Date().toISOString() };
  if (format.id) payload.id = format.id;
  const { data, error } = await supabase.from("tournament_formats").upsert(payload).select().single();
  return error ? { ok: false, message: error.message } : { ok: true, format: data };
}

export async function deleteTournamentFormat(id) {
  const { error } = await supabase.from("tournament_formats").delete().eq("id", id);
  return error ? { ok: false, message: error.message } : { ok: true };
}
