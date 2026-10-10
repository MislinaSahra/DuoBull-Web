import { ArrowLeft, ImagePlus, Send } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { createDiscussionPost } from "../services/DiscussionService.js";

export default function DiscussionCreatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [publishing, setPublishing] = useState(false);
  const publish = async (event) => {
    event.preventDefault(); setPublishing(true); setMessage("");
    const result = await createDiscussionPost(user.id, { title, body, file });
    setPublishing(false);
    if (result.ok) navigate("/tartismalar"); else setMessage(result.message);
  };
  return <main className="container-shell discussion-create"><Link to="/tartismalar" className="blog-back"><ArrowLeft />Tartışmalara dön</Link><section className="glass-card"><span className="section-kicker">Yeni konu</span><h1>Yeni tartışma başlat</h1><p>Başlığını anlaşılır tut, konuyu detaylandır ve gerekiyorsa bir görsel veya video ekle.</p><form onSubmit={publish}><label>Başlık<input required minLength={3} maxLength={140} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tartışma başlığı" /></label><label>İçerik<textarea required minLength={10} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Toplulukla ne paylaşmak istiyorsun?" /></label><div className="discussion-create__actions"><label className="secondary-button button-compact cursor-pointer"><ImagePlus />{file ? file.name : "Medya ekle"}<input hidden type="file" accept="image/*,video/mp4,video/webm" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label><button disabled={publishing} className="primary-button button-compact"><Send />{publishing ? "Yayınlanıyor..." : "Tartışmayı yayınla"}</button></div>{message ? <p className="form-message is-error">{message}</p> : null}</form></section></main>;
}
