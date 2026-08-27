import { supabase } from "../lib/supabase.js";
import { uploadPublicImage } from "../lib/storageImages.js";

const SAFE_VIDEO_TYPES = new Map([["video/mp4", "mp4"], ["video/webm", "webm"]]);
const MAX_DISCUSSION_VIDEO_BYTES = 50 * 1024 * 1024;

export async function fetchDiscussionPosts(currentUserId) {
  const [{ data, error }, { data: subscribers }] = await Promise.all([
    supabase.from("discussion_posts").select("*,profiles!discussion_posts_author_id_fkey(id,username,avatar_url,is_verified),discussion_comments(id),discussion_votes(user_id,value)"),
    supabase.rpc("discussion_subscriber_ids")
  ]);
  if (error) throw error;
  const subscriberIds = new Set((subscribers || []).map((item) => item.user_id));
  return (data || []).map((post) => {
    const votes = post.discussion_votes || [];
    const likes = votes.filter((vote) => vote.value === 1).length;
    const dislikes = votes.filter((vote) => vote.value === -1).length;
    const commentCount = post.discussion_comments?.length || 0;
    return { ...post, likes, dislikes, commentCount, myVote: votes.find((vote) => vote.user_id === currentUserId)?.value || 0, isSubscriber: subscriberIds.has(post.author_id), engagement: likes * 2 + commentCount * 3 - dislikes };
  }).sort((a, b) => b.engagement - a.engagement || new Date(b.created_at) - new Date(a.created_at));
}

export async function createDiscussionPost(userId, { title, body, file }) {
  let media_url = null, media_type = null;
  if (file) {
    media_type = SAFE_VIDEO_TYPES.has(file.type) ? "video" : "image";
    if(media_type === "image"){
      try{media_url=(await uploadPublicImage({bucket:"discussion-media",prefix:userId,label:"post",file})).url;}
      catch(error){return{ok:false,message:error.message};}
    }else{
      if (!SAFE_VIDEO_TYPES.has(file.type)) return { ok: false, message: "Yalnızca MP4 veya WebM video yüklenebilir." };
      if (!file.size || file.size > MAX_DISCUSSION_VIDEO_BYTES) return { ok: false, message: "Video en fazla 50 MB olabilir." };
      const path = `${userId}/${crypto.randomUUID()}.${SAFE_VIDEO_TYPES.get(file.type)}`;
      const { error } = await supabase.storage.from("discussion-media").upload(path, file, { contentType: file.type, cacheControl:"31536000" });
      if (error) return { ok: false, message: error.message };
      media_url = supabase.storage.from("discussion-media").getPublicUrl(path).data.publicUrl;
    }
  }
  const { error } = await supabase.from("discussion_posts").insert({ author_id: userId, title: title.trim(), body: body.trim(), media_url, media_type });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function fetchDiscussionComments(postId) {
  const [{ data, error }, { data: subscribers }] = await Promise.all([
    supabase.from("discussion_comments").select("*,profiles!discussion_comments_author_id_fkey(id,username,avatar_url,is_verified),parent:parent_comment_id(id,body,profiles!discussion_comments_author_id_fkey(username))").eq("post_id", postId).order("created_at"),
    supabase.rpc("discussion_subscriber_ids")
  ]);
  if (error) return [];
  const subscriberIds = new Set((subscribers || []).map((item) => item.user_id));
  return (data || []).map((comment) => ({ ...comment, isSubscriber: subscriberIds.has(comment.author_id) }));
}

export async function addDiscussionComment(userId, postId, body, parentCommentId = null) {
  const { error } = await supabase.from("discussion_comments").insert({ author_id: userId, post_id: postId, body: body.trim(), parent_comment_id: parentCommentId });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function voteDiscussion(userId, postId, value, currentValue = 0) {
  if (currentValue === value) {
    const { error } = await supabase.from("discussion_votes").delete().eq("post_id", postId).eq("user_id", userId);
    return error ? { ok: false, message: error.message } : { ok: true };
  }
  const { error } = await supabase.from("discussion_votes").upsert({ user_id: userId, post_id: postId, value }, { onConflict: "post_id,user_id" });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function deleteDiscussionPost(postId) {
  const { error } = await supabase.from("discussion_posts").delete().eq("id", postId);
  return error ? { ok: false, message: error.message } : { ok: true };
}

export function subscribeToDiscussions(refresh) {
  const channel = supabase.channel("discussion-feed-live");
  ["discussion_posts", "discussion_comments", "discussion_votes"].forEach((table) => channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh));
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}
