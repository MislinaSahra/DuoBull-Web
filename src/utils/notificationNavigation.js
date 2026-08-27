export function getNotificationTarget(notification) {
  const entity = notification.entityId ? `&entity=${encodeURIComponent(notification.entityId)}` : "";
  const message = (notification.message || "").toLocaleLowerCase("tr-TR");
  const targets = {
    friend_request: "/sosyal?tab=requests",
    friend_approved: "/sosyal?tab=friends",
    direct_message: "/sosyal?tab=messages",
    team_message: `/sosyal?tab=teams${entity}`,
    tournament_message: `/sosyal?tab=tournaments${entity}`,
    team_review: `/profil?tab=teams${entity}`,
    team_application: `/profil?tab=management${entity}`,
    team_application_review: `/profil?tab=${message.includes("onay") ? "teams" : "applications"}${entity}`,
    lft_invite: `/takim-bul#oyuncu-pazari`,
    tournament_application_review: `/profil?tab=${message.includes("onay") ? "tournaments" : "applications"}${entity}`,
    tournament_application: notification.entityId ? `/turnuvalar/${notification.entityId}?tab=teams` : "/turnuvalar",
    tournament_request_review: `/profil?tab=tournaments${entity}`,
    order_completed: `/profil?tab=orders${entity}`,
    admin_order: "/admin",
    team_match_evidence: `/admin?section=match-evidence${entity}`,
    support_reply: `/profil?tab=support${entity}`
    ,subscription_review: "/abonelik"
  };
  if (targets[notification.type]) return targets[notification.type];
  if (message.includes("arkadaşlık isteği")) return "/sosyal?tab=requests";
  if (message.includes("yeni bir mesaj")) return "/sosyal?tab=messages";
  if (message.includes("takım") && message.includes("başvurdu")) return "/profil?tab=management";
  if (message.includes("takım") && message.includes("onay")) return "/profil?tab=teams";
  if (message.includes("turnuva") && message.includes("onay")) return "/profil?tab=tournaments";
  if (message.includes("sipariş")) return "/profil?tab=orders";
  if (message.includes("destek")) return "/profil?tab=support";
  return null;
}
