export function safeHttpUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

export function safeLinkHref(value) {
  const raw = String(value || "").trim();
  if (/^\/(?!\/)/.test(raw) || /^#[A-Za-z0-9_-]+$/.test(raw)) return raw;
  return safeHttpUrl(raw);
}
