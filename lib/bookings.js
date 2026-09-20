// =============================================================
// Server-side booking writes.
//
// Lives in lib/ rather than in a route file because Next.js App Router only
// allows a fixed set of exports from `route.js`, and both the checkout order
// route and the verify route need this.
// =============================================================

import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Insert a confirmed booking together with its commission split.
 *
 * Bookings used to store only the gross `amount`, so every revenue figure
 * that included them (home page, admin leaderboard, creator detail) showed
 * the buyer's gross instead of the creator's payout. They now carry the same
 * commission_percentage / commission_amount / creator_amount columns that
 * mp_purchases does.
 *
 * If supabase/revenue_and_covers.sql hasn't been applied yet those columns
 * don't exist and the rich insert fails — we fall back to the legacy shape
 * rather than losing a booking the buyer already paid for.
 */
export async function insertBooking(row, { commissionPercentage = 0, commissionAmount = 0, creatorAmount = null } = {}) {
  const net = creatorAmount ?? Math.max(0, (row.amount || 0) - commissionAmount);

  const rich = await supabaseAdmin.from("mp_bookings").insert({
    ...row,
    commission_percentage: commissionPercentage,
    commission_amount: commissionAmount,
    creator_amount: net
  });
  if (!rich.error) return rich;

  console.warn("[bookings] commission columns missing, inserting legacy row:", rich.error.message);
  return supabaseAdmin.from("mp_bookings").insert(row);
}
