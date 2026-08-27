import { CheckCircle2, ShoppingBag, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "../context/CartContext.jsx";

export default function CartModal() {
  const { items, isOpen, closeCart, removeItem, clearCart, checkout, balance } = useCart();
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  if (!isOpen) return null;
  const total = items.reduce((sum, item) => sum + (Number.parseInt(String(item.price).replace(/\D/g, ""), 10) || 0), 0);

  const checkoutHandler = async () => {
    setProcessing(true);
    const result = await checkout();
    setMessage(result.message);
    setProcessing(false);
  };

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="cart-title" onMouseDown={(event) => event.target === event.currentTarget && closeCart()}><section className="glass-card max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl p-6"><div className="flex items-center justify-between border-b border-white/10 pb-4"><div className="flex items-center gap-3"><span className="icon-tile"><ShoppingBag className="h-5 w-5" /></span><div><p className="text-xs font-black uppercase tracking-widest text-bull-neon">DuoBull Mağaza</p><h2 id="cart-title" className="text-2xl font-black">Sepetim</h2></div></div><button type="button" onClick={closeCart} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Sepeti kapat"><X className="h-5 w-5" /></button></div><div className="mt-5 space-y-3">{items.map((item) => <article key={item.name} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.035] p-4"><div><h3 className="font-black">{item.name}</h3><p className="mt-1 text-xs text-white/50">{item.type}</p><p className="mt-1 text-sm font-black text-bull-gold">{item.price} BP</p></div><button type="button" onClick={() => removeItem(item.name)} className="secondary-button px-3 py-2" aria-label={`${item.name} ürününü kaldır`}><Trash2 className="h-4 w-4" /></button></article>)}{items.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">Sepetin henüz boş.</p> : null}</div>{items.length ? <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-5"><div><p className="text-xs text-white/45">Toplam</p><p className="text-xl font-black text-bull-gold">{total.toLocaleString("tr-TR")} BP</p></div><button type="button" onClick={clearCart} className="secondary-button px-4 py-2.5">Sepeti Temizle</button></div> : null}<div className="mt-5 border-t border-white/10 pt-5"><div className="mb-4 flex items-center justify-between text-sm"><span className="text-white/50">Kullanılabilir bakiye</span><strong>{balance.toLocaleString("tr-TR")} BP</strong></div><button type="button" disabled={!items.length || processing} onClick={checkoutHandler} className="primary-button w-full disabled:cursor-not-allowed disabled:opacity-45"><CheckCircle2 className="h-4 w-4" /> {processing ? "İşleniyor..." : "Satın Almayı Tamamla"}</button>{message ? <p className={`mt-3 rounded-lg border p-3 text-center text-sm font-bold ${message === "Satın Alım Başarılı" ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200" : "border-red-300/20 bg-red-400/10 text-red-200"}`} aria-live="polite">{message}</p> : null}</div></section></div>;
}
