import { supabase } from "../lib/supabase.js";

export async function fetchPartners() {
  const { data, error } = await supabase.from("site_partners").select("*").order("sort_order");
  if (error) throw error;
  return data || [];
}

export async function replacePartners(names) {
  const clean = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  const { error: deleteError } = await supabase.from("site_partners").delete().neq("name", "");
  if (deleteError) throw deleteError;
  if (!clean.length) return [];
  const { data, error } = await supabase.from("site_partners").insert(clean.map((name, index) => ({ name, sort_order: (index + 1) * 10 }))).select();
  if (error) throw error;
  return data;
}

export function subscribeToPartners(refresh) {
  const channel = supabase.channel("site-partners-live").on("postgres_changes", { event: "*", schema: "public", table: "site_partners" }, refresh).subscribe();
  return () => supabase.removeChannel(channel);
}
