import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { brandAssets } from "../data/brandAssets.js";
import { deleteSiteImage, fetchSiteImages, resetSiteImages, saveSiteImage, subscribeToSiteImages } from "../services/HomeContentService.js";
import { fetchPartners, replacePartners, subscribeToPartners } from "../services/PartnerService.js";
import { fetchFooterLinks, saveFooterLink, subscribeToFooterLinks } from "../services/FooterLinkService.js";
import { footerLinks as defaultFooterLinks } from "../data/mockData.js";
import { defaultSiteTexts } from "../data/siteTextDefaults.js";
import { fetchSiteTexts, saveSiteText, subscribeToSiteTexts } from "../services/SiteTextService.js";

const HomeContentContext = createContext(null);
export const homeImageFields = [
  { key: "header-logo", label: "Header DuoBull logosu", fallback: brandAssets.logos.horizontalColor },
  { key: "footer-logo", label: "Footer DuoBull logosu", fallback: brandAssets.logos.horizontalWhite },
  { key: "hero", label: "Ana sayfa banner", fallback: brandAssets.backgrounds.hero },
  { key: "team-banner", label: "Takım Bul banner", fallback: brandAssets.backgrounds.team },
  { key: "social-banner", label: "Sosyal banner", fallback: brandAssets.backgrounds.community },
  { key: "discussion-banner", label: "Tartışmalar banner", fallback: brandAssets.backgrounds.community },
  { key: "tournaments-banner", label: "Turnuvalar banner", fallback: brandAssets.backgrounds.tournaments },
  { key: "missions-banner", label: "Görevler banner", fallback: brandAssets.backgrounds.missions },
  { key: "shop-banner", label: "Mağaza banner", fallback: brandAssets.backgrounds.shop },
  { key: "loyalty-banner", label: "Sadakat banner", fallback: brandAssets.backgrounds.loyalty },
  { key: "subscription-banner", label: "Abonelik banner", fallback: brandAssets.backgrounds.loyalty }
  ,{ key: "admin-banner", label: "Admin paneli banner", fallback: brandAssets.backgrounds.loyalty }
];
export const getTeamLogoOptions = (images) => Object.entries(images || {}).filter(([key, value]) => key.startsWith("team-logo-") && Boolean(value)).sort(([a], [b]) => a.localeCompare(b, "tr", { numeric: true })).map(([key, url]) => ({ key, url }));
const defaults = () => Object.fromEntries(homeImageFields.map((field) => [field.key, field.fallback]));

export function HomeContentProvider({ children }) {
  const [images, setImages] = useState(defaults);
  const [partners, setPartners] = useState([]);
  const [footerLinks,setFooterLinks]=useState(()=>Object.entries(defaultFooterLinks).flatMap(([section,links])=>links.map((item,index)=>({id:`${section}-${index}`,section,label:item.label,url:item.to,sortOrder:(index+1)*10,isActive:true}))));
  const [siteTexts, setSiteTexts] = useState(defaultSiteTexts);
  const refresh = useCallback(async () => {
    try { setImages({ ...defaults(), ...await fetchSiteImages() }); }
    catch (error) { console.error("Site görselleri yüklenemedi:", error.message); }
  }, []);
  useEffect(() => { refresh(); return subscribeToSiteImages(refresh); }, [refresh]);
  const refreshPartners = useCallback(async () => {
    try { setPartners(await fetchPartners()); }
    catch (error) { console.error("Partnerler yüklenemedi:", error.message); }
  }, []);
  useEffect(() => { refreshPartners(); return subscribeToPartners(refreshPartners); }, [refreshPartners]);
  const refreshFooterLinks=useCallback(async()=>{try{const items=await fetchFooterLinks();if(items.length)setFooterLinks(items);}catch{/* migration çalışana kadar varsayılan bağlantılar */}},[]);
  useEffect(()=>{refreshFooterLinks();return subscribeToFooterLinks(refreshFooterLinks);},[refreshFooterLinks]);
  const refreshSiteTexts = useCallback(async () => { try { const items = await fetchSiteTexts(); setSiteTexts((current) => ({ ...current, ...items })); } catch { /* migration çalışana kadar varsayılan metinler */ } }, []);
  useEffect(() => { refreshSiteTexts(); return subscribeToSiteTexts(refreshSiteTexts); }, [refreshSiteTexts]);
  const value = useMemo(() => ({
    images, partners, footerLinks, siteTexts,
    async updateImage(key, value) { const imageUrl = await saveSiteImage(key, value); setImages((current) => ({ ...current, [key]: imageUrl })); return imageUrl; },
    async removeImage(key) { await deleteSiteImage(key); setImages((current) => { const next = { ...current }; delete next[key]; return next; }); },
    async resetImages() { await resetSiteImages(homeImageFields.map((field) => field.key)); setImages((current) => ({ ...Object.fromEntries(Object.entries(current).filter(([key]) => key.startsWith("team-logo-"))), ...defaults() })); },
    async updatePartners(names) {
      const saved = await replacePartners(names);
      setPartners(saved);
      return saved;
    },
    async updateFooterLink(item){await saveFooterLink(item);await refreshFooterLinks();},
    async updateSiteText(key, content) { await saveSiteText(key, content); setSiteTexts((current) => ({ ...current, [key]: content })); }
  }), [images, partners, footerLinks, siteTexts, refreshPartners, refreshFooterLinks]);
  return <HomeContentContext.Provider value={value}>{children}</HomeContentContext.Provider>;
}
export function useHomeContent() { const context = useContext(HomeContentContext); if (!context) throw new Error("useHomeContent must be used inside HomeContentProvider"); return context; }
