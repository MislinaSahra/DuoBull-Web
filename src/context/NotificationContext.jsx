import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { clearAllNotifications, createNotification, deleteNotification, fetchNotifications, markNotificationRead, markNotificationsRead, subscribeToNotifications } from "../services/NotificationService.js";

const NotificationContext = createContext(null);
export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const refresh = useCallback(async () => setNotifications(user?.id ? await fetchNotifications(user.id) : []), [user?.id]);
  useEffect(() => {
    if (!user?.id) { setNotifications([]); return undefined; }
    refresh();
    return subscribeToNotifications(user.id, refresh);
  }, [refresh, user?.id]);
  const value = useMemo(() => ({
    notifications,
    unreadCount: notifications.filter((item) => !(item.isRead ?? item.read)).length,
    notifyTeamApplication({ recipientEmail, applicantName, teamName }) { return createNotification(recipientEmail, `${applicantName} kullanıcısı ${teamName} takımınıza başvurdu.`); },
    async markAsRead(id) { await markNotificationRead(id); await refresh(); },
    async deleteOne(id) { await deleteNotification(id); await refresh(); },
    async clearAll() { await clearAllNotifications(user?.id); await refresh(); },
    async markAllRead() { await markNotificationsRead(user?.id); await refresh(); },
    async markTypesRead(types) { if (!user?.id) return; await markNotificationsRead(user.id, types); await refresh(); }
  }), [notifications, refresh, user]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() { const context = useContext(NotificationContext); if (!context) throw new Error("useNotifications must be used inside NotificationProvider"); return context; }
