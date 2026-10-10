import { Link } from "react-router-dom";
import { brandAssets } from "../data/brandAssets.js";
import { footerLinks as staticFooterLinks } from "../data/mockData.js";
import { useHomeContent } from "../context/HomeContentContext.jsx";

function FooterLink({ link }) {
  const className = "text-sm text-white/55 transition hover:text-bull-neon";
  if (/^https?:\/\//i.test(link.to)) {
    return <a href={link.to} target="_blank" rel="noreferrer" className={className}>{link.label}</a>;
  }
  return <Link to={link.to} className={className}>{link.label}</Link>;
}

export default function Footer() {
  const { footerLinks: managedLinks, images } = useHomeContent();
  const managedGroup = (section) => managedLinks
    .filter((item) => item.section === section && item.isActive !== false)
    .filter((item) => section !== "Topluluk" || /^https?:\/\//i.test(item.url))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({ label: item.label, to: item.url }));
  const footerLinks = {
    Platform: staticFooterLinks.Platform,
    "Keşfet": staticFooterLinks.Keşfet,
    Destek: [...staticFooterLinks.Destek, ...managedGroup("Destek")].filter((link, index, links) => links.findIndex((item) => item.to === link.to && item.label === link.label) === index),
    Topluluk: managedGroup("Topluluk")
  };
  return (
    <footer className="site-footer border-t border-bull-neon/15 bg-[#04090c]">
      <div className="site-footer__inner container-shell py-12">
        <div className="site-footer__main grid gap-10 lg:grid-cols-[1.1fr_1.9fr]">
          <div className="site-footer__brand">
            <img src={images["footer-logo"] || brandAssets.logos.horizontalWhite} alt="DuoBull" className="h-12 w-auto max-w-full object-contain" />
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/58">
              Oyuncuları bir araya getiren, rekabeti ödüllendiren yeni nesil oyun platformu.
            </p>
          </div>

          <div className="site-footer__links grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(footerLinks).map(([group, links]) => (
              <div className="site-footer__group" key={group}>
                <h3 className="font-black text-white">{group}</h3>
                <ul className="mt-4 space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <FooterLink link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="site-footer__bottom mt-10 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 text-sm text-white/45 sm:flex-row">
          <p>© 2026 DuoBull. Tüm hakları saklıdır.</p>
          <p>Takımını bul, rekabete katıl, birlikte kazan.</p>
        </div>
      </div>
    </footer>
  );
}
