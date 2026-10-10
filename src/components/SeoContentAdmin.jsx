import { Bold, Heading2, Italic, List, Plus, Quote } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { deleteBlogPost, fetchBlogPosts, fetchHomeSeo, saveBlogPost, saveHomeSeo } from "../services/SeoContentService.js";

const blank = { id: "", slug: "", title: "", excerpt: "", content: "", seo_title: "", seo_description: "", status: "draft" };
const fieldClass = "rounded-lg border border-white/10 bg-black/30 p-3 text-white";

export default function SeoContentAdmin({ mode = "seo" }) {
  const [seo, setSeo] = useState({ title: "", description: "", keywords: "" });
  const [posts, setPosts] = useState([]);
  const [post, setPost] = useState(blank);
  const [message, setMessage] = useState("");
  const refresh = async () => {
    if (mode === "seo") setSeo(await fetchHomeSeo() || { title: "", description: "", keywords: "" });
    if (mode === "blog") setPosts(await fetchBlogPosts(true));
  };
  useEffect(() => { refresh(); }, [mode]);

  if (mode === "seo") return <section className="glass-card rounded-2xl p-5">
    <h2 className="text-2xl font-black">SEO Ayarları</h2>
    <p className="mt-1 text-xs text-white/45">Arama görünümünü yönetin. Organization, WebSite, FAQ ve sosyal medya sameAs şemaları otomatik üretilir.</p>
    <form onSubmit={async (event) => { event.preventDefault(); const result = await saveHomeSeo(seo); setMessage(result.ok ? "SEO bilgileri kaydedildi." : result.message); }} className="mt-5 grid max-w-3xl gap-4 rounded-xl border border-white/10 bg-black/20 p-5">
      <label className="text-xs font-bold text-white/55">Arama sonucu başlığı<input required maxLength={60} value={seo.title} onChange={(event) => setSeo({ ...seo, title: event.target.value })} className={`${fieldClass} mt-2 w-full`} /><small className="mt-1 block text-white/30">{seo.title.length}/60 karakter</small></label>
      <label className="text-xs font-bold text-white/55">Meta açıklaması<textarea required maxLength={160} value={seo.description} onChange={(event) => setSeo({ ...seo, description: event.target.value })} className={`${fieldClass} mt-2 min-h-28 w-full`} /><small className="mt-1 block text-white/30">{seo.description.length}/160 karakter</small></label>
      <label className="text-xs font-bold text-white/55">İçerik anahtar kelimeleri<input value={seo.keywords} onChange={(event) => setSeo({ ...seo, keywords: event.target.value })} className={`${fieldClass} mt-2 w-full`} /></label>
      <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4"><small className="font-black uppercase text-white/35">Google önizlemesi</small><strong className="mt-2 block text-lg text-blue-300">{seo.title || "DuoBull sayfa başlığı"}</strong><span className="mt-1 block text-xs text-emerald-300">duobull.com</span><p className="mt-1 text-sm leading-6 text-white/55">{seo.description || "Arama sonuçlarında gösterilecek açıklama."}</p></div>
      <button className="primary-button button-compact w-fit">SEO Ayarlarını Kaydet</button>
    </form>
    {message ? <Status>{message}</Status> : null}
  </section>;

  return <section className="glass-card rounded-2xl p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">Blog Yönetimi</h2><p className="mt-1 text-xs text-white/45">Yazıları ayrı sayfalarda yayınlayın ve biçimlendirilmiş içerik hazırlayın.</p></div><button type="button" onClick={() => setPost(blank)} className="secondary-button button-compact"><Plus />Yeni yazı</button></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,.6fr)]">
      <form onSubmit={async (event) => { event.preventDefault(); const result = await saveBlogPost(post); setMessage(result.ok ? "Blog yazısı kaydedildi." : result.message); if (result.ok) { setPost(blank); refresh(); } }} className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
        <input required value={post.title} onChange={(event) => setPost({ ...post, title: event.target.value })} placeholder="Yazı başlığı" className={fieldClass} />
        <input required value={post.slug} onChange={(event) => setPost({ ...post, slug: event.target.value })} placeholder="URL: oyun-takimi-nasil-kurulur" className={fieldClass} />
        <textarea value={post.excerpt} onChange={(event) => setPost({ ...post, excerpt: event.target.value })} placeholder="Liste kartında gösterilecek kısa özet" className={`${fieldClass} min-h-20`} />
        <RichTextEditor value={post.content} onChange={(content) => setPost({ ...post, content })} />
        <div className="grid gap-3 md:grid-cols-2"><input value={post.seo_title} onChange={(event) => setPost({ ...post, seo_title: event.target.value })} placeholder="Yazı SEO başlığı" className={fieldClass} /><textarea value={post.seo_description} onChange={(event) => setPost({ ...post, seo_description: event.target.value })} placeholder="Yazı SEO açıklaması" className={fieldClass} /></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><select value={post.status} onChange={(event) => setPost({ ...post, status: event.target.value })} className={`${fieldClass} bg-[#0a0711]`}><option value="draft">Taslak</option><option value="published">Yayınla</option></select><button className="primary-button button-compact">Yazıyı Kaydet</button></div>
      </form>
      <aside><h3 className="mb-3 font-black">Blog yazıları</h3><div className="grid gap-2">{posts.map((item) => <article key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3"><button type="button" onClick={() => setPost(item)} className="min-w-0 text-left"><strong className="block truncate">{item.title}</strong><small className="text-white/35">{item.status}</small></button><button type="button" onClick={async () => { await deleteBlogPost(item.id); refresh(); }} className="text-xs font-black text-red-200">Sil</button></article>)}{!posts.length ? <p className="text-xs text-white/35">Henüz yazı yok.</p> : null}</div></aside>
    </div>
    {message ? <Status>{message}</Status> : null}
  </section>;
}

function RichTextEditor({ value, onChange }) {
  const ref = useRef(null);
  const insert = (before, after = "") => {
    const element = ref.current;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = value.slice(start, end) || "metin";
    onChange(`${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`);
    requestAnimationFrame(() => { element.focus(); element.setSelectionRange(start + before.length, start + before.length + selected.length); });
  };
  return <div className="rich-editor"><div className="rich-editor__toolbar"><button type="button" onClick={() => insert("## ")} title="Alt başlık"><Heading2 /></button><button type="button" onClick={() => insert("**", "**")} title="Kalın"><Bold /></button><button type="button" onClick={() => insert("*", "*")} title="İtalik"><Italic /></button><button type="button" onClick={() => insert("- ")} title="Liste"><List /></button><button type="button" onClick={() => insert("> ")} title="Alıntı"><Quote /></button></div><textarea ref={ref} required value={value} onChange={(event) => onChange(event.target.value)} placeholder="Yazı içeriğini biçimlendirme araçlarıyla hazırlayın..." /></div>;
}

function Status({ children }) { return <p className="mt-4 rounded-lg border border-white/10 p-3 text-xs font-bold">{children}</p>; }
