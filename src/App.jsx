import AppEffects from "./app/AppEffects.jsx";
import AppProviders from "./app/AppProviders.jsx";
import AppRoutes from "./app/AppRoutes.jsx";

// Uygulamanın giriş noktası bilerek küçük tutulur. Sağlayıcılar, yönlendirmeler
// ve sayfa genelindeki etkiler src/app altındaki ayrı dosyalardan yönetilir.
export default function App() {
  return (
    <AppProviders>
      <AppEffects />
      <AppRoutes />
    </AppProviders>
  );
}
