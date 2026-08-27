import { PackageCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchOrders, subscribeToOrders } from "../services/OrderService.js";
import OrderCard from "./OrderCard.jsx";

export default function OrderHistory({ userEmail }) {
  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState("");
  useEffect(() => { const refresh = () => fetchOrders(userEmail).then(setOrders); refresh(); return subscribeToOrders(refresh); }, [userEmail]);
  const copyCode = async (code) => { try { await navigator.clipboard.writeText(code); setToast("Kopyalandı!"); } catch { setToast("Kod kopyalanamadı."); } window.setTimeout(() => setToast(""), 1800); };
  return <section className="glass-card relative rounded-xl p-5 sm:col-span-2 xl:col-span-1"><div className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-bull-neon" /><div><h3 className="font-black">Siparişlerim</h3><p className="mt-0.5 text-[11px] text-white/40">{orders.length} sipariş</p></div></div><div className="mt-4 space-y-3">{orders.map((order) => <OrderCard key={order.id} order={order} onCopy={copyCode} />)}{orders.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-xs text-white/40">Henüz siparişin yok.</p> : null}</div>{toast ? <div className="fixed bottom-6 right-6 z-[80] rounded-xl border border-emerald-300/20 bg-[#10251d] px-4 py-3 text-sm font-black text-emerald-100 shadow-2xl" role="status">{toast}</div> : null}</section>;
}
