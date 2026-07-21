// =============================================================
// Server-side user lookup helpers (service role only).
//
// Accounts exist in two shapes:
//   • email signups  -> real email, phone in auth.users.phone + metadata
//   • legacy OTP     -> alias email `${phone}@phone.megaprofile.app`
// Both must resolve for login to work, so every lookup checks both.
// =============================================================
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const aliasEmail = (phone) => `${phone}@phone.megaprofile.app`.toLowerCase();

/** User id for a phone number, or null. Checks real-phone users, then legacy alias. */
export async function findUserIdByPhone(phone) {
  const { data: byPhone, error } = await supabaseAdmin.rpc("mp_user_id_by_phone", { p_phone: phone });
  if (error) throw new Error(`Phone lookup failed: ${error.message}. Run supabase/auth-pack.sql.`);
  if (byPhone) return byPhone;
  const { data: byAlias } = await supabaseAdmin.rpc("mp_user_id_by_email", { p_email: aliasEmail(phone) });
  return byAlias || null;
}

/** User id for an email, or null. */
export async function findUserIdByEmail(email) {
  const { data, error } = await supabaseAdmin.rpc("mp_user_id_by_email", { p_email: String(email).toLowerCase() });
  if (error) throw new Error(`Email lookup failed: ${error.message}`);
  return data || null;
}

/** Email address stored on a user id. */
export async function emailOfUser(userId) {
  const { data, error } = await supabaseAdmin.rpc("mp_email_by_user_id", { p_id: userId });
  if (error) throw new Error(`Email fetch failed: ${error.message}. Run supabase/auth-pack.sql.`);
  return data || null;
}

/**
 * Mint a one-time login token for an existing user WITHOUT touching their
 * password. generateLink(magiclink) returns a hashed token the client can
 * redeem via supabase.auth.verifyOtp({ type:"email", token_hash }).
 *
 * This replaced the old trick of overwriting the password with an HMAC on
 * every OTP login — fine for alias accounts, but it would silently destroy
 * the chosen password of every email+password account.
 */
export async function mintLoginToken(email) {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error(`Could not create login token: ${error.message}`);
  const hash = data?.properties?.hashed_token;
  if (!hash) throw new Error("No login token returned.");
  return hash;
}
