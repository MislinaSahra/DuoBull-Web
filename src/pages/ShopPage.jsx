import { Component } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero.jsx";
import RewardShopSection from "../components/RewardShopSection.jsx";
import AuthenticatedLink from "../components/AuthenticatedLink.jsx";

export default function ShopPage() {
  return (
    <ShopErrorBoundary>
      <PageHero
        kicker="Mağaza"
        eyebrow="Bull Puan → Dijital ödül"
        title="Bull Puanlarını"
        highlightedTitle="Dijital ödüllere dönüştür."
        description="Oyun içi para birimleri, hediye kartları, kodlar ve daha fazlası DuoBull Mağaza'da seni bekliyor."
        backgroundKey="shop"
        iconKey="shop"
        actions={
          <>
            <AuthenticatedLink to="/magaza#magaza" className="primary-button">
              Puanla Alışveriş
            </AuthenticatedLink>
            <Link to="/gorevler" className="secondary-button">
              Daha Fazla Puan
            </Link>
          </>
        }
      />
      <RewardShopSection />
    </ShopErrorBoundary>
  );
}

class ShopErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Mağaza sayfası çalışma hatası:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="container-shell py-16">
        <div className="glass-card mx-auto max-w-2xl rounded-2xl border border-red-300/20 p-8 text-center">
          <h1 className="text-2xl font-black">Mağaza yüklenemedi</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">Geçici tarayıcı verileri temizlenerek mağaza yeniden açılabilir.</p>
          <button type="button" className="primary-button mt-6" onClick={() => { window.localStorage.removeItem("duobull.cart"); window.location.reload(); }}>
            Mağazayı Yeniden Yükle
          </button>
        </div>
      </section>
    );
  }
}
