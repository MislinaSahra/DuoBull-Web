import { AdminOperationsProvider } from "../context/AdminOperationsContext.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { CartProvider } from "../context/CartContext.jsx";
import { EngagementProvider } from "../context/EngagementContext.jsx";
import { GameCatalogProvider } from "../context/GameCatalogContext.jsx";
import { HomeContentProvider } from "../context/HomeContentContext.jsx";
import { LoyaltyProvider } from "../context/LoyaltyContext.jsx";
import { MissionProvider } from "../context/MissionContext.jsx";
import { NotificationProvider } from "../context/NotificationContext.jsx";
import { SocialProvider } from "../context/SocialContext.jsx";
import { SubscriptionProvider } from "../context/SubscriptionContext.jsx";
import { ToastProvider } from "../context/ToastContext.jsx";

/**
 * Uygulamanın global state sağlayıcıları.
 * Yeni bir context eklendiğinde uygulama ağacına buradan dahil edilir.
 */
export default function AppProviders({ children }) {
  return (
    <ToastProvider><AuthProvider>
      <EngagementProvider>
        <NotificationProvider>
          <SubscriptionProvider>
            <LoyaltyProvider>
              <MissionProvider>
                <AdminOperationsProvider>
                  <SocialProvider>
                    <CartProvider>
                      <HomeContentProvider>
                        <GameCatalogProvider>{children}</GameCatalogProvider>
                      </HomeContentProvider>
                    </CartProvider>
                  </SocialProvider>
                </AdminOperationsProvider>
              </MissionProvider>
            </LoyaltyProvider>
          </SubscriptionProvider>
        </NotificationProvider>
      </EngagementProvider>
    </AuthProvider></ToastProvider>
  );
}
