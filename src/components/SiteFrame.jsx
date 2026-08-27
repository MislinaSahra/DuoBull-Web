import { brandAssets } from "../data/brandAssets.js";

export default function SiteFrame({ children }) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#05090c] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <img
          src={brandAssets.backgrounds.hero}
          alt=""
          className="absolute left-0 top-[38rem] h-[1500px] w-full scale-110 object-cover object-bottom opacity-[0.12] blur-[64px]"
          style={{ maskImage: "linear-gradient(to bottom, transparent, black 16%, black 72%, transparent)" }}
        />
      </div>
      <div className="pointer-events-none fixed inset-0 z-0 opacity-70">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:42px_42px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,90,0,.14),transparent_34%),linear-gradient(180deg,rgba(5,3,10,.55),rgba(5,3,10,1))]" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
