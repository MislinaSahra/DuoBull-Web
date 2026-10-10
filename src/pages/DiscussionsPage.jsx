import { BadgeCheck, Crown, MessageSquare, Plus, Send, ThumbsDown, ThumbsUp, Trash2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { addDiscussionComment, deleteDiscussionPost, fetchDiscussionComments, fetchDiscussionPosts, subscribeToDiscussions, voteDiscussion } from "../services/DiscussionService.js";

const emojis = ["😀", "😂", "🔥", "❤️", "👏", "🎮", "🏆", "🤝", "💯", "😮"];

export default function DiscussionsPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const refresh = useCallback(() => fetchDiscussionPosts(user?.id).then(setPosts).catch(() => setPosts([])), [user?.id]);

  useEffect(() => { refresh(); return subscribeToDiscussions(refresh); }, [refresh]);
  return <>
    <PageHero eyebrow="DuoBull Topluluğu" title="Fikirlerini paylaş," highlightedTitle="Topluluğa yön ver!" description="Taktiklerini paylaş, oyun gündemini tartış, görsel ve videolarla topluluğa katıl." backgroundKey="discussions" iconKey="community" showTrust={false} actions={<Link to="/tartismalar/yeni" className="primary-button"><Plus />Yeni tartışma başlat</Link>} />
    <section className="container-shell pb-16">
      <main className="mx-auto grid max-w-5xl gap-4">{posts.map((post) => <DiscussionCard key={post.id} post={post} user={user} refresh={refresh} />)}{!posts.length ? <div className="glass-card rounded-xl p-12 text-center text-white/40">Henüz tartışma başlatılmamış. İlk gönderiyi sen yayınlayabilirsin.</div> : null}</main>
    </section>
  </>;
}

function MemberName({ profile, subscriber }) {
  return <Link to={`/oyuncu/${profile?.id}`} className={subscriber ? "discussion-member-name is-subscriber" : "discussion-member-name"}>{profile?.username || "Oyuncu"}{subscriber ? <span title="DuoBull abonesi"><Crown /></span> : null}{profile?.is_verified ? <BadgeCheck className="h-4 w-4 text-bull-neon" /> : null}</Link>;
}

function DiscussionCard({ post, user, refresh }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [replying, setReplying] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const loadComments = useCallback(() => fetchDiscussionComments(post.id).then(setComments), [post.id]);
  useEffect(() => { if (open) loadComments(); }, [open, loadComments, post.commentCount]);
  const vote = async (value) => { await voteDiscussion(user.id, post.id, value, post.myVote); refresh(); };
  const submitComment = async (event) => { event.preventDefault(); const result = await addDiscussionComment(user.id, post.id, text, replying?.id); if (result.ok) { setText(""); setReplying(null); loadComments(); refresh(); } };
  const canDelete = user.role === "admin" || user.id === post.author_id;

  return <article className={`glass-card discussion-post ${post.media_url ? "has-media" : "text-only"}`}>
    <header>
      <div className="discussion-author">{post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt="" /> : <span>{post.profiles?.username?.slice(0, 2).toUpperCase()}</span>}<div><MemberName profile={post.profiles} subscriber={post.isSubscriber} /><small>{new Date(post.created_at).toLocaleString("tr-TR")}</small></div>{canDelete ? <button type="button" onClick={() => setConfirmDelete(true)} className="discussion-delete" aria-label="Gönderiyi sil"><Trash2 /></button> : null}</div>
      <h2>{post.title}</h2><p>{post.body}</p>
    </header>
    {post.media_url ? <div className="discussion-media-frame">{post.media_type === "video" ? <video controls preload="metadata" src={post.media_url} /> : <img src={post.media_url} alt="" />}</div> : <div className="discussion-text-accent" aria-hidden="true"><MessageSquare /></div>}
    <footer>
      <div className="discussion-reactions"><button className={post.myVote === 1 ? "active like" : ""} onClick={() => vote(1)}><ThumbsUp /> <span>Beğen</span><b>{post.likes}</b></button><button className={post.myVote === -1 ? "active dislike" : ""} onClick={() => vote(-1)}><ThumbsDown /> <span>Beğenme</span><b>{post.dislikes}</b></button></div>
      <button onClick={() => setOpen((value) => !value)} className="secondary-button px-4 py-2"><MessageSquare className="h-4 w-4" />{post.commentCount} Yorum</button>
    </footer>
    {open ? <div className="discussion-comments">
      <form onSubmit={submitComment}>{replying ? <div className="discussion-reply-preview"><Undo2 /> <span><b>{replying.profiles?.username}</b> kullanıcısına yanıt veriyorsun</span><button type="button" onClick={() => setReplying(null)}>×</button></div> : null}<div className="discussion-emoji-row">{emojis.map((emoji) => <button type="button" key={emoji} onClick={() => setText((value) => `${value}${emoji}`)}>{emoji}</button>)}</div><div className="flex gap-2"><input required value={text} onChange={(event) => setText(event.target.value)} placeholder={replying ? "Yanıtını yaz..." : "Yorumunu yaz..."} /><button className="primary-button px-4"><Send className="h-4 w-4" /></button></div></form>
      {comments.map((comment) => <article key={comment.id} className="discussion-comment">{comment.parent ? <blockquote><b>@{comment.parent.profiles?.username || "Oyuncu"}</b> {comment.parent.body}</blockquote> : null}<div><MemberName profile={comment.profiles} subscriber={comment.isSubscriber} /><span>{comment.body}</span><button type="button" onClick={() => { setReplying(comment); setText(`@${comment.profiles?.username || "Oyuncu"} `); }}>Alıntıla ve yanıtla</button></div></article>)}
    </div> : null}
    {confirmDelete ? <div className="discussion-delete-dialog" role="dialog" aria-modal="true" aria-labelledby={`delete-post-${post.id}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmDelete(false); }}><section><span className="discussion-delete-dialog__icon"><Trash2 /></span><div><p className="section-kicker">Gönderi yönetimi</p><h2 id={`delete-post-${post.id}`}>Gönderi silinsin mi?</h2><p>Gönderi ve tüm yorumları kalıcı olarak kaldırılacak. Bu işlem geri alınamaz.</p></div><div className="discussion-delete-dialog__actions"><button type="button" onClick={() => setConfirmDelete(false)} className="secondary-button">Vazgeç</button><button type="button" onClick={async () => { const result = await deleteDiscussionPost(post.id); if (result.ok) refresh(); else setConfirmDelete(false); }} className="discussion-delete-dialog__danger">Evet, Sil</button></div></section></div> : null}
  </article>;
}
