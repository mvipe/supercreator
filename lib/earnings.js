// =============================================================
// SuperCreators — one place that decides what a creator actually earned.
//
// Every sale row (mp_purchases / mp_bookings / mp_orders) stores THREE
// numbers, all in paise:
//
//   amount            what the buyer paid   (gross)
//   commission_amount what the platform kept (platform fee)
//   creator_amount    what the creator keeps (net)  = amount - commission
//
// The dashboard used to mix these up — the Books hub summed `amount`, the
// course stats summed `amount`, bookings never stored a commission at all —
// so "Total revenue" showed the buyer's gross, not the creator's payout.
// Every revenue number in the app now goes through the helpers below, so
// "Revenue"/"Earnings" always means NET of the platform fee.
//
// Legacy rows (written before creator_amount existed) fall back to
// amount - commission_amount, and finally to amount, so old sales still show
// something sensible instead of ₹0.
// =============================================================

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Gross paid by the buyer, in paise. */
export function grossPaise(row) {
  if (!row) return 0;
  return num(row.gross_amount ?? row.amount);
}

/** Platform fee on this sale, in paise. */
export function feePaise(row) {
  if (!row) return 0;
  if (row.commission_amount != null) return num(row.commission_amount);
  // Derived: whatever the buyer paid minus what the creator keeps.
  if (row.creator_amount != null) return Math.max(0, grossPaise(row) - num(row.creator_amount));
  return 0;
}

/** What the creator keeps on this sale, in paise (gross − platform fee). */
export function netPaise(row) {
  if (!row) return 0;
  if (row.creator_amount != null) return num(row.creator_amount);
  const gross = grossPaise(row);
  if (row.commission_amount != null) return Math.max(0, gross - num(row.commission_amount));
  return gross; // legacy row with no fee recorded
}

/** Same as netPaise but in rupees, ready to hand to inr(). */
export const netRupees = (row) => netPaise(row) / 100;
export const grossRupees = (row) => grossPaise(row) / 100;
export const feeRupees = (row) => feePaise(row) / 100;

/** Sum helpers — `rows` may contain cancelled/refunded entries, so filter first. */
export const sumNetPaise = (rows) => (rows || []).reduce((a, r) => a + netPaise(r), 0);
export const sumGrossPaise = (rows) => (rows || []).reduce((a, r) => a + grossPaise(r), 0);
export const sumFeePaise = (rows) => (rows || []).reduce((a, r) => a + feePaise(r), 0);

export const sumNetRupees = (rows) => sumNetPaise(rows) / 100;
export const sumGrossRupees = (rows) => sumGrossPaise(rows) / 100;
export const sumFeeRupees = (rows) => sumFeePaise(rows) / 100;

/** A booking is money only when it wasn't cancelled. */
export const isLiveSale = (row) => row?.status !== "cancelled" && row?.status !== "refunded";

/**
 * Break a list of sale rows into the three numbers every summary card shows.
 * Returns RUPEES. Cancelled/refunded rows are excluded from all three.
 */
export function earningsBreakdown(rows) {
  const live = (rows || []).filter(isLiveSale);
  return {
    count: live.length,
    gross: sumGrossPaise(live) / 100,
    fee: sumFeePaise(live) / 100,
    net: sumNetPaise(live) / 100
  };
}

/** Default commission split, used only when platform settings can't be read. */
export const DEFAULT_COMMISSION = { free: 30, pro: 10 };
