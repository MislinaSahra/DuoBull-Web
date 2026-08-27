import { useEffect, useState } from "react";
import { AlertTriangle, Gamepad2, PackagePlus, Plus, Save, Trash2, Trophy, X } from "lucide-react";
import { deleteGameCatalog, fetchGameCatalog, saveGameCatalog } from "../services/GameCatalogService.js";
import { deleteProduct, fetchProducts, saveProduct } from "../services/ProductService.js";
import { deleteTournamentFormat, fetchTournamentFormats, saveTournamentFormat } from "../services/TournamentFormatService.js";

const list = (value) => Array.isArray(value) ? value : [];
const csv = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
const emptyGame = { id: "", name: "", roles: "", ranks: "", characters: "", team_size: 5, is_active: true, sort_order: 100 };
const emptyProduct = { id: "", name: "", type: "Dijital Kod", category: "Oyun Kodları", price: "", stockCount: 0, image: "", seoDescription: "", isActive: true };
const emptyFormat = { id: "", name: "", description: "", is_active: true, sort_order: 100 };
const parseWholeNumber = (value) => {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
};

export default function CatalogManagement() {
  const [games, setGames] = useState([]);
  const [products, setProducts] = useState([]);
  const [game, setGame] = useState(emptyGame);
  const [product, setProduct] = useState(emptyProduct);
  const [formats, setFormats] = useState([]);
  const [format, setFormat] = useState(emptyFormat);
  const [message, setMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const refreshGames = async () => setGames(list(await fetchGameCatalog()));
  const refreshProducts = async () => setProducts(list(await fetchProducts()));
  const refreshFormats = async () => setFormats(list(await fetchTournamentFormats()));

  useEffect(() => {
    refreshGames().catch((error) => setMessage(error.message));
    refreshProducts().catch((error) => setMessage(error.message));
    refreshFormats().catch((error) => setMessage(error.message));
  }, []);

  const submitGame = async (event) => {
    event.preventDefault();
    const result = await saveGameCatalog({ ...game, roles: csv(game.roles), ranks: csv(game.ranks), characters: csv(game.characters) });
    setMessage(result.ok ? "Oyun kategorisi kaydedildi." : result.message);
    if (result.ok) { setGame(emptyGame); await refreshGames(); }
  };

  const submitProduct = async (event) => {
    event.preventDefault();
    const result = await saveProduct({ ...product, price: parseWholeNumber(product.price), stockCount: parseWholeNumber(product.stockCount) });
    setMessage(result.ok ? "Ürün kaydedildi." : result.message);
    if (result.ok) { setProduct(emptyProduct); await refreshProducts(); }
  };
  const submitFormat = async (event) => { event.preventDefault(); const result = await saveTournamentFormat(format); setMessage(result.ok ? "Turnuva formatı kaydedildi." : result.message); if (result.ok) { setFormat(emptyFormat); await refreshFormats(); } };

  return <div className="grid gap-5 xl:grid-cols-2">
    <Manager title="Oyun Kategorileri" icon={Gamepad2} items={games} onNew={() => setGame(emptyGame)}
      meta={(item) => `${Number(item?.team_size || 5)} ana oyuncu • ${list(item?.roles).length} rol • ${list(item?.ranks).length} rank`}
      onEdit={(item) => setGame({ ...emptyGame, ...item, roles: list(item?.roles).join(", "), ranks: list(item?.ranks).join(", "), characters: list(item?.characters).join(", ") })}
      onDelete={(item) => setDeleteTarget({ kind: "game", item })}>
      <form onSubmit={submitGame} className="grid gap-3">
        <Field label="Oyun adı" value={game.name} set={(name) => setGame((x) => ({ ...x, name }))} />
        <Field label="Ana takım oyuncu sayısı" type="number" min="1" value={game.team_size} set={(team_size) => setGame((x) => ({ ...x, team_size }))} />
        <p className="-mt-1 text-[10px] leading-4 text-white/35">Açık koltuk hesabı rol sayısına göre değil, bu kapasiteye göre yapılır.</p>
        <Field label="Takım rolleri (virgülle ayırın)" value={game.roles} set={(roles) => setGame((x) => ({ ...x, roles }))} placeholder="Örn. Düellocu, Gözcü, Kontrol Uzmanı" />
        <p className="-mt-1 text-[10px] leading-4 text-white/35">Buradaki roller takım oluşturma, filtreleme ve Takım Bul kartlarındaki rol yuvalarında kullanılır.</p>
        <Field label="Ranklar (virgülle ayırın)" value={game.ranks} set={(ranks) => setGame((x) => ({ ...x, ranks }))} />
        <Field label="Ajan / karakterler (virgülle ayırın)" value={game.characters} set={(characters) => setGame((x) => ({ ...x, characters }))} />
        <button className="primary-button py-3"><Save className="h-4 w-4" /> Oyunu Kaydet</button>
      </form>
    </Manager>

    <Manager title="Turnuva Formatları" icon={Trophy} items={formats} onNew={() => setFormat(emptyFormat)}
      meta={(item) => `${item.is_active ? "Aktif" : "Pasif"} • Sıra ${item.sort_order}`}
      onEdit={(item) => setFormat({ ...emptyFormat, ...item })}
      onDelete={(item) => setDeleteTarget({ kind: "format", item })}>
      <form onSubmit={submitFormat} className="grid gap-3">
        <Field label="Format adı" value={format.name} set={(name) => setFormat((x) => ({ ...x, name }))} placeholder="Örn. Tek eleme" />
        <label className="text-xs font-bold text-white/55">Format açıklaması<textarea required value={format.description} onChange={(event) => setFormat((x) => ({ ...x, description: event.target.value }))} placeholder="Eşleşme ve ilerleme kurallarını açıklayın" className="mt-2 min-h-24 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white" /></label>
        <Field label="Sıralama" type="number" value={format.sort_order} set={(sort_order) => setFormat((x) => ({ ...x, sort_order }))} />
        <label className="flex items-center gap-2 rounded-lg border border-white/10 p-3 text-xs font-bold text-white/60"><input type="checkbox" checked={format.is_active} onChange={(event) => setFormat((x) => ({ ...x, is_active: event.target.checked }))} /> Oyuncular seçim yapabilsin</label>
        <button className="primary-button py-3"><Save className="h-4 w-4" /> Formatı Kaydet</button>
      </form>
    </Manager>

    <Manager title="Mağaza Ürünleri" icon={PackagePlus} items={products} onNew={() => setProduct(emptyProduct)}
      meta={(item) => `${Number(item?.price || 0).toLocaleString("tr-TR")} BP • ${Number(item?.stockCount || 0)} stok`}
      onEdit={(item) => setProduct({ ...emptyProduct, ...item, price: Number(item?.price || 0).toLocaleString("tr-TR") })}
      onDelete={(item) => setDeleteTarget({ kind: "product", item })}>
      <form onSubmit={submitProduct} className="grid gap-3 sm:grid-cols-2">
        <Field label="Ürün adı" value={product.name} set={(name) => setProduct((x) => ({ ...x, name }))} />
        <Field label="Kategori" value={product.category} set={(category) => setProduct((x) => ({ ...x, category }))} />
        <Field label="Ürün türü / kart etiketi" value={product.type} set={(type) => setProduct((x) => ({ ...x, type }))} />
        <Field label="Fiyat (BP)" inputMode="numeric" value={product.price} set={(price) => setProduct((x) => ({ ...x, price }))} placeholder="Örn. 1.000" />
        <Field label="Stok" type="number" value={product.stockCount} set={(stockCount) => setProduct((x) => ({ ...x, stockCount }))} />
        <div className="sm:col-span-2"><Field label="Görsel URL" value={product.image} set={(image) => setProduct((x) => ({ ...x, image }))} /></div>
        <label className="text-xs font-bold text-white/55 sm:col-span-2">Ürün açıklaması<textarea value={product.seoDescription || ""} onChange={(e) => setProduct((x) => ({ ...x, seoDescription: e.target.value }))} className="mt-2 min-h-24 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white" /></label>
        <button className="primary-button py-3 sm:col-span-2"><Save className="h-4 w-4" /> Ürünü Kaydet</button>
      </form>
    </Manager>
    {message ? <p className="rounded-lg border border-white/10 p-3 text-sm font-bold xl:col-span-2">{message}</p> : null}
    {deleteTarget ? <DeleteDialog
      target={deleteTarget}
      busy={deleting}
      onClose={() => !deleting && setDeleteTarget(null)}
      onConfirm={async () => {
        setDeleting(true);
        const result = deleteTarget.kind === "game" ? await deleteGameCatalog(deleteTarget.item.id) : deleteTarget.kind === "format" ? await deleteTournamentFormat(deleteTarget.item.id) : await deleteProduct(deleteTarget.item.id);
        setMessage(result.ok ? (deleteTarget.kind === "game" ? "Oyun kaldırıldı." : deleteTarget.kind === "format" ? "Turnuva formatı silindi." : "Ürün silindi.") : result.message);
        if (result.ok) deleteTarget.kind === "game" ? await refreshGames() : deleteTarget.kind === "format" ? await refreshFormats() : await refreshProducts();
        setDeleting(false);
        if (result.ok) setDeleteTarget(null);
      }}
    /> : null}
  </div>;
}

function Manager({ title, icon: Icon, onNew, items, meta, onEdit, onDelete, children }) {
  const safeItems = list(items);
  return <section className="glass-card rounded-2xl p-5"><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-xl font-black"><Icon className="h-5 w-5 text-bull-neon" />{title}</h3><button type="button" onClick={onNew} className="secondary-button p-2"><Plus className="h-4 w-4" /></button></div><div className="mt-4 max-h-56 space-y-2 overflow-y-auto">{safeItems.map((item) => <div key={item?.id || item?.name} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 p-3"><button type="button" onClick={() => onEdit(item)} className="min-w-0 text-left"><strong>{item?.name || "Adsız kayıt"}</strong><p className="mt-1 text-[10px] text-white/35">{meta(item)}</p></button><button type="button" onClick={() => onDelete(item)} className="p-2 text-red-200"><Trash2 className="h-4 w-4" /></button></div>)}{!safeItems.length ? <p className="py-4 text-center text-xs text-white/35">Henüz kayıt yok.</p> : null}</div><div className="mt-5 border-t border-white/10 pt-5">{children}</div></section>;
}

