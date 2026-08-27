export function formatPrize(value) {
  const amount = String(value ?? "").replaceAll("₺", "").trim();
  return amount ? `₺${amount}` : "";
}

export function prizeInputValue(value) {
  return String(value ?? "").replaceAll("₺", "").trim();
}
