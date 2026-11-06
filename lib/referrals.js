// =============================================================
// SuperCreators — Refer & Earn (server only).
//
// The admin decides, from Admin → Refer & Earn:
//   • whether the programme is on at all
//   • what earns a reward: the referred creator signing up, their FIRST Pro
//     payment, or EVERY Pro payment
//   • how much: a flat ₹ amount or a % of the Pro payment
//   • whether rewards land straight away or wait for admin approval
//   • a per-creator cap, and a per-creator kill switch
//
// Approved rewards feed mp_lifetime_earned() (supabase/referrals.sql), so a
// creator withdraws them through the normal Payouts flow.
// =============================================================

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const REFERRAL_DEFAULTS = {
  enabled: true,
  trigger: "first_pro",
  reward_type: "flat",
  reward_amount: 5000,
  reward_percent: 20,
  auto_approve: false,
  max_rewards_per_user: 0,
  headline: "Invite creators, earn rewards",
  terms: ""
};

/** Settings row, or defaults if referrals.sql hasn't been run yet. */
export async function getReferralSettings() {
  const { data, error } = await supabaseAdmin.from("mp_referral_settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return { ...REFERRAL_DEFAULTS, migrated: !error };
  return { ...REFERRAL_DEFAULTS, ...data, migrated: true };
}

/** Human summary of the current offer, e.g. "₹50 when they buy Pro". */
export function describeOffer(s) {
  const amt = s.reward_type === "percent" ? `${Number(s.reward_percent)}% of their Pro payment` : `₹${(Number(s.reward_amount) / 100).toLocaleString("en-IN")}`;
  const when = s.trigger === "signup" ? "for every creator who signs up with your link"
    : s.trigger === "every_pro" ? "every time a creator you referred pays for Pro"
    : "when a creator you referred buys Pro for the first time";
  return `${amt} ${when}`;
}

/**
 * Record a reward for whoever referred `referredUserId`, if the current
 * settings say this event earns one. Never throws — a referral problem must
 * not break signup or a subscription payment.
 *
 * @param {object} p
 * @param {string} p.referredUserId   the NEW creator
 * @param {"signup"|"subscription"} p.event
 * @param {string} [p.orderId]        mp_sub_orders.id for subscription events
 * @param {number} [p.paymentPaise]   the Pro payment, for % rewards
 */
export async function awardReferral({ referredUserId, event, orderId = null, paymentPaise = 0 }) {
  try {
    const s = await getReferralSettings();
    if (!s.migrated || !s.enabled) return null;

    if (event === "signup" && s.trigger !== "signup") return null;
    if (event === "subscription" && s.trigger === "signup") return null;

    const { data: me } = await supabaseAdmin.from("mp_profiles")
      .select("user_id, referred_by").eq("user_id", referredUserId).maybeSingle();
    const code = String(me?.referred_by || "").trim();
    if (!code) return null;

    const { data: referrer } = await supabaseAdmin.from("mp_profiles")
      .select("user_id, blocked, referral_disabled").ilike("referral_code", code).maybeSingle();
    if (!referrer || referrer.user_id === referredUserId) return null;
    if (referrer.blocked || referrer.referral_disabled) return null;

    // "first_pro" pays once per referred creator.
    if (event === "subscription" && s.trigger === "first_pro") {
      const { count } = await supabaseAdmin.from("mp_referral_rewards")
        .select("id", { count: "exact", head: true })
        .eq("referred_id", referredUserId).eq("source", "subscription");
      if ((count || 0) > 0) return null;
    }

    // Per-referrer cap (rejected rewards don't count against it).
    if (Number(s.max_rewards_per_user) > 0) {
      const { count } = await supabaseAdmin.from("mp_referral_rewards")
        .select("id", { count: "exact", head: true })
        .eq("referrer_id", referrer.user_id).neq("status", "rejected").neq("source", "manual");
      if ((count || 0) >= Number(s.max_rewards_per_user)) return null;
    }

    const amount = s.reward_type === "percent"
      ? Math.round((Number(paymentPaise) || 0) * Number(s.reward_percent) / 100)
      : Math.round(Number(s.reward_amount) || 0);
    if (amount <= 0) return null;

    const auto = !!s.auto_approve;
    const { data, error } = await supabaseAdmin.from("mp_referral_rewards").insert({
      referrer_id: referrer.user_id,
      referred_id: referredUserId,
      amount,
      status: auto ? "approved" : "pending",
      source: event,
      sub_order_id: orderId,
      note: event === "signup" ? "Referred creator signed up" : "Referred creator paid for Pro",
      reviewed_at: auto ? new Date().toISOString() : null
    }).select("*").single();
    if (error) return null; // unique index hit = already rewarded
    return data;
  } catch {
    return null;
  }
}
