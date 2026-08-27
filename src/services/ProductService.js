import { supabase } from "../lib/supabase.js";

export async function fetchProducts() {
  const { data, error } = await supabase.from("products").select("*").order("name");
  if (error) return [];
  if (!Array.isArray(data)) return [];
  return data.filter((item) => item && typeof item === "object").map((item) => ({
    id: textValue(item.id),
    name: textValue(item.name, "İsimsiz ürün"),
    type: textValue(item.product_type, "Dijital ürün"),
    category: textValue(item.category, "dijital-kartlar"),
    price: finiteNumber(item.price_bp),
    stockCount: finiteNumber(item.stock_count),
    image: textValue(item.image_url),
    isActive: item.is_active !== false,
    seoDescription: textValue(item.seo_description)
  }));
}

function textValue(value, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return fallback;
}

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function updateProductStock(productId, amount) {
  const { data, error } = await supabase.rpc("adjust_product_stock", { target_product_id: productId, delta: amount });
  return error ? { ok: false, message: error.message } : { ok: true, productId, stockCount: data };
}

export async function saveProduct(product) {
  const payload={id:product.id||crypto.randomUUID(),name:product.name.trim(),product_type:product.type||"digital_code",category:product.category||"Oyun Kodları",price_bp:Number(product.price||0),stock_count:Number(product.stockCount||0),image_url:product.image||"",is_active:product.isActive!==false,seo_description:product.seoDescription||""};
  const {data,error}=await supabase.from("products").upsert(payload).select().single();
  return error?{ok:false,message:error.message}:{ok:true,product:data};
}
export async function deleteProduct(id){const{error}=await supabase.from("products").delete().eq("id",id);return error?{ok:false,message:error.message}:{ok:true};}

export function subscribeToProducts(listener, channelName = "products-live") {
  const channel = supabase.channel(channelName).on("postgres_changes", { event: "*", schema: "public", table: "products" }, listener).subscribe();
  return () => supabase.removeChannel(channel);
}
