import PageHero from "../components/PageHero.jsx";
import TournamentSection from "../components/TournamentSection.jsx";
import AuthenticatedLink from "../components/AuthenticatedLink.jsx";

export default function TournamentsPage() {
  return (
    <>
      <PageHero
        kicker="Turnuvalar"
        eyebrow="Rekabetin merkezi"
        title="Açık turnuvalar."
        highlightedTitle="Büyük ödüller."
        description="Kayıt durumu, katılımcı sayısı, tarih ve ödül havuzu tek bakışta görülsün diye turnuva akışını ayrıntılı bir sayfaya taşıdık."
        backgroundKey="tournaments"
        iconKey="tournament"
        actions={
          <>
            <AuthenticatedLink to="/turnuvalar#turnuvalar" className="primary-button">Turnuvaya Katıl</AuthenticatedLink>
            <AuthenticatedLink to="/turnuva-olustur" className="secondary-button">Turnuva Oluştur</AuthenticatedLink>
          </>
        }
      />
      <TournamentSection />
    </>
  );
}
