import { Link } from "react-router-dom";
import PageHero from "../components/PageHero.jsx";
import StatsSection from "../components/StatsSection.jsx";

export default function CommunityPage() {
  return (
    <>
      <PageHero
        kicker="Topluluk"
        eyebrow="Sosyal kanıt"
        title="Büyüyen oyuncu tabanını ve sesini burada gör."
        description="Kayıtlı oyuncu sayısı, turnuva hacmi ve oyuncu yorumları topluluk sayfasında temiz bir görünümde durur."
        backgroundKey="team"
        iconKey="community"
        actions={
          <>
            <Link to="/takim-bul" className="primary-button">
              Topluluğa Katıl
            </Link>
            <Link to="/turnuvalar" className="secondary-button">
              Turnuvaları İncele
            </Link>
          </>
        }
      />
      <StatsSection />
    </>
  );
}
