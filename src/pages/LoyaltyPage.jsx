import { Link } from "react-router-dom";
import LoyaltySection from "../components/LoyaltySection.jsx";
import PageHero from "../components/PageHero.jsx";

export default function LoyaltyPage() {
  return (
    <>
      <PageHero
        kicker="Sadakat"
        eyebrow="Seviye sistemi"
        title="Bronzdan Efsaneye"
        highlightedTitle="Uzanan Bull Puan yolu."
        description="Seviyen, XP ilerlemen, rozetlerin ve avantajların tek bir yerde toplanır. Her aktivite daha görünür bir ilerleme hissi verir."
        backgroundKey="loyalty"
        iconKey="loyalty"
        actions={
          <>
            <Link to="/gorevler" className="primary-button">
              XP Kazan
            </Link>
            <Link to="/magaza" className="secondary-button">
              Puan Harca
            </Link>
          </>
        }
      />
      <LoyaltySection />
    </>
  );
}
