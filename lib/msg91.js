// MSG91 OTP helpers (server only).
const BASE = "https://control.msg91.com/api/v5";

function devMode() {
  return process.env.MSG91_DEV_MODE === "true";
}

// ---- test credentials ----
// A whitelisted number that never hits MSG91 and accepts a fixed OTP, so the
// whole flow (login -> signup -> dashboard) can be tested without SMS costs.
// Override via env if you want different values in production.
export const TEST_PHONE = process.env.TEST_LOGIN_PHONE || "919999999999";
export const TEST_OTP = process.env.TEST_LOGIN_OTP || "1234";
const isTestPhone = (phone) => String(phone) === TEST_PHONE;

export function normalizePhone(input) {
  let p = String(input || "").replace(/\D/g, "");
  if (p.length === 10) p = "91" + p; // default to India
  if (p.length < 11 || p.length > 15) return null;
  return p;
}

export async function sendOtp(phone) {
  if (isTestPhone(phone)) return { ok: true, test: true }; // no SMS for the test number
  if (devMode()) return { ok: true, dev: true };
  const url = `${BASE}/otp?template_id=${process.env.MSG91_TEMPLATE_ID}&mobile=${phone}&otp_length=4&otp_expiry=5`;
  const res = await fetch(url, { method: "POST", headers: { authkey: process.env.MSG91_AUTH_KEY } });
  const json = await res.json().catch(() => ({}));
  if (json.type !== "success") throw new Error(json.message || "Could not send OTP");
  return { ok: true };
}

export async function verifyOtp(phone, otp) {
  if (isTestPhone(phone)) return String(otp) === TEST_OTP;
  if (devMode()) return otp === "0000";
  const url = `${BASE}/otp/verify?otp=${encodeURIComponent(otp)}&mobile=${phone}`;
  const res = await fetch(url, { headers: { authkey: process.env.MSG91_AUTH_KEY } });
  const json = await res.json().catch(() => ({}));
  return json.type === "success";
}

export async function retryOtp(phone) {
  if (isTestPhone(phone)) return { ok: true, test: true };
  if (devMode()) return { ok: true, dev: true };
  const url = `${BASE}/otp/retry?mobile=${phone}&retrytype=text`;
  const res = await fetch(url, { method: "POST", headers: { authkey: process.env.MSG91_AUTH_KEY } });
  const json = await res.json().catch(() => ({}));
  if (json.type !== "success") throw new Error(json.message || "Could not resend OTP");
  return { ok: true };
}
