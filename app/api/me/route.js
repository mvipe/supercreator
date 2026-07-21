import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, isAdmin, isSuperAdmin } from "@/lib/supabaseAdmin";
import { reconcilePro, isProProfile } from "@/lib/subscription";

// Plan state must never be served from a cache — a stale "free" here is what
// makes an upgrade look like it didn't stick after a refresh.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStore = (body, init = {}) =>
  NextResponse.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store, max-age=0, must-revalidate", ...(init.headers || {}) }
  });

const SIGNED_OUT = { signedIn: false, admin: false, superAdmin: false, isPro: false, plan: "free", blocked: false };

// Progressive fallback. A select naming a column that doesn't exist fails as a
// whole, and the old code ignored the error — `prof` came back null and every
// user silently read as "free", which looked exactly like the plan reverting.
const SELECTS = [
  "plan, plan_expires_at, blocked, profile_complete, is_super_admin, payout_method, kyc_status",
  "plan, plan_expires_at, blocked, profile_complete, is_super_admin",
  "plan, plan_expires_at",
  "plan"
];

/** Read the profile with the richest select the DB actually supports. */
async function loadProfile(userId) {
  let lastErr = null;
  for (const sel of SELECTS) {
    const { data, error } = await supabaseAdmin
      .from("mp_profiles").select(sel).eq("user_id", userId).maybeSingle();
    if (!error) return { prof: data, degraded: sel !== SELECTS[0], warning: lastErr?.message || null };
    lastErr = error;
  }
  return { prof: null, degraded: true, warning: lastErr?.message || "Could not read profile." };
}

export async function GET(req) {
  const user = await getUserFromRequest(req);
  if (!user) return noStore(SIGNED_OUT);

  let { prof, degraded, warning } = await loadProfile(user.id);

  // Self-heal a paid-but-never-granted subscription, then re-read.
  try {
    if (await reconcilePro(user, prof)) {
      const again = await loadProfile(user.id);
      if (again.prof) prof = again.prof;
    }
  } catch { /* never block /api/me on reconciliation */ }

  const superAdmin = await isSuperAdmin(user).catch(() => false);
  const admin = prof?.plan === "admin" || prof?.plan === "superadmin" || isAdmin(user) || superAdmin;

  return noStore({
    signedIn: true,
    admin,
    superAdmin,
    isPro: isProProfile(prof),
    plan: prof?.plan || "free",
    planExpiresAt: prof?.plan_expires_at || null,
    blocked: !!prof?.blocked,
    profileComplete: !!prof?.profile_complete,
    // Lets the dashboard show payout state without a second round-trip.
    payoutReady: !!prof?.payout_method?.type,
    kycStatus: prof?.kyc_status || "not_started",
    // Surfaced so a missing migration is visible instead of silently
    // downgrading everyone to "free".
    ...(degraded ? { degraded: true, warning } : {})
  });
}