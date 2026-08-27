import { useEffect, useState } from "react";
import { deleteBlogPost, fetchBlogPosts, fetchHomeSeo, saveBlogPost, saveHomeSeo } from "../services/SeoContentService.js";

const blank = { id: "", slug: "", title: "", excerpt: "", content: "", seo_title: "", seo_description: "", status: "draft" };
const fieldClass = "rounded-lg border border-white/10 bg-black/30 p-3 text-white";

export default function SeoContentAdmin() {
  const [seo, setSeo] = useState({ title: "", description: "", keywords: "" });
  const [posts, setPosts] = useState([]);
  const [post, setPost] = useState(blank);
  const [message, setMessage] = useState("");
  const refresh = async () => {
    setSeo(await fetchHomeSeo() || { title: "", description: "", keywords: "" });
    setPosts(await fetchBlogPosts(true));
  };
  useEffect(() => { refresh(); }, []);

  return <section className="glass-card mt-6 rounded-2xl p-5">
    <h2 className="text-2xl font-black">SEO ve Blog Yönetimi</h2>
    <p className="mt-1 text-xs text-white/45">Ana sayfa arama görünümünü ve blog içeriklerini yönetin.</p>
    <div className="mt-5 grid gap-6 xl:grid-cols-2">
      <form onSubmit={async (event) => { event.preventDefault(); const result = await saveHomeSeo(seo); setMessage(result.ok ? "Ana sayfa SEO bilgileri kaydedildi." : result.message); }} className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="font-black">Ana Sayfa SEO</h3>
        <input required value={seo.title} onChange={(event) => setSeo({ ...seo, title: event.target.value })} placeholder="SEO başlığı" className={fieldClass} />
        <textarea required value={seo.description} onChange={(event) => setSeo({ ...seo, description: event.target.value })} placeholder="Meta açıklaması" className={`${fieldClass} min-h-24`} />
        <input value={seo.keywords} onChange={(event) => setSeo({ ...seo, keywords: event.target.value })} placeholder="Anahtar kelimeler" className={fieldClass} />
        <button className="primary-button py-2.5">SEO Bilgilerini Kaydet</button>
      </form>
      <form onSubmit={async (event) => { event.preventDefault(); const result = await saveBlogPost(post); setMessage(result.ok ? "Blog yazısı kaydedildi." : result.message); if (result.ok) { setPost(blank); refresh(); } }} className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between"><h3 className="font-black">Blog Yazısı</h3><button type="button" onClick={() => setPost(blank)} className="secondary-button px-3 py-2 text-xs">Yeni Yazı</button></div>
        <input required value={post.title} onChange={(event) => setPost({ ...post, title: event.target.value })} placeholder="Başlık" className={fieldClass} />
        <input required value={post.slug} onChange={(event) => setPost({ ...post, slug: event.target.value })} placeholder="URL: oyun-takimi-nasil-kurulur" className={fieldClass} />
        <textarea value={post.excerpt} onChange={(event) => setPost({ ...post, excerpt: event.target.value })} placeholder="Kısa özet" className={fieldClass} />
        <textarea required value={post.content} onChange={(event) => setPost({ ...post, content: event.target.value })} placeholder="Yazı içeriği" className={`${fieldClass} min-h-32`} />
        <input value={post.seo_title} onChange={(event) => setPost({ ...post, seo_title: event.target.value })} placeholder="SEO başlığı" className={fieldClass} />
        <textarea value={post.seo_description} onChange={(event) => setPost({ ...post, seo_description: event.target.value })} placeholder="SEO açıklaması" className={fieldClass} />
        <select value={post.status} onChange={(event) => setPost({ ...post, status: event.target.value })} className={`${fieldClass} bg-[#0a0711]`}><option value="draft">Taslak</option><option value="published">Yayınla</option></select>
        <button className="primary-button py-2.5">Blog Yazısını Kaydet</button>
      </form>
    </div>
    <div className="mt-5"><h3 className="mb-3 font-black">Blog Yazıları</h3><div className="grid gap-2 xl:grid-cols-2">{posts.map((item) => <article key={item.id} className="flex items-center justify-between rounded-lg border border-white/10 p-3"><button type="button" onClick={() => setPost(item)} className="text-left"><strong>{item.title}</strong><small className="block">{item.status}</small></button><button type="button" onClick={async () => { await deleteBlogPost(item.id); refresh(); }} className="text-xs font-black text-red-200">Sil</button></article>)}</div></div>
    {message ? <p className="mt-4 rounded-lg border border-white/10 p-3 text-xs font-bold">{message}</p> : null}
  </section>;
}
