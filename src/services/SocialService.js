import { supabase } from "../lib/supabase.js";

export async function fetchSocialData() {
  const [profiles, requests, friendships, direct, teams, tournaments, blocks, clears] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("friend_requests").select("*").order("created_at"),
    supabase.from("friendships").select("*").order("created_at"),
    supabase.from("direct_messages").select("*").order("created_at"),
    supabase.from("team_messages").select("*").order("created_at"),
    supabase.from("tournament_messages").select("*").order("created_at"),
    supabase.from("user_blocks").select("*"),
    supabase.from("direct_conversation_clears").select("*")
  ]);
  const failed = [profiles, requests, friendships, direct, teams, tournaments, blocks, clears].find((result) => result.error);
  if (failed) throw failed.error;
  return {
    profiles: profiles.data || [], requests: requests.data || [], friendships: friendships.data || [],
    direct: direct.data || [], teams: teams.data || [], tournaments: tournaments.data || [], blocks: blocks.data || [], clears: clears.data || []
  };
}

export async function sendFriendRequest(receiverId) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("friend_requests").insert({ sender_id: auth.user.id, receiver_id: receiverId });
  if (error) throw error;
}

export async function reviewFriendRequest(requestId, decision) {
  const { error } = await supabase.rpc("review_friend_request", { request_id: requestId, decision });
  if (error) throw error;
}

export async function removeFriend(friendId) {
  const { error } = await supabase.rpc("remove_friend", { friend_id: friendId });
  if (error) throw error;
}

export async function sendDirectMessage(receiverId, message) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("direct_messages").insert({ sender_id: auth.user.id, receiver_id: receiverId, message });
  if (error) throw error;
}

export async function sendChannelMessage(type, channelId, message) {
  const { data: auth } = await supabase.auth.getUser();
  const table = type === "team" ? "team_messages" : "tournament_messages";
  const channelKey = type === "team" ? "team_id" : "tournament_id";
  const { error } = await supabase.from(table).insert({ [channelKey]: channelId, sender_id: auth.user.id, message });
  if (error) throw error;
}

export async function markDirectMessagesSeen(otherUserId) {
  const { error } = await supabase.rpc("mark_direct_messages_seen", { other_user: otherUserId });
  if (error) throw error;
}

export async function setUserBlock(otherUserId, shouldBlock) {
  const { error } = await supabase.rpc("set_user_block", { other_user: otherUserId, should_block: shouldBlock });
  if (error) throw error;
}

export async function clearDirectConversation(otherUserId) {
  const { error } = await supabase.rpc("clear_direct_conversation", { other_user: otherUserId });
  if (error) throw error;
}

export function subscribeSocial(refresh) {
  const channel = supabase.channel("social-live");
  ["profiles", "friend_requests", "friendships", "direct_messages", "team_messages", "tournament_messages", "user_blocks", "direct_conversation_clears"].forEach((table) => {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
  });
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}