function Field({ label, value, set, type = "text", inputMode, placeholder, min }) {
  return <label className="text-xs font-bold text-white/55">{label}<input required type={type} min={min} inputMode={inputMode} placeholder={placeholder} value={value ?? ""} onChange={(event) => set(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white" /></label>;
}

function DeleteDialog({ target, busy, onClose, onConfirm }) {
  const isGame = target.kind === "game";
  const isFormat = target.kind === "format";
  return <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="glass-card w-full max-w-md rounded-2xl border border-red-300/15 p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-300/20 bg-red-400/10 text-red-200"><AlertTriangle className="h-6 w-6" /></span><button type="button" onClick={onClose} disabled={busy} className="secondary-button p-2"><X className="h-4 w-4" /></button></div>
      <h3 className="mt-5 text-2xl font-black">{isGame ? "Oyunu kaldır" : isFormat ? "Formatı sil" : "Ürünü sil"}</h3>
      <p className="mt-3 text-sm leading-6 text-white/55"><strong className="text-white">{target.item.name}</strong> kalıcı olarak kaldırılacak. Bu işlem geri alınamaz.</p>
      <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={onClose} disabled={busy} className="secondary-button py-3">Vazgeç</button><button type="button" onClick={onConfirm} disabled={busy} className="rounded-lg bg-red-500 px-4 py-3 text-sm font-black text-white transition hover:bg-red-400 disabled:opacity-50">{busy ? "Kaldırılıyor..." : "Evet, Kaldır"}</button></div>
    </section>
  </div>;
}
