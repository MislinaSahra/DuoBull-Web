import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { PublicPage, UserPage } from "./AppLayout.jsx";
import { ProtectedAdmin, ProtectedUser } from "./RouteGuards.jsx";

const page=(name)=>lazy(()=>import(`../pages/${name}.jsx`));
const AdminDashboardPage=page("AdminDashboardPage"),BlogPage=page("BlogPage"),CommunityRankingPage=page("CommunityRankingPage"),ErrorPage=page("ErrorPage"),HomePage=page("HomePage"),InfoPage=page("InfoPage"),LegalPage=page("LegalPage"),LoyaltyPage=page("LoyaltyPage"),MissionsPage=page("MissionsPage"),PasswordResetPage=page("PasswordResetPage"),PlayerCareerPage=page("PlayerCareerPage"),ProfilePage=page("ProfilePage"),ShopPage=page("ShopPage"),SocialPage=page("SocialPage"),DiscussionsPage=page("DiscussionsPage"),SubscriptionPage=page("SubscriptionPage"),SupportPage=page("SupportPage"),TeamCreatePage=page("TeamCreatePage"),TeamFinderPage=page("TeamFinderPage"),TeamProfilePage=page("TeamProfilePage"),TournamentsPage=page("TournamentsPage"),TournamentCreatePage=page("TournamentCreatePage"),TournamentDetailPage=page("TournamentDetailPage");

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="route-loading"><span/></div>}><Routes>
      <Route path="/" element={<PublicPage><HomePage /></PublicPage>} />
      <Route path="/takim-bul" element={<UserPage><TeamFinderPage /></UserPage>} />
      <Route path="/takim-olustur" element={<UserPage><TeamCreatePage /></UserPage>} />
      <Route path="/takim/:id" element={<UserPage><TeamProfilePage /></UserPage>} />
      <Route path="/profil" element={<UserPage><ProfilePage /></UserPage>} />
      <Route path="/sosyal" element={<UserPage><SocialPage /></UserPage>} />
      <Route path="/tartismalar" element={<UserPage><DiscussionsPage /></UserPage>} />
      <Route path="/topluluk-eslestirme" element={<UserPage><CommunityRankingPage /></UserPage>} />
      <Route path="/oyuncu/:id" element={<UserPage><PlayerCareerPage /></UserPage>} />
      <Route path="/turnuvalar" element={<UserPage><TournamentsPage /></UserPage>} />
      <Route path="/turnuvalar/:id" element={<UserPage><TournamentDetailPage /></UserPage>} />
      <Route path="/turnuva-olustur" element={<UserPage><TournamentCreatePage /></UserPage>} />
      <Route path="/gorevler" element={<UserPage><MissionsPage /></UserPage>} />
      <Route path="/sadakat" element={<UserPage><LoyaltyPage /></UserPage>} />
      <Route path="/magaza" element={<UserPage><ShopPage /></UserPage>} />
      <Route path="/abonelik" element={<UserPage><SubscriptionPage /></UserPage>} />
      <Route path="/blog" element={<PublicPage><BlogPage /></PublicPage>} />
      <Route path="/admin" element={<ProtectedAdmin><PublicPage><AdminDashboardPage /></PublicPage></ProtectedAdmin>} />
      <Route path="/yonetici-paneli" element={<Navigate to="/admin" replace />} />
      <Route path="/giris" element={<Navigate to="/#hesap" replace />} />
      <Route path="/uyelik" element={<Navigate to="/#hesap" replace />} />
      <Route path="/sifre-yenile" element={<PublicPage><PasswordResetPage /></PublicPage>} />
      <Route path="/destek" element={<UserPage><SupportPage /></UserPage>} />
      <Route path="/kullanim-kosullari" element={<UserPage><LegalPage type="terms" /></UserPage>} />
      <Route path="/gizlilik-politikasi" element={<UserPage><LegalPage type="privacy" /></UserPage>} />
      <Route path="/kvkk" element={<UserPage><InfoPage kicker="Hukuki" eyebrow="Yasal metin" title="KVKK Aydınlatma Metni" description="Bu sayfa KVKK metni için hazırlandı." /></UserPage>} />
      <Route path="/cerez-politikasi" element={<UserPage><InfoPage kicker="Hukuki" eyebrow="Yasal metin" title="Çerez Politikası" description="Bu sayfa çerez politikası içeriği için hazırlandı." /></UserPage>} />
      <Route path="/403" element={<PublicPage><ErrorPage status={403} /></PublicPage>} />
      <Route path="/404" element={<PublicPage><ErrorPage status={404} /></PublicPage>} />
      <Route path="/:slug" element={<ProtectedUser><PublicPage><PlayerCareerPage /></PublicPage></ProtectedUser>} />
      <Route path="*" element={<PublicPage><ErrorPage status={404} /></PublicPage>} />
    </Routes></Suspense>
  );
}
