import { useEffect } from "react";
import { useHomeContent } from "../context/HomeContentContext.jsx";

const SCRIPT_ID = "duobull-structured-data";

export default function StructuredData() {
  const { footerLinks, siteTexts } = useHomeContent();

  useEffect(() => {
    const sameAs = footerLinks
      .filter((item) => item.section === "Topluluk" && item.isActive !== false && /^https?:\/\//i.test(item.url))
      .map((item) => item.url);
    const faqItems = Array.isArray(siteTexts?.faq?.items) ? siteTexts.faq.items : [];
    const graph = [
      {
        "@type": "Organization",
        "@id": `${window.location.origin}/#organization`,
        name: "DuoBull",
        url: window.location.origin,
        ...(sameAs.length ? { sameAs } : {})
      },
      {
        "@type": "WebSite",
        "@id": `${window.location.origin}/#website`,
        name: "DuoBull",
        url: window.location.origin,
        publisher: { "@id": `${window.location.origin}/#organization` },
        inLanguage: "tr-TR"
      }
    ];

    if (faqItems.length) {
      graph.push({
        "@type": "FAQPage",
        "@id": `${window.location.origin}/destek#sss-schema`,
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer }
        }))
      });
    }

    let script = document.getElementById(SCRIPT_ID);
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
    return () => script.remove();
  }, [footerLinks, siteTexts]);

  return null;
}
