import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { closeSupportTicket, createSupportTicket, deleteSupportTicket, fetchSupportTickets, replySupportTicket, subscribeToSupport } from "../services/SupportService.js";
import { createReview, deleteReview as removeReview, fetchReviews, moderateReview, subscribeToReviews } from "../services/ReviewService.js";

const EngagementContext = createContext(null);

export function EngagementProvider({ children }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [tickets, setTickets] = useState([]);
  const refreshTickets = useCallback(async () => setTickets(user ? await fetchSupportTickets() : []), [user]);
  useEffect(() => { refreshTickets(); if (!user) return undefined; return subscribeToSupport(refreshTickets); }, [refreshTickets, user]);
  const refreshReviews = useCallback(async () => { try { setReviews(await fetchReviews()); } catch (error) { console.error("Yorumlar yüklenemedi:", error.message); } }, []);
  useEffect(() => { refreshReviews(); return subscribeToReviews(refreshReviews); }, [refreshReviews]);
  const value = useMemo(() => ({
    reviews: reviews.filter((item) => item.status === "approved"), reviewQueue: reviews, tickets,
    async addReview(currentUser, quote) { const clean = quote.trim(); if (!currentUser?.id || clean.length < 5) return false; try { await createReview(currentUser, clean); await refreshReviews(); return true; } catch { return false; } },
    async deleteReview(id) { await removeReview(id); await refreshReviews(); },
    async moderateReview(id, status) { await moderateReview(id, status); await refreshReviews(); },
    async createTicket(currentUser, form) { if (!currentUser?.id) return null; const result = await createSupportTicket(currentUser.id, form); await refreshTickets(); return result.ok ? result.ticket : null; },
    async replyTicket(id, message) { const clean = message.trim(); if (!clean) return; await replySupportTicket(id, clean); await refreshTickets(); },
    async closeTicket(id) { await closeSupportTicket(id); await refreshTickets(); },
    async deleteTicket(id) { await deleteSupportTicket(id); await refreshTickets(); }
  }), [refreshReviews, refreshTickets, reviews, tickets]);
  return <EngagementContext.Provider value={value}>{children}</EngagementContext.Provider>;
}

export function useEngagement() { const value = useContext(EngagementContext); if (!value) throw new Error("useEngagement must be used inside EngagementProvider"); return value; }
