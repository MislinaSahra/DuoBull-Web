import { supabase } from "../lib/supabase.js";

const mapReview = (item) => ({ id: item.id, authorId: item.author_id, name: item.author_name, role: `${item.author_game || "Oyuncu"} oyuncusu`, quote: item.quote, status: item.status || "pending", createdAt: item.created_at });

export async function fetchReviews() {
  const { data, error } = await supabase.from("community_reviews").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapReview);
}

export async function createReview(user, quote) {
  const { data, error } = await supabase.from("community_reviews").insert({ author_id: user.id, author_name: user.name, author_game: user.game || "Oyuncu", quote: quote.trim() }).select().single();
  if (error) throw error;
  return mapReview(data);
}

export async function deleteReview(id) {
  const { error } = await supabase.from("community_reviews").delete().eq("id", id);
  if (error) throw error;
}

export async function moderateReview(id, status) {
  const { error } = await supabase.from("community_reviews").update({ status }).eq("id", id);
  if (error) throw error;
}

export function subscribeToReviews(refresh) {
  const channel = supabase.channel("community-reviews-live").on("postgres_changes", { event: "*", schema: "public", table: "community_reviews" }, refresh).subscribe();
  return () => supabase.removeChannel(channel);
}
