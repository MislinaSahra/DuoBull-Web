import { supabase } from "../lib/supabase.js";

export async function getTotpFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data?.totp || [];
}

export async function beginTotpEnrollment() {
  const existing = await getTotpFactors();
  for (const factor of existing.filter((item) => item.status === "unverified")) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "DuoBull Authenticator" });
  if (error) throw error;
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function verifyTotpEnrollment(factorId, code) {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: code.trim() });
  if (error) throw error;
}

export async function disableTotp(factorId) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

export async function verifyMfaChallenge(factorId, code) {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: code.trim() });
  if (error) throw error;
}

export function generateRecoveryCodes(count = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: count }, () => {
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    const raw = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export async function saveRecoveryCodes(codes) {
  const { error } = await supabase.rpc("replace_mfa_recovery_codes", { p_codes: codes });
  if (error) throw error;
}
