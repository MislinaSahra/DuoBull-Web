import { ArrowLeft, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ErrorPage from "./ErrorPage.jsx";
import RichTextContent from "../components/RichTextContent.jsx";
import { fetchBlogPosts } from "../services/SeoContentService.js";

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  useEffect(() => { fetchBlogPosts().then((posts) => setPost(posts.find((item) => item.slug === slug) || false)).catch(() => setPost(false)); }, [slug]);
  useEffect(() => { if (!post) return; document.title = post.seo_title || `${post.title} | DuoBull`; const meta = document.querySelector('meta[name="description"]'); if (meta && post.seo_description) meta.content = post.seo_description; }, [post]);
  if (post === null) return <div className="route-loading"><span /></div>;
  if (!post) return <ErrorPage status={404} />;
  return <article className="container-shell blog-article"><Link to="/blog" className="blog-back"><ArrowLeft />Tüm yazılar</Link><header><span className="section-kicker">DuoBull Blog</span><h1>{post.title}</h1><p>{post.excerpt}</p><small><CalendarDays />{new Date(post.published_at || post.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</small></header><RichTextContent content={post.content} /></article>;
}
