import { Check, ChevronRight, Gift, LockKeyhole, Sparkles, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { brandAssets } from "../data/brandAssets.js";
import { loyaltyTiers, useLoyalty } from "../context/LoyaltyContext.jsx";
import { useSubscription } from "../context/SubscriptionContext.jsx";
import { useState } from "react";

const loyaltyBadges = {
  Bronz: "/duobull/ranks/bronz.png",
  "Gümüş": "/duobull/ranks/gumus.png",
  "Altın": "/duobull/ranks/altin.png",
  Elmas: "/duobull/ranks/elmas.png",
  Efsane: "/duobull/ranks/efsane.png"
};

export default function LoyaltySection() {
  const loyalty = useLoyalty();
  const subscription = useSubscription();
  const [claimMessage, setClaimMessage] = useState("");
  const canEarnBp = subscription.hasFeature("bp_enabled");
  const nextMin = loyalty.nextTier?.min || loyalty.xp;
  const currentMin = loyalty.tier.min;
  const progress = loyalty.nextTier ? Math.min(100, ((loyalty.xp - currentMin) / (nextMin - currentMin)) * 100) : 100;
  const claim = async (tier) => { setClaimMessage(""); const result = await loyalty.claimTier(tier.name); setClaimMessage(result.ok ? `${tier.reward.toLocaleString("tr-TR")} BP seviye ödülü hesabına eklendi.` : result.message); };

  return (
    <section id="sadakat" className="container-shell loyalty-dashboard">
      <div className="loyalty-progress-panel">
        <div className="loyalty-current">
          <span className="loyalty-emblem"><img src={loyaltyBadges[loyalty.tier.name] || brandAssets.icons.loyalty} alt={`${loyalty.tier.name} rozeti`} /></span>
          <div><small>Mevcut seviye</small><h2>{loyalty.tier.name}</h2></div>
          <div className="loyalty-current__xp">
            <strong>{loyalty.xp.toLocaleString("tr-TR")} / {loyalty.nextTier ? loyalty.nextTier.min.toLocaleString("tr-TR") : "MAX"} XP</strong>
            <span>{loyalty.nextTier ? `Sonraki seviye: ${loyalty.nextTier.name}` : "En yüksek seviyedesin"}</span>
          </div>
        </div>
        <div className="loyalty-main-progress"><i style={{ width: `${progress}%` }} /></div>

        <div className="loyalty-tier-track">
          {loyaltyTiers.map((tier, index) => {
            const unlocked = loyalty.xp >= tier.min;
            return <div key={tier.name} className={index === loyalty.tierIndex ? "is-current" : unlocked ? "is-unlocked" : ""}>
              <span><img src={loyaltyBadges[tier.name]} alt="" /></span><strong>{tier.name}</strong><small>{tier.min.toLocaleString("tr-TR")} XP</small>
            </div>;
          })}
        </div>

        <div className="loyalty-real-stats">
          <Stat icon={Sparkles} value={loyalty.xp.toLocaleString("tr-TR")} label="Toplam XP" />
          <Stat icon={Gift} value={loyalty.claimedTiers.length} label="Alınan seviye ödülü" />
          <Stat icon={Trophy} value={loyalty.tier.name} label="Ulaşılan seviye" />
        </div>
        <Link to="/gorevler" className="loyalty-earn-link"><Sparkles /><span><strong>XP kazanma yolları</strong><small>Görevleri tamamlayarak sadakat XP kazan.</small></span><ChevronRight /></Link>
      </div>

      <div className="loyalty-benefits-panel">
        <div className="loyalty-benefits-heading"><div><span>Seviye avantajları</span><p>Her seviye, hesabında yeni bir sadakat ödülü açar.</p></div><Link to="/gorevler">XP Kazan <ChevronRight /></Link></div>
        <div className="loyalty-benefit-grid">
          {loyaltyTiers.slice(1).map((tier) => {
            const unlocked = loyalty.xp >= tier.min;
            const claimed = loyalty.claimedTiers.includes(tier.name);
            return (
              <article key={tier.name} className={unlocked ? "is-unlocked" : ""}>
                <div className="loyalty-benefit-title"><span><img src={loyaltyBadges[tier.name]} alt={`${tier.name} rozeti`} /></span><div><h3>{tier.name}</h3><p>{tier.min.toLocaleString("tr-TR")} XP seviyesinde açılır.</p></div></div>
                <ul>
                  <li><Check />{tier.perk}</li>
                  <li><Check />{canEarnBp ? `${tier.reward.toLocaleString("tr-TR")} BP seviye ödülü` : "Sadakat rozeti"}</li>
                </ul>
                {canEarnBp ? <button type="button" disabled={!unlocked || claimed} onClick={() => claim(tier)} className={unlocked && !claimed ? "primary-button" : "secondary-button"}>
                  {claimed ? <><Check /> Ödül alındı</> : unlocked ? <><Gift /> Ödülü al</> : <><LockKeyhole /> Kilitli</>}
                </button> : <Link to="/abonelik" className="secondary-button"><LockKeyhole /> BP ödülü için abonelik</Link>}
              </article>
            );
          })}
        </div>
        {claimMessage ? <p className="loyalty-claim-message" role="status">{claimMessage}</p> : null}
      </div>
    </section>
  );
}

function Stat({ icon: Icon, value, label }) {
  return <div><Icon /><p><strong>{value}</strong><span>{label}</span></p></div>;
}
