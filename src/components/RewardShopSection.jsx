import { ChevronRight, Gift, LockKeyhole, Search, ShieldCheck, ShoppingBag, Trash2, Truck, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useHomeContent } from "../context/HomeContentContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useAdminOperations } from "../context/AdminOperationsContext.jsx";
import CartModal from "./CartModal.jsx";
import { useSubscription } from "../context/SubscriptionContext.jsx";
import { fetchProducts, subscribeToProducts } from "../services/ProductService.js";

const categoryLabels = { tumu: "Tüm Ürünler", "oyun-kodlari": "Oyun Kodları", "dijital-kartlar": "Dijital Kartlar" };

export default function RewardShopSection() {
  const [query, setQuery] = useState("");
  const [storeProducts, setStoreProducts] = useState([]);
  const [storeError, setStoreError] = useState("");
  const subscription = useSubscription();
  const canViewShop = subscription.hasFeature("loyalty_shop");
  useEffect(() => {
    if (!canViewShop) { setStoreProducts([]); setStoreError(""); return undefined; }
    let active = true;
    const refresh = async () => {
      try {
        const nextProducts = await fetchProducts();
        if (active) { setStoreProducts(Array.isArray(nextProducts) ? nextProducts : []); setStoreError(""); }
      } catch (error) {
        if (active) { setStoreProducts([]); setStoreError("Mağaza ürünleri şu anda yüklenemedi. Lütfen tekrar deneyin."); console.error("Mağaza ürünleri yüklenemedi:", error); }
      }
    };
    refresh();
    const unsubscribe = subscribeToProducts(refresh, "shop-products-live");
    return () => { active = false; unsubscribe?.(); };
  }, [canViewShop]);

  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("kategori") || "tumu";
  const { images } = useHomeContent();
  const { isAuthenticated } = useAuth();
  const { items: cartItems, addItem, removeItem, openCart, balance: cartBalance } = useCart();
  const { stockByProduct: productStock, refreshStock } = useAdminOperations();
  const navigate = useNavigate();
  const location = useLocation();
  const items = Array.isArray(cartItems) ? cartItems : [];
  const stockByProduct = productStock && typeof productStock === "object" ? productStock : {};
  const balance = Number(cartBalance) || 0;
  const total = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const activeProducts = useMemo(() => storeProducts.filter((product) => product.isActive !== false), [storeProducts]);
  const availableCategories = useMemo(() => ["tumu", ...new Set(activeProducts.map((product) => product.category).filter(Boolean))], [activeProducts]);
  const products = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("tr-TR");
    return activeProducts.filter((product) => (category === "tumu" || product.category === category) && (!search || `${product.name} ${product.type}`.toLocaleLowerCase("tr-TR").includes(search)));
  }, [activeProducts, category, query]);
  const totalStock = activeProducts.reduce((sum, product) => sum + getStock(product, stockByProduct), 0);

  const buy = (product) => {
    if (!isAuthenticated) { navigate("/giris", { state: { from: location.pathname } }); return; }
    if (!subscription.hasFeature("loyalty_shop")) { navigate("/abonelik"); return; }
    addItem(product);
  };

  if (!canViewShop) return <section id="magaza" className="container-shell shop-locked">
    <div className="shop-locked__icon"><LockKeyhole /></div>
    <span className="section-kicker">Abonelik avantajı</span>
    <h2>Sadakat mağazası abonelere özeldir.</h2>
    <p>Ürünleri, fiyatları ve stok bilgilerini görüntülemek için sadakat mağazası erişimi bulunan aktif bir pakete sahip olmalısın.</p>
    <button type="button" onClick={() => navigate("/abonelik")} className="primary-button">Abonelik Paketlerini İncele<ChevronRight /></button>
  </section>;

  return (
    <section id="magaza" className="container-shell shop-catalog">
      <div className="shop-toolbar">
        <div className="shop-categories">
          {availableCategories.map((id) => <button type="button" key={id} onClick={() => setSearchParams(id === "tumu" ? {} : { kategori: id })} className={category === id ? "is-active" : ""}><Gift />{categoryLabels[id] || id}</button>)}
        </div>
        <label className="shop-search"><Search /><input placeholder="Ürün, kod veya kategori ara..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      </div>

      <div className="shop-layout">
        <div className="shop-products">
          {storeError ? <p className="shop-empty is-error">{storeError}</p> : null}
          {products.map((product) => {
            const inCart = items.some((item) => item.name === product.name);
            return (
              <article key={product.id || product.name} className="shop-product-card">
                <div className="shop-product-card__image">
                  {product.image || images?.[product.imageKey] ? <img src={product.image || images?.[product.imageKey]} alt={product.name} loading="lazy" /> : <Gift />}
                  <span>Stok: {getStock(product, stockByProduct)}</span>
                </div>
                <div className="shop-product-card__body">
                  <small>{product.type}</small><h3>{product.name}</h3>
                  {product.seoDescription ? <p>{product.seoDescription}</p> : null}
                  <strong>{Number(product.price).toLocaleString("tr-TR")} BP</strong>
                  <button type="button" onClick={() => buy(product)} disabled={inCart} className={inCart ? "secondary-button" : "primary-button"}>{inCart ? "Sepete Eklendi" : "Sepete Ekle"}<ShoppingBag /></button>
                </div>
              </article>
            );
          })}
          {!storeError && products.length === 0 ? <p className="shop-empty">Aramana uygun ürün bulunamadı.</p> : null}
        </div>

        <aside className="shop-cart-panel">
          <div className="shop-cart-panel__head"><h2>Sepetim</h2><span><ShoppingBag />{items.length}</span></div>
          <div className="shop-cart-items">
            {items.map((item) => <article key={item.id || item.name}>
              <div className="shop-cart-thumb">{item.image || images?.[item.imageKey] ? <img src={item.image || images?.[item.imageKey]} alt="" /> : <Gift />}</div>
              <div><strong>{item.name}</strong><small>{item.type}</small><b>{Number(item.price).toLocaleString("tr-TR")} BP</b></div>
              <button type="button" onClick={() => removeItem(item.name)} aria-label={`${item.name} ürününü kaldır`}><Trash2 /></button>
            </article>)}
            {!items.length ? <div className="shop-cart-empty"><ShoppingBag /><strong>Sepetin henüz boş.</strong><span>Ürünleri buradan takip edebilirsin.</span></div> : null}
          </div>
          <div className="shop-cart-stats">
            <p><span>Kullanılabilir bakiye</span><b>{balance.toLocaleString("tr-TR")} BP</b></p>
            <p><span>Sepetteki ürün</span><b>{items.length} ürün</b></p>
            <p><span>Mağaza stoğu</span><b>{totalStock} adet</b></p>
            <p><span>Teslimat</span><b>Anında</b></p>
          </div>
          <div className="shop-cart-total"><span>Toplam tutar</span><strong>{total.toLocaleString("tr-TR")} BP</strong></div>
          <button type="button" disabled={!items.length} onClick={() => { refreshStock(); openCart(); }} className="primary-button shop-checkout">Ödemeye Geç<ChevronRight /></button>
          <small className="shop-cart-security"><LockKeyhole /> Güvenli ödeme altyapısı ile korunmaktadır.</small>
        </aside>
      </div>

      <div className="shop-assurances">
        <Assurance icon={Zap} title="Hızlı teslimat" text="Kodlar sipariş onayından sonra teslim edilir." />
        <Assurance icon={ShieldCheck} title="Güvenli ödeme" text="Bull Puan bakiyen güvenle kullanılır." />
        <Assurance icon={Truck} title="Dijital teslimat" text="Sipariş durumunu profilinden takip et." />
      </div>
      <CartModal />
    </section>
  );
}

function getStock(product, stockByProduct) {
  return Math.max(0, Number(product.stockCount ?? stockByProduct[stockKey(product)]) || 0);
}
function stockKey(product) { return product.name === "Valorant" ? "Valorant VP" : product.name; }
function Assurance({ icon: Icon, title, text }) { return <div><Icon /><p><strong>{title}</strong><span>{text}</span></p></div>; }
