import { createContext, useContext, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { useMissions } from "./MissionContext.jsx";
import { createOrder } from "../services/OrderService.js";

const CartContext = createContext(null);
const STORAGE_KEY = "duobull.cart";

function readCart() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    // Older releases stored the cart as { items: [...] }. Normalise both
    // formats so stale browser data cannot crash the shop page.
    const items = Array.isArray(stored) ? stored : (Array.isArray(stored?.items) ? stored.items : []);
    return items
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        ...item,
        id: primitiveText(item.id),
        name: primitiveText(item.name, "Ürün"),
        type: primitiveText(item.type, "Dijital ürün"),
        image: primitiveText(item.image),
        price: Number.isFinite(Number(item.price)) ? Number(item.price) : 0,
        quantity: Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 1
      }));
  }
  catch { return []; }
}

function primitiveText(value, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return fallback;
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const { balance, refresh } = useMissions();
  const [items, setItems] = useState(readCart);
  const [isOpen, setIsOpen] = useState(false);
  const save = (next) => {
    const safeItems = Array.isArray(next) ? next : [];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeItems));
    setItems(safeItems);
  };
  const value = useMemo(() => ({
    items,
    isOpen,
    openCart() { setIsOpen(true); },
    closeCart() { setIsOpen(false); },
    addItem(product) {
      const existing = items.find((item) => item.name === product.name);
      const stockLimit = Math.max(1, Number(product.stockCount) || 99);
      save(existing
        ? items.map((item) => item.name === product.name ? { ...item, quantity: Math.min(stockLimit, item.quantity + 1) } : item)
        : [...items, { ...product, quantity: 1 }]);
    },
    updateQuantity(name, quantity) {
      save(items.map((item) => {
        if (item.name !== name) return item;
        const stockLimit = Math.max(1, Number(item.stockCount) || 99);
        return { ...item, quantity: Math.max(1, Math.min(stockLimit, Number(quantity) || 1)) };
      }));
    },
    removeItem(name) { save(items.filter((item) => item.name !== name)); },
    clearCart() { save([]); },
    async checkout() {
      if (!items.length) return { ok: false, message: "Sepetin boş." };
      const productIds = items.flatMap((item) => Array.from({ length: item.quantity }, () => item.id || ({ "Razer Gold": "razer-gold", "Google Play": "google-play", "App Store": "app-store", "PUBG Mobile": "pubg-mobile", Valorant: "valorant-vp", "Valorant VP": "valorant-vp" }[item.name]))).filter(Boolean);
      const result = await createOrder({ productIds });
      if (!result.ok) return result;
      save([]);
      await refresh();
      console.log("Sipariş onay yanıtı:", result);
      return { ok: true, message: "Satın Alım Başarılı", order: result.order };
    },
    balance
  }), [items, isOpen, balance, user]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
