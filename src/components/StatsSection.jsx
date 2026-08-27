import { brandAssets } from "../data/brandAssets.js";
import { platformStats, testimonials } from "../data/mockData.js";

export default function StatsSection() {
  return (
    <section className="container-shell py-16">
      <div className="mb-9 text-center">
        <span className="section-kicker">Topluluk</span>
        <h2 className="section-title mx-auto max-w-3xl">Rekabet eden, kazanan ve birlikte büyüyen oyuncular.</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {platformStats.map((stat) => (
          <div key={stat.label} className="glass-card rounded-2xl p-6 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-bull-neon/20 bg-bull-neon/10">
              <img src={brandAssets.icons.loyalty} alt="" className="h-8 w-8 object-contain" />
            </span>
            <p className="text-3xl font-black text-white">{stat.value}</p>
            <p className="mt-2 text-sm font-bold text-white/55">{stat.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {testimonials.map((testimonial) => (
          <article key={testimonial.name} className="glass-card rounded-2xl p-6">
            <p className="text-sm leading-7 text-white/70">"{testimonial.quote}"</p>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-bull-neon/25 bg-bull-neon/15">
                <img src={brandAssets.icons.community} alt="" className="h-6 w-6 object-contain" />
              </div>
              <div>
                <p className="font-black">{testimonial.name}</p>
                <p className="text-xs text-white/45">{testimonial.role}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
