import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

const LoyaltyContext = createContext(null);
export const loyaltyTiers = [
  { name: "Bronz", min: 0, reward: 250, perk: "Başlangıç rozeti" },
  { name: "Gümüş", min: 1000, reward: 500, perk: "Görev BP ve XP ödüllerine %5 bonus" },
  { name: "Altın", min: 2500, reward: 1000, perk: "Özel görevler" },
  { name: "Elmas", min: 5000, reward: 2000, perk: "%20 puan bonusu" },
  { name: "Efsane", min: 10000, reward: 4000, perk: "Öncelikli destek" }
];

export function LoyaltyProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState({ xp: 0, claimedTiers: [] });
  const refresh = useCallback(async () => {
    if (!user?.id) return setState({ xp: 0, claimedTiers: [] });
    const [profile, claims] = await Promise.all([
      supabase.from("profiles").select("loyalty_xp").eq("id", user.id).single(),
      supabase.from("user_loyalty_rewards").select("tier_name").eq("user_id", user.id)
    ]);
    if (!profile.error && !claims.error) setState({ xp: profile.data.loyalty_xp || 0, claimedTiers: (claims.data || []).map((item) => item.tier_name) });
  }, [user?.id]);

  useEffect(() => {
    refresh();
    if (!user?.id) return undefined;
    const channel = supabase.channel(`loyalty-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_loyalty_rewards", filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, refresh]);

  useEffect(() => {
    const handleRefresh = () => refresh();
    window.addEventListener("duobull:loyalty-refresh", handleRefresh);
    return () => window.removeEventListener("duobull:loyalty-refresh", handleRefresh);
  }, [refresh]);

  const value = useMemo(() => {
    const tierIndex = Math.max(0, loyaltyTiers.findLastIndex((tier) => state.xp >= tier.min));
    return { ...state, tierIndex, tier: loyaltyTiers[tierIndex], nextTier: loyaltyTiers[tierIndex + 1],
      async claimTier(name) {
        const { data, error } = await supabase.rpc("claim_loyalty_reward", { requested_tier: name });
        if (error) return { ok: false, message: error.message };
        await refresh();
        return { ok: true, reward: data?.[0]?.reward || 0 };
      }
    };
  }, [state, refresh]);
  return <LoyaltyContext.Provider value={value}>{children}</LoyaltyContext.Provider>;
}
export function useLoyalty() { const value = useContext(LoyaltyContext); if (!value) throw new Error("useLoyalty must be used inside LoyaltyProvider"); return value; }
