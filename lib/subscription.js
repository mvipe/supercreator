// =============================================================
// SuperCreators — server-side subscription helpers.
//
// Why this exists: the old flow did
//   supabaseAdmin.from("mp_profiles").update({ plan: "pro" }).eq("user_id", id)
// which is a silent no-op when the profile row doesn't exist yet (the
// "ensure" call is fire-and-forget and its errors were swallowed). Razorpay
// took the money, verify returned ok, and /api/me kept reporting "free"
// forever. Everything here upserts, checks errors, and can self-heal a
// paid-but-never-granted order.
// =============================================================

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const PLAN_DAYS = 30; // one subscription payment grants 30 days of Pro

function code() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

/**
 * True if this profile row is currently on an active Pro plan.
 *
 * A NULL plan_expires_at means "granted with no end date" (a manual grant from
 * the Supabase dashboard, or a legacy row from before expiries existed). The
 * old check required a non-null expiry, so those users read as Free even though
 * the DB clearly said 'pro'. Only an expiry that has actually *passed* downgrades.
 */
export function isProProfile(prof) {
  if (!prof) return false;
  if (prof.plan === "admin" || prof.plan === "superadmin") return true; // staff get Pro features
  if (prof.plan !== "pro") return false;
  if (!prof.plan_expires_at) return true;
  return new Date(prof.plan_expires_at) > new Date();
}

/**
 * Guarantee a mp_profiles row exists for `user`. Safe to call concurrently:
 * on a unique-violation we just re-read the winner's row.
 */
export async function ensureProfile(user, { ref = null } = {}) {
  if (!user?.id) return null;

  const { data: existing } = await supabaseAdmin
    .from("mp_profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (existing) return existing;

  const row = {
    user_id: user.id,
    // Seed the name from signup so "Hello, {name}" and the store heading
    // work immediately instead of showing a blank.
    display_name: user?.user_metadata?.full_name || "",
    full_name: user?.user_metadata?.full_name || "",
    phone_number: user.phone || user.user_metadata?.phone || "",
    referral_code: code(),
    referred_by: ref || null
  };

  const { data, error } = await supabaseAdmin
    .from("mp_profiles").insert(row).select("*").single();

  if (!error) return data;

  // Lost a race, or the referral_code collided — re-read / retry once.
  const { data: after } = await supabaseAdmin
    .from("mp_profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (after) return after;

  const retry = await supabaseAdmin
    .from("mp_profiles").insert({ ...row, referral_code: code() }).select("*").single();
  if (retry.error) throw retry.error;
  return retry.data;
}

/**
 * Grant / extend Pro for a user. Creates the profile row if missing, so the
 * write can never silently affect zero rows.
 *
 * @returns {Promise<{plan:string, planExpiresAt:string}>}
 */
export async function grantPro(user, { days = PLAN_DAYS } = {}) {
  const prof = await ensureProfile(user);

  // Extend from the later of "now" and the current expiry.
  const current = prof?.plan_expires_at ? new Date(prof.plan_expires_at) : null;
  const base = current && current > new Date() ? current : new Date();
  base.setDate(base.getDate() + days);
  const planExpiresAt = base.toISOString();

  const { data, error } = await supabaseAdmin
    .from("mp_profiles")
    .update({ plan: "pro", plan_expires_at: planExpiresAt })
    .eq("user_id", user.id)
    .select("plan, plan_expires_at");

  if (error) throw error;

  // Zero rows means the row vanished between the two statements, or a CHECK
  // constraint silently rejected 'pro'. Fail loudly instead of pretending.
  if (!data || data.length === 0) {
    throw new Error("Could not activate Pro on your profile. Please contact support with your payment ID.");
  }

  return { plan: data[0].plan, planExpiresAt: data[0].plan_expires_at };
}

/**
 * Self-heal: if the user has a paid subscription order but isn't Pro, the
 * grant was lost (old bug, or the browser died before /verify ran). Apply it.
 * Cheap enough to call from /api/me.
 *
 * @returns {Promise<object|null>} the refreshed profile if we changed anything
 */
export async function reconcilePro(user, prof) {
  if (!user?.id || isProProfile(prof)) return null;

  const { data: paid } = await supabaseAdmin
    .from("mp_sub_orders")
    .select("id, created_at, applied_at")
    .eq("user_id", user.id)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!paid?.length) return null;

  // Only orders we never applied, and only those still inside their window.
  const pending = paid.filter((o) => {
    if (o.applied_at) return false;
    const ends = new Date(o.created_at);
    ends.setDate(ends.getDate() + PLAN_DAYS);
    return ends > new Date();
  });
  if (!pending.length) return null;

  let result = null;
  for (const o of pending) {
    result = await grantPro(user);
    await supabaseAdmin
      .from("mp_sub_orders")
      .update({ applied_at: new Date().toISOString() })
      .eq("id", o.id);
  }
  return result;
}
