import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { cancelSubscription, fetchSubscriptionData, requestSubscription, reviewSubscription, saveSubscriptionPlan, subscribeToSubscriptions } from "../services/SubscriptionService.js";

const SubscriptionContext = createContext(null);
export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState({ plans: [], subscriptions: [], profiles: [] });
  const refresh = useCallback(async () => { try { setState(await fetchSubscriptionData()); } catch { setState({ plans: [], subscriptions: [], profiles: [] }); } }, [user?.id]);
  useEffect(() => { refresh(); return subscribeToSubscriptions(refresh); }, [refresh]);
  const value = useMemo(() => {
    const now = Date.now();
    const activeSubscription = state.subscriptions.find((item) => (item.user_uuid || item.user_id) === user?.id && item.status === "active" && new Date(item.ends_at).getTime() > now);
    const activePlan = state.plans.find((item) => item.id === activeSubscription?.plan_id) || null;
    return { ...state, activeSubscription, activePlan,
      hasFeature(feature) { return Boolean(activePlan?.[feature]); },
      async request(planId) { const result = await requestSubscription(planId); if (result.ok) await refresh(); return result; },
      async review(id, decision) { const result = await reviewSubscription(id, decision); if (result.ok) await refresh(); return result; },
      async cancel(id) { const result = await cancelSubscription(id); if (result.ok) await refresh(); return result; },
      async savePlan(plan) { const result = await saveSubscriptionPlan(plan); if (result.ok) await refresh(); return result; }
    };
  }, [refresh, state, user?.id]);
  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}
export function useSubscription() { const value = useContext(SubscriptionContext); if (!value) throw new Error("useSubscription must be used inside SubscriptionProvider"); return value; }
