import { apiFetch } from "@/lib/supabase";

/**
 * Fetch the current user's plan/admin status.
 * Returns {signedIn, admin, superAdmin, isPro, plan, planExpiresAt, blocked}.
 *
 * Always cache-busted: a stale read here is what made a fresh Pro upgrade
 * look like it had reverted to free.
 */
export async function fetchMe() {
  try {
    const me = await apiFetch(`/api/me?t=${Date.now()}`, undefined, "GET");
    // Make a missing migration loud instead of letting it look like "Free".
    if (me?.warning) console.warn("[plan] /api/me degraded:", me.warning);
    return me;
  } catch (e) {
    // Returning a fake "free" here is why a Pro account could still render as
    // Free: any 500 became a silent downgrade. Keep the safe default, but flag
    // it so callers (and the console) can tell "unknown" from "actually free".
    console.warn("[plan] fetchMe failed:", e.message);
    return {
      signedIn: false, admin: false, superAdmin: false, isPro: false,
      plan: "free", planExpiresAt: null, commissionPercentage: 30,
      error: e.message
    };
  }
}

/** Get plan details including commission percentage */
export async function getPlanDetails() {
  try {
    const response = await apiFetch("/api/plans", undefined, "GET");
    const proPlanPriceRupees = Number(response.proPlanPriceRupees ?? 4.99);
    const safeProPlanPriceRupees = Number.isNaN(proPlanPriceRupees) ? 4.99 : proPlanPriceRupees;
    const proPlanPricePaise = Number(response.proPlanPricePaise ?? Math.round(safeProPlanPriceRupees * 100));
    return {
      freePlanCommission: Number(response.freePlanCommission ?? 30),
      proPlanCommission: Number(response.proPlanCommission ?? 10),
      proPlanPriceRupees: safeProPlanPriceRupees,
      proPlanPricePaise: Number.isNaN(proPlanPricePaise) ? Math.round(safeProPlanPriceRupees * 100) : proPlanPricePaise,
      proPlanPriceDisplay: response.proPlanPriceDisplay || `₹${safeProPlanPriceRupees.toFixed(2)}`,
    };
  } catch {
    return {
      freePlanCommission: 30,
      proPlanCommission: 10,
      proPlanPriceRupees: 4.99,
      proPlanPricePaise: 499,
      proPlanPriceDisplay: "₹4.99",
    };
  }
}

/** Calculate earnings after commission for a given amount */
export function calculateEarnings(amount, commissionPercentage) {
  const commission = (amount * commissionPercentage) / 100;
  const earnings = amount - commission;
  return { commission, earnings, commissionPercentage };
}