import PageHero from "../components/PageHero.jsx";
import { useHomeContent } from "../context/HomeContentContext.jsx";

export default function LegalPage({ type }) {
  const { siteTexts } = useHomeContent();
  const page = siteTexts[type];
  return <><PageHero kicker="Hukuki" eyebrow="DuoBull politikaları" title={page.title} description={page.description} backgroundKey="team" iconKey="brand" /><section className="container-shell pb-16"><div className="glass-card rounded-xl p-5 sm:p-7"><p className="text-xs font-bold text-white/35">Son güncelleme: {page.updatedAt}</p><div className="mt-5 grid gap-3 md:grid-cols-2">{page.sections.map(({ title, text }, index) => <article key={`${title}-${index}`} className="rounded-xl border border-white/10 bg-black/20 p-5"><h2 className="text-lg font-black text-bull-neon">{title}</h2><p className="mt-3 text-sm leading-7 text-white/58">{text}</p></article>)}</div></div></section></>;
}
