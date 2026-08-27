import { CalendarDays, Check, ChevronRight, Coins, Gift, Sparkles, Target, TrendingUp } from "lucide-react";
import { brandAssets } from "../data/brandAssets.js";
import { missions } from "../data/mockData.js";
import { loyaltyTiers } from "../context/LoyaltyContext.jsx";
import AuthenticatedLink from "./AuthenticatedLink.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useMissions } from "../context/MissionContext.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import { useSubscription } from "../context/SubscriptionContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getMissionReward } from "../utils/loyaltyRewards.js";

export default function MissionSection() {
  const { isAuthenticated } = useAuth();
  const { claimed, balance, xp, progress, claimMission } = useMissions();
  const subscription = useSubscription();
  const { showToast } = useToast();
  const earnsBp = Boolean(subscription.activeSubscription && subscription.activePlan?.bp_enabled);
  const navigate = useNavigate();
  const location = useLocation();
  const totalBp = missions.reduce((total, mission) => total + getMissionReward(mission, xp, earnsBp).bp, 0);
  const totalXp = missions.reduce((total, mission) => total + getMissionReward(mission, xp, earnsBp).xp, 0);
  const completedCount = missions.filter((mission) => (progress[mission.id] || 0) >= mission.target).length;
  const tierIndex = Math.max(0, loyaltyTiers.findLastIndex((tier) => xp >= tier.min));
  const tier = loyaltyTiers[tierIndex];
  const nextTier = loyaltyTiers[tierIndex + 1];
  const tierProgress = nextTier ? Math.min(100, ((xp - tier.min) / (nextTier.min - tier.min)) * 100) : 100;

  const claim = async (mission) => {
    if (!isAuthenticated) {
      navigate("/giris", { state: { from: `${location.pathname}#gunluk-gorevler` } });
      return;
    }
    const result = await claimMission(mission);
    showToast(result.ok ? "Görev ödülün hesabına eklendi." : result.message, result.ok ? "success" : "error");
  };

  return (
    <section id="gunluk-gorevler" className="container-shell missions-dashboard">
      <aside className="missions-guide">
        <div className="missions-panel-label">/// Günlük görevler</div>
        <h2>Düzenli oyna,<strong>ödülleri kap!</strong></h2>
        <p>Görevlerini tamamla, Bull Puan ve sadakat XP kazan.</p>
        <div className="missions-guide__steps">
          <GuideItem icon={Target} title="Görevleri tamamla" text="Günlük görevlerdeki gerçek ilerlemeni takip et." />
          <GuideItem icon={TrendingUp} title="Puanını yükselt" text="Tamamlanan görevlerle sadakat seviyeni geliştir." />
          <GuideItem icon={Gift} title="Ödüllerini topla" text="Hazır görevlerin ödülünü bekletmeden al." />
        </div>
        <div className="missions-rank-card">
          <img src={tierBadge(tier.name)} alt={`${tier.name} rozeti`} />
          <div>
            <span>Sadakat seviyen</span>
            <strong>{tier.name}</strong>
            <div><i style={{ width: `${tierProgress}%` }} /></div>
            <small>{nextTier ? `${xp.toLocaleString("tr-TR")} / ${nextTier.min.toLocaleString("tr-TR")} XP` : `${xp.toLocaleString("tr-TR")} XP`}</small>
          </div>
        </div>
      </aside>

      <div className="missions-list-panel">
        <div className="missions-list-heading">
          <div><span className="missions-panel-label">/// Bugünün görevleri</span><p>{missions.length} görev mevcut</p></div>
          <span><Coins /> {balance.toLocaleString("tr-TR")} BP</span>
        </div>
        <div className="missions-rows">
          {missions.map((mission) => {
            const current = Math.min(progress[mission.id] || 0, mission.target);
            const percentage = Math.min(100, (current / (mission.target || 1)) * 100);
            const isClaimed = claimed.includes(mission.id);
            const reward = getMissionReward(mission, xp, earnsBp);
            return (
              <article key={mission.id} className="mission-row">
                <span className="mission-row__icon"><Target /></span>
                <div className="mission-row__main">
                  <h3>{mission.title}</h3><p>İlerleme: {current} / {mission.target}</p>
                  <div className="mission-row__progress"><i style={{ width: `${percentage}%` }} /></div>
                </div>
                <div className="mission-row__rewards">
                  {earnsBp ? <span title={reward.hasBonus ? "Sadakat seviyesi bonusu dahil" : undefined}><Coins /> {reward.bp} BP</span> : null}
                  <span title={reward.hasBonus ? "Sadakat seviyesi bonusu dahil" : undefined}><Sparkles /> {reward.xp} XP</span>
                </div>
                <div className="mission-row__action">
                  {percentage === 100 ? (
                    <button type="button" disabled={isClaimed} onClick={() => claim(mission)} className={isClaimed ? "secondary-button is-claimed" : "primary-button"}>
                      <Check /> {isClaimed ? "Tamamlandı" : "Ödülü al"}
                    </button>
                  ) : <AuthenticatedLink to={mission.to} className="primary-button">{mission.action}<ChevronRight /></AuthenticatedLink>}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="missions-summary-strip">
        <Summary icon={Coins} label="Toplam kazanılabilir" value={earnsBp ? `${totalBp.toLocaleString("tr-TR")} BP` : "Abonelik gerekli"} note="Bugün" />
        <Summary icon={CalendarDays} label="Görevler yenilenir" value="Her gün" note="Günlük görev döngüsü" />
        <Summary icon={Sparkles} label="Toplam sadakat ödülü" value={`${totalXp.toLocaleString("tr-TR")} XP`} note="Bugün" />
        <Summary icon={Check} label="Tamamlanan" value={`${completedCount} / ${missions.length}`} note="Bugün" />
        <AuthenticatedLink to="/magaza" className="secondary-button"><Gift /> Ödülleri incele</AuthenticatedLink>
      </div>
    </section>
  );
}

function tierBadge(name) { return `/duobull/ranks/${name === "Gümüş" ? "gumus" : name === "Altın" ? "altin" : name.toLocaleLowerCase("tr-TR")}.png`; }
function GuideItem({ icon: Icon, title, text }) {
  return <div><span><Icon /></span><p><strong>{title}</strong><small>{text}</small></p></div>;
}

function Summary({ icon: Icon, label, value, note }) {
  return <div className="missions-summary-item"><Icon /><p><span>{label}</span><strong>{value}</strong><small>{note}</small></p></div>;
}
