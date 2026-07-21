import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    "Supabase admin env missing: " +
    [!url && "NEXT_PUBLIC_SUPABASE_URL", !serviceKey && "SUPABASE_SERVICE_ROLE_KEY"]
      .filter(Boolean).join(", ")
  );
}

// Service-role client — server only. Bypasses RLS.
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

/** Resolve the authed user from a route request's Authorization header. */
export async function getUserFromRequest(req) {
  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data.user;
}

function phonesFrom(envVal) {
  return (envVal || "").split(",").map((p) => p.replace(/\D/g, "")).filter(Boolean);
}
function userPhone(user) {
  return String(user?.user_metadata?.phone || user?.phone || "").replace(/\D/g, "");
}

/** Admin if the user's phone is in ADMIN_PHONES (or they're a super admin). */
export function isAdmin(user) {
  if (!user) return false;
  const phone = userPhone(user);
  if (!phone) return false;
  return phonesFrom(process.env.ADMIN_PHONES).includes(phone)
      || phonesFrom(process.env.SUPER_ADMIN_PHONES).includes(phone);
}

/** Super admin: env list SUPER_ADMIN_PHONES OR mp_profiles.is_super_admin. */
export async function isSuperAdmin(user) {
  if (!user) return false;
  const phone = userPhone(user);
  if (phone && phonesFrom(process.env.SUPER_ADMIN_PHONES).includes(phone)) return true;
  const { data } = await supabaseAdmin
    .from("mp_profiles").select("is_super_admin").eq("user_id", user.id).maybeSingle();
  return !!data?.is_super_admin;
}

/** True if the user's account is blocked. */
export async function isBlocked(userId) {
  if (!userId) return false;
  const { data } = await supabaseAdmin
    .from("mp_profiles").select("blocked").eq("user_id", userId).maybeSingle();
  return !!data?.blocked;
}
/** Returns the user's KYC status string ('not_started' | 'under_review' | 'verified' | 'rejected'). */
export async function kycStatus(userId) {
  if (!userId) return "not_started";
  const { data } = await supabaseAdmin
    .from("mp_kyc").select("status").eq("user_id", userId).maybeSingle();
  return data?.status || "not_started";
}