import { supabase } from "./supabase.js";

export const IMMUTABLE_IMAGE_CACHE = "31536000";
export const MAX_SOURCE_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_SOURCE_IMAGE_PIXELS = 32_000_000;

const SAFE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function validateSourceImage(file) {
  if (!file || !SAFE_IMAGE_TYPES.has(file.type)) {
    throw new Error("Yalnızca JPEG, PNG veya WebP görselleri yüklenebilir.");
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new Error("Boş veya geçersiz görsel yüklenemez.");
  }
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error("Kaynak görsel en fazla 12 MB olabilir.");
  }
}

async function loadBitmap(file) {
  if ("createImageBitmap" in window) return createImageBitmap(file);

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = objectUrl;
    });
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function toWebpBlob(file, quality = 0.84, maxDimension = 1920) {
  validateSourceImage(file);
  const image = await loadBitmap(file);
  if (!image.width || !image.height || image.width * image.height > MAX_SOURCE_IMAGE_PIXELS) {
    image.close?.();
    throw new Error("Görsel çözünürlüğü güvenli sınırı aşıyor.");
  }
  const ratio = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));
  const context = canvas.getContext("2d", { alpha: true });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close?.();

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );
  if (!blob) throw new Error("Görsel WebP biçimine dönüştürülemedi.");
  return blob;
}

export async function toWebpDataUrl(file, quality = 0.82, maxDimension = 720) {
  const blob = await toWebpBlob(file, quality, maxDimension);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

export function versionedImagePath(prefix, label = "image") {
  const cleanPrefix = String(prefix).replace(/^\/+|\/+$/g, "");
  const nonce = globalThis.crypto?.randomUUID?.().slice(0, 8)
    || Math.random().toString(36).slice(2, 10);
  return `${cleanPrefix}/${label}-${Date.now()}-${nonce}.webp`;
}

export async function uploadPublicImage({ bucket, prefix, label, file }) {
  const webpBlob = await toWebpBlob(file);
  const path = versionedImagePath(prefix, label);
  const { error } = await supabase.storage.from(bucket).upload(path, webpBlob, {
    contentType: "image/webp",
    cacheControl: IMMUTABLE_IMAGE_CACHE,
    upsert: false,
  });
  if (error) throw error;

  return {
    bucket,
    path,
    url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl,
  };
}

function storagePathFromPublicUrl(bucket, url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = parsed.pathname.indexOf(marker);
    return index === -1
      ? ""
      : decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return "";
  }
}

export async function removeStoredImage(url, buckets) {
  if (!url) return;
  for (const bucket of buckets) {
    const path = storagePathFromPublicUrl(bucket, url);
    if (!path) continue;
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) console.warn("Eski görsel silinemedi:", error.message);
    return;
  }
}
