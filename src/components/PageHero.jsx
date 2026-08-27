import { Headphones, ShieldCheck, Zap } from "lucide-react";
import { brandAssets } from "../data/brandAssets.js";
import { useHomeContent } from "../context/HomeContentContext.jsx";

const bannerKeys = {
  hero: "hero",
  team: "team-banner",
  community: "social-banner",
  discussions: "discussion-banner",
  tournaments: "tournaments-banner",
  missions: "missions-banner",
  shop: "shop-banner",
  loyalty: "loyalty-banner",
  subscription: "subscription-banner"
};

export default function PageHero({ title, highlightedTitle, description, actions, eyebrow, backgroundKey, showTrust = true }) {
  const { images } = useHomeContent();
  const managedKey = bannerKeys[backgroundKey || "hero"];
  const background = images?.[managedKey] || (backgroundKey ? brandAssets.backgrounds[backgroundKey] : brandAssets.backgrounds.hero);
  const commaIndex = !highlightedTitle ? title.indexOf(",") : -1;
  const leadTitle = commaIndex > -1 ? title.slice(0, commaIndex + 1) : title;
  const accentTitle = highlightedTitle || (commaIndex > -1 ? title.slice(commaIndex + 1).trim() : "");

  return (
    <section className="page-hero">
        <img src={background} alt="" className="page-hero__art" />
        <div className="page-hero__veil" />
        <div className="page-hero__edge" aria-hidden="true" />
        <div className="container-shell page-hero__content relative flex min-h-[300px] items-center py-9 lg:min-h-[340px] lg:py-12">
          <div className="max-w-[760px]">
            {eyebrow ? (
              <p className="page-hero__eyebrow">/// &nbsp; {eyebrow} &nbsp; ///</p>
            ) : null}
            <h1 className="page-hero__title">
              <span>{leadTitle}</span>
              {accentTitle ? <strong>{accentTitle}</strong> : null}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">{description}</p>
            {actions ? <div className="page-hero__actions">{actions}</div> : null}
            {showTrust ? <div className="page-hero__trust"><span><Zap /> Hızlı Eşleşme</span><span><ShieldCheck /> Güvenli ve Adil Oyun</span><span><Headphones /> 7/24 Destek</span></div> : null}
          </div>
        </div>
    </section>
  );
}
