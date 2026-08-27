export function deleteUserAccount(email) {
  if (!email) return { ok: false, message: "Kullanıcı bulunamadı." };
  const users = JSON.parse(window.localStorage.getItem("duobull.users") || "[]");
  window.localStorage.setItem("duobull.users", JSON.stringify(users.filter((user) => user.email !== email)));
  ["duobull.session", `duobull.missions.${email}`].forEach((key) => window.localStorage.removeItem(key));
  const notifications = JSON.parse(window.localStorage.getItem("duobull.notifications") || "[]");
  window.localStorage.setItem("duobull.notifications", JSON.stringify(notifications.filter((item) => (item.recipientId || item.recipientEmail) !== email)));
  const orders = JSON.parse(window.localStorage.getItem("duobull.orders") || "[]");
  window.localStorage.setItem("duobull.orders", JSON.stringify(orders.filter((order) => order.userEmail !== email)));
  return { ok: true };
}

export function updateUserRecord(email, profile) {
  const users = JSON.parse(window.localStorage.getItem("duobull.users") || "[]");
  const nextUsers = users.map((user) => user.email === email ? { ...user, ...profile, password: user.password } : user);
  window.localStorage.setItem("duobull.users", JSON.stringify(nextUsers));
  window.localStorage.setItem("duobull.session", JSON.stringify(profile));
  return { ok: true, user: profile };
}

export function fileToDataUrl(file) { return file?.type?.startsWith("image/") ? toWebpDataUrl(file) : new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = reject; reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); }); }
import { toWebpDataUrl } from "../lib/storageImages.js";
