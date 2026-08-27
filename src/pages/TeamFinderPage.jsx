import { Link } from "react-router-dom";
import PageHero from "../components/PageHero.jsx";
import TeamFinderPreview from "../components/TeamFinderPreview.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import LftMarket from "../components/LftMarket.jsx";

export default function TeamFinderPage() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <PageHero
        kicker="Takım bul"
        eyebrow="Takımını bul, zafere birlikte koş"
        title="Duo, trio veya"
        highlightedTitle="Tam takımını burada kur."
        description="Rol, seviye, oyun ve bölge filtrelerini kullanarak sana uygun oyuncuları hızlıca bul. Liste akışı doğrudan takım kurmaya ve başvuru almaya odaklanır."
        backgroundKey="team"
        iconKey="team"
        actions={
          <>
            <Link
              to={isAuthenticated ? "/takim-bul#takim-bul" : "/giris"}
              state={isAuthenticated ? undefined : { from: "/takim-bul#takim-bul" }}
              className="primary-button"
            >
              Eşleşmeyi Başlat
            </Link>
            <Link to="/takim-olustur" className="secondary-button">
              Takım Oluştur
            </Link>
          </>
        }
      />
      <TeamFinderPreview sidebarContent={<LftMarket compact />} />
    </>
  );
}
