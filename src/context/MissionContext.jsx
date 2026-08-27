import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

const MissionContext = createContext(null);

export function MissionProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState({ claimed: [], balance: 0, xp: 0, progress: {} });
  const refresh = useCallback(async () => {
    if (!user?.id) { setState({ claimed: [], balance: 0, xp: 0, progress: {} }); return; }
    await supabase.rpc("prepare_daily_missions");
    const [profileResult, missionResult] = await Promise.all([
      supabase.from("profiles").select("balance,loyalty_xp").eq("id", user.id).single(),
      supabase.from("user_missions").select("mission_id,progress,is_claimed").eq("user_id", user.id)
    ]);
    if (profileResult.error || missionResult.error) return;
    setState({
      balance: profileResult.data?.balance || 0,
      xp: profileResult.data?.loyalty_xp || 0,
      claimed: (missionResult.data || []).filter((item) => item.is_claimed).map((item) => item.mission_id),
      progress: Object.fromEntries((missionResult.data || []).map((item) => [item.mission_id, item.progress]))
    });
  }, [user?.id]);
  useEffect(() => {
    refresh();
    if (!user?.id) return undefined;
    const channel = supabase.channel(`wallet-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_missions", filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [refresh, user?.id]);
  const value = useMemo(() => ({
    ...state,
    refresh,
    async claimMission(mission) {
      if (!user?.id) return { ok: false, message: "Görev ödülünü almak için giriş yapmalısınız." };
      const { data, error } = await supabase.rpc("claim_mission", { target_mission_id: mission.id });
      if (error) return { ok: false, message: error.message || "Görev ödülü alınamadı." };
      await refresh();
      window.dispatchEvent(new CustomEvent("duobull:loyalty-refresh"));
      return { ok: true, balance: data?.[0]?.balance, xp: data?.[0]?.loyalty_xp };
    },
    async deductBalance() { return { ok: false, message: "Bakiye satın alma sırasında güvenli olarak düşülür." }; },
    async creditBalance() { return false; }
  }), [refresh, state, user?.id]);
  return <MissionContext.Provider value={value}>{children}</MissionContext.Provider>;
}

export function useMissions() {
  const context = useContext(MissionContext);
  if (!context) throw new Error("useMissions must be used inside MissionProvider");
  return context;
}
