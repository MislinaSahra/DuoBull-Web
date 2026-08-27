import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getReferralSummary } from "../services/ReferralService.js";

const EMPTY_SUMMARY = { code: "", total: 0, rewarded: 0, earnedBp: 0 };

export default function ReferralCard() {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");

  const referralLink = useMemo(
    () => summary.code ? `${window.location.origin}/?ref=${encodeURIComponent(summary.code)}` : "",
    [summary.code],
  );

  useEffect(() => {
    let active = true;
    getReferralSummary().then((result) => {
      if (!active) return;
      if (result.ok) setSummary(result.summary);
      else setMessage(result.message || "Referans bilgileri yüklenemedi.");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function copyReferralLink() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setMessage("Bağlantı kopyalanamadı. Bağlantıyı seçerek elle kopyalayabilirsin.");
    }
  }

  return (
    <section id="referans" className="glass-card profile-referral mt-4 rounded-xl p-5 md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-xl border border-bull-neon/20 bg-bull-neon/10 p-3 text-bull-neon">
            <Share2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-bull-neon">Referans programı</p>
            <h2 className="mt-1 text-xl font-black">Arkadaşını davet et, birlikte kazan</h2>
            <p className="mt-1 text-sm text-white/50">Bağlantınla ilk kez kayıt olan her oyuncu için 100 BP kazanırsın.</p>
          </div>
        </div>
        <div className="flex w-full gap-2 lg:max-w-xl">
          <input
            value={loading ? "Bağlantı hazırlanıyor..." : referralLink}
            readOnly
            aria-label="Referans bağlantısı"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-xs text-white/70 outline-none"
          />
          <button type="button" onClick={copyReferralLink} disabled={!referralLink} className="secondary-button shrink-0 px-4 disabled:opacity-40">
            {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? "Kopyalandı" : "Kopyala"}</span>
          </button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 md:max-w-xl">
        <ReferralStat label="Toplam kayıt" value={summary.total} />
        <ReferralStat label="Ödüllendirilen" value={summary.rewarded} />
        <ReferralStat label="Kazanılan" value={`${summary.earnedBp.toLocaleString("tr-TR")} BP`} />
      </div>
      {message ? <p className="mt-3 text-xs text-rose-300">{message}</p> : null}
    </section>
  );
}

function ReferralStat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-center">
      <strong className="block text-sm text-white">{value}</strong>
      <span className="mt-1 block text-[9px] font-black uppercase tracking-wider text-white/35">{label}</span>
    </div>
  );
}
