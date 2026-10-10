export default function SiteFrame({ children }) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#05090c] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-[38rem] h-[1100px] bg-[radial-gradient(ellipse_at_center,rgba(255,90,0,.09),transparent_68%)]" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-70">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:42px_42px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,90,0,.14),transparent_34%),linear-gradient(180deg,rgba(5,3,10,.55),rgba(5,3,10,1))]" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
