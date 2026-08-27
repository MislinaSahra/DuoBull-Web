import { supabase } from "../lib/supabase.js";
import { removeStoredImage, uploadPublicImage } from "../lib/storageImages.js";

export async function fetchSiteImages() {
  const { data, error } = await supabase.from("site_images").select("image_key,image_url");
  if (error) throw error;
  return Object.fromEntries((data || []).map((item) => [item.image_key, item.image_url]));
}

function dataUrlToBlob(dataUrl) {
  const [meta, encoded] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);/)?.[1] || "image/jpeg";
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

export async function saveSiteImage(key, value) {
  const { data: auth } = await supabase.auth.getUser();
  const { data: previous } = await supabase
    .from("site_images")
    .select("image_url")
    .eq("image_key", key)
    .maybeSingle();
  let imageUrl = value;
  if (value.startsWith("data:image/")) {
    const blob = dataUrlToBlob(value);
    const uploaded = await uploadPublicImage({
      bucket: "site-images",
      prefix: key,
      label: key,
      file: blob,
    });
    imageUrl = uploaded.url;
  }
  const { error } = await supabase.from("site_images").upsert({ image_key: key, image_url: imageUrl, updated_by: auth.user.id, updated_at: new Date().toISOString() });
  if (error) throw error;
  if (previous?.image_url && previous.image_url !== imageUrl) {
    await removeStoredImage(previous.image_url, ["site-images"]);
  }
  return imageUrl;
}

export async function deleteSiteImage(key) {
  const { data: previous } = await supabase.from("site_images").select("image_url").eq("image_key", key).maybeSingle();
  const { error } = await supabase.from("site_images").delete().eq("image_key", key);
  if (error) throw error;
  if (previous?.image_url) await removeStoredImage(previous.image_url, ["site-images"]);
}

export async function resetSiteImages(keys = []) {
  if (!keys.length) return;
  const { error } = await supabase.from("site_images").delete().in("image_key", keys);
  if (error) throw error;
}

export function subscribeToSiteImages(refresh) {
  const channel = supabase.channel("site-images-live").on("postgres_changes", { event: "*", schema: "public", table: "site_images" }, refresh).subscribe();
  return () => supabase.removeChannel(channel);
}
