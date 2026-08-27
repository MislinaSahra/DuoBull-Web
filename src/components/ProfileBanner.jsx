export default function ProfileBanner({ src, alt = "Banner görseli" }) {
  if (!src) return null;

  return (
    <div className="mx-auto mt-6 aspect-[5/2] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#09050f] shadow-[0_18px_60px_rgba(126,55,255,0.12)]">
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    </div>
  );
}
