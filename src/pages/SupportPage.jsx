import { ChevronDown, LifeBuoy, Send } from "lucide-react";
import { useState } from "react";
import PageHero from "../components/PageHero.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useEngagement } from "../context/EngagementContext.jsx";
import { useHomeContent } from "../context/HomeContentContext.jsx";

export default function SupportPage() {
  const { user } = useAuth();
  const engagement = useEngagement();
  const { siteTexts } = useHomeContent();
  const faq = siteTexts.faq;
  const [open, setOpen] = useState(0);
  const [form, setForm] = useState({ subject: "", category: "Hesap", message: "" });
  const [result, setResult] = useState("");
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event) => { event.preventDefault(); const ticket = await engagement.createTicket(user, form); if (!ticket) { setResult("Talep gönderilemedi. Lütfen tekrar deneyin."); return; } setForm({ subject: "", category: "Hesap", message: "" }); setResult(`Talebin alındı. Takip numarası: ${ticket.id}`); };
  return <><PageHero kicker="Destek" eyebrow="Yardım merkezi" title="Sorularına hızlıca yanıt bul." description="Sık sorulan soruları incele veya destek ekibine doğrudan talep gönder." backgroundKey="team" iconKey="community" /><section className="container-shell grid gap-6 pb-16 lg:grid-cols-[1fr_0.9fr]"><div id="sss" className="glass-card rounded-xl p-5 sm:p-6"><h2 className="text-2xl font-black">{faq.title}</h2><div className="mt-5 space-y-2">{faq.items.map(({ question, answer }, index) => <article key={`${question}-${index}`} className="overflow-hidden rounded-lg border border-white/10 bg-black/20"><button type="button" onClick={() => setOpen(open === index ? -1 : index)} className="flex w-full items-center justify-between gap-3 p-4 text-left text-sm font-black"><span>{question}</span><ChevronDown className={`h-4 w-4 transition ${open === index ? "rotate-180 text-bull-neon" : "text-white/40"}`} /></button>{open === index ? <p className="border-t border-white/10 p-4 text-sm leading-6 text-white/55">{answer}</p> : null}</article>)}</div></div><div id="talep" className="glass-card h-fit rounded-xl p-5 sm:p-6"><LifeBuoy className="h-8 w-8 text-bull-neon" /><h2 className="mt-3 text-2xl font-black">Destek Talebi</h2><form onSubmit={submit} className="mt-5 grid gap-3"><input required value={form.subject} onChange={update("subject")} placeholder="Konu" className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white" /><select value={form.category} onChange={update("category")} className="rounded-lg border border-white/10 bg-[#0a0711] p-3 text-sm text-white">{["Hesap", "Takım", "Turnuva", "Mağaza ve Sipariş", "Teknik Sorun"].map((item) => <option key={item}>{item}</option>)}</select><textarea required minLength="10" value={form.message} onChange={update("message")} placeholder="Sorununu ayrıntılı şekilde anlat..." className="min-h-36 rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white" /><button className="primary-button"><Send className="h-4 w-4" /> Talebi Gönder</button></form>{result ? <p className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-3 text-xs font-bold text-emerald-200">{result}</p> : null}</div></section></>;
}
