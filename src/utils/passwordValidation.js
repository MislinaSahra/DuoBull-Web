export const PASSWORD_MIN_LENGTH = 8;

export function validatePassword(password) {
  if (!password || password.length < PASSWORD_MIN_LENGTH) return "Şifre en az 8 karakter olmalıdır.";
  if (!/[A-ZÇĞİÖŞÜ]/u.test(password)) return "Şifre en az bir büyük harf içermelidir.";
  if (!/[a-zçğıöşü]/u.test(password)) return "Şifre en az bir küçük harf içermelidir.";
  if (!/\d/.test(password)) return "Şifre en az bir rakam içermelidir.";
  return "";
}
