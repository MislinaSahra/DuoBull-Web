import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { brandAssets } from "../data/brandAssets.js";
import { categoryCards } from "../data/mockData.js";

export default function FeatureCards() {
  return (
    <section className="container-shell py-16">
      <div className="mb-9 max-w-3xl">
        <span className="section-kicker">Platform özellikleri</span>
        <h2 className="section-title">Oyuncular için hızlı, ödüllü ve rekabetçi bir merkez.</h2>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {categoryCards.map((feature) => (
          <Link
            key={feature.title}
            to={feature.to}
            className="group relative min-h-[300px] overflow-hidden rounded-2xl border border-bull-neon/20 bg-[#081015] shadow-neon transition duration-300 hover:-translate-y-1"
          >
            <img
              src={brandAssets.backgrounds[feature.backgroundKey]}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#07030e]/92 via-[#07030e]/66 to-transparent" />
            <div className="relative flex h-full min-h-[300px] flex-col justify-between p-6 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-xl border border-bull-neon/25 bg-black/35 shadow-neon backdrop-blur-xl">
                  <img src={brandAssets.icons[feature.iconKey]} alt="" className="h-11 w-11 object-contain" />
                </span>
                <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-black text-white/62">
                  {feature.stat}
                </span>
              </div>
              <div className="max-w-md">
                <h3 className="text-3xl font-black text-white sm:text-4xl">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/68">{feature.description}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-bull-neon">
                  Keşfet <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
