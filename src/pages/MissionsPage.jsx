import { Link } from "react-router-dom";
import MissionSection from "../components/MissionSection.jsx";
import PageHero from "../components/PageHero.jsx";

export default function MissionsPage() {
  return (
    <>
      <PageHero
        kicker="Görevler"
        eyebrow="Günlük görevler"
        title="Her gün oyna,"
        highlightedTitle="Bull Puanını büyüt."
        description="Görevleri tamamla, Bull Puan kazan ve ödüllerini hemen al. Ne kadar düzenli oynarsan, sadakat seviyen o kadar hızlı büyür."
        backgroundKey="missions"
        iconKey="missions"
        actions={
          <>
            <a href="#gunluk-gorevler" className="primary-button">Tüm Görevleri Gör</a>
            <Link to="/magaza" className="secondary-button">Ödülleri İncele</Link>
          </>
        }
      />
      <MissionSection />
    </>
  );
}
