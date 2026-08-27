import { supabase } from "../lib/supabase.js";

export async function fetchSiteTexts() {
  const { data, error } = await supabase.from("site_text_content").select("content_key,content");
  if (error) throw error;
  return Object.fromEntries((data || []).map((item) => [item.content_key, item.content]));
}

export async function saveSiteText(key, content) {
  const { error } = await supabase.from("site_text_content").upsert({ content_key: key, content, updated_at: new Date().toISOString() }, { onConflict: "content_key" });
  if (error) throw error;
}

export function subscribeToSiteTexts(listener) {
  const channel = supabase.channel("site-text-content-live").on("postgres_changes", { event: "*", schema: "public", table: "site_text_content" }, listener).subscribe();
  return () => supabase.removeChannel(channel);
}
