import { ArrowLeft, Home, LockKeyhole, SearchX } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const errorContent = {
  403: {
    eyebrow: "Erişim reddedildi",
    title: "Bu alan için yetkin yok",
    description: "İstediğin sayfa yalnızca gerekli erişim yetkisine sahip hesaplar tarafından görüntülenebilir.",
    Icon: LockKeyhole
  },
  404: {
    eyebrow: "Sayfa bulunamadı",
    title: "Aradığın sayfa burada değil",
    description: "Bağlantı değişmiş, kaldırılmış veya adres hatalı yazılmış olabilir.",
    Icon: SearchX
  }
};

export default function ErrorPage({ status = 404 }) {
  const navigate = useNavigate();
  const content = errorContent[status] || errorContent[404];
  const Icon = content.Icon;

  return (
    <section className="container-shell flex min-h-[65vh] items-center justify-center py-16">
      <div className="glass-card w-full max-w-2xl rounded-3xl p-8 text-center sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-bull-neon/25 bg-bull-neon/10 text-bull-neon">
          <Icon className="h-8 w-8" />
        </div>
        <p className="mt-6 text-sm font-black uppercase tracking-[0.28em] text-bull-neon">{status} · {content.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">{content.title}</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-white/55">{content.description}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="secondary-button px-5 py-3">
            <ArrowLeft className="h-4 w-4" /> Geri dön
          </button>
          <Link to="/" className="primary-button px-5 py-3">
            <Home className="h-4 w-4" /> Ana sayfa
          </Link>
        </div>
      </div>
    </section>
  );
}
