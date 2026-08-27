const AUTH_ERROR_TRANSLATIONS = [
  ["password should be at least", "Şifreniz en az 8 karakter olmalıdır."],
  ["uppercase", "Şifreniz en az bir büyük harf içermelidir."],
  ["lowercase", "Şifreniz en az bir küçük harf içermelidir."],
  ["digit", "Şifreniz en az bir rakam içermelidir."],
  ["password is known to be weak", "Bu şifre çok kolay tahmin edilebilir. Lütfen daha güçlü bir şifre seçin."],
  ["user already registered", "Bu e-posta adresiyle daha önce kayıt oluşturulmuş."],
  ["invalid login credentials", "E-posta adresi veya şifre hatalı."],
  ["email not confirmed", "Giriş yapmadan önce e-posta adresinizi doğrulamalısınız."],
  ["email rate limit exceeded", "Çok fazla e-posta isteği gönderildi. Lütfen bir süre sonra tekrar deneyin."],
  ["rate limit exceeded", "Çok fazla işlem yapıldı. Lütfen bir süre sonra tekrar deneyin."],
  ["signup is disabled", "Yeni hesap oluşturma işlemi şu anda kullanılamıyor."],
  ["email address is invalid", "E-posta adresi doğrulanamadı. Adreste boşluk veya yazım hatası olmadığını kontrol edin."],
  ["invalid email", "E-posta adresi doğrulanamadı. Adreste boşluk veya yazım hatası olmadığını kontrol edin."],
  ["email provider is disabled", "E-posta ile kayıt özelliği şu anda kapalı. Yöneticiyle iletişime geçin."],
  ["database error saving new user", "Hesap bilgileri kaydedilirken sistem hatası oluştu. Lütfen tekrar deneyin."],
  ["duplicate key value violates unique constraint", "Bu kullanıcı adı kullanılıyor. Lütfen başka bir kullanıcı adı seçin."],
  ["new password should be different", "Yeni şifreniz mevcut şifrenizden farklı olmalıdır."],
  ["token has expired", "Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin."],
  ["otp expired", "Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin."],
  ["invalid otp", "Doğrulama kodu geçersiz."],
  ["token is invalid", "Doğrulama kodu geçersiz."],
  ["unable to validate email address", "Geçerli bir e-posta adresi yazın."]
];

export function getTurkishAuthError(error, fallback = "İşlem tamamlanamadı. Lütfen tekrar deneyin.") {
  const message = String(error?.message || error || "").trim();
  const normalized = message.toLocaleLowerCase("en-US");
  const matches = AUTH_ERROR_TRANSLATIONS
    .filter(([fragment]) => normalized.includes(fragment))
    .map(([, translation]) => translation);

  if (matches.length) return [...new Set(matches)].join(" ");
  if (error?.status === 429) return "Çok fazla kayıt denemesi yapıldı. Lütfen bir süre sonra tekrar deneyin.";
  if (error?.status >= 500) return "Kayıt servisine şu anda ulaşılamıyor. Lütfen kısa süre sonra tekrar deneyin.";
  return fallback;
}
