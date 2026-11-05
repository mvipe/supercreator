import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, getActiveOwnerId } from "@/lib/supabaseAdmin";
import { getReferralSettings, describeOffer } from "@/lib/referrals";

export const dynamic = "force-dynamic";

// Creator-side Refer & Earn: the current offer (as set by the admin), the
// creator's code, who they've referred, and what they've earned.
export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    const ownerId = await getActiveOwnerId(user);

    const s = await getReferralSettings();
    const { data: prof } = await supabaseAdmin.from("mp_profiles")
      .select("referral_code, referral_disabled").eq("user_id", ownerId).maybeSingle();
    const code = prof?.referral_code || "";

    const program = {
      enabled: !!s.enabled,
      headline: s.headline,
      terms: s.terms,
      offer: describeOffer(s),
      trigger: s.trigger,
      rewardType: s.reward_type,
      rewardAmount: Number(s.reward_amount) / 100,
      rewardPercent: Number(s.reward_percent),
      autoApprove: !!s.auto_approve,
      maxRewards: Number(s.max_rewards_per_user) || 0
    };

    let referred = [];
    if (code) {
      const { data } = await supabaseAdmin.from("mp_profiles")
        .select("user_id, display_name, full_name, username, plan, plan_expires_at, created_at")
        .ilike("referred_by", code).order("created_at", { ascending: false }).limit(500);
      const now = new Date();
      referred = (data || []).map((p) => ({
        name: p.full_name || p.display_name || (p.username ? `@${p.username}` : "New creator"),
        username: p.username || null,
        joinedAt: p.created_at,
        isPro: p.plan === "pro" && (!p.plan_expires_at || new Date(p.plan_expires_at) > now)
      }));
    }

    const { data: rewards } = await supabaseAdmin.from("mp_referral_rewards")
      .select("id, amount, status, source, note, created_at, referred_id")
      .eq("referrer_id", ownerId).order("created_at", { ascending: false }).limit(200);

    const sum = (st) => (rewards || []).filter((r) => r.status === st).reduce((n, r) => n + r.amount, 0) / 100;

    return NextResponse.json({
      program,
      blocked: !!prof?.referral_disabled,
      code,
      referred,
      rewards: (rewards || []).map((r) => ({ ...r, amount: r.amount / 100 })),
      totals: { approved: sum("approved"), pending: sum("pending"), referred: referred.length, pro: referred.filter((r) => r.isPro).length }
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
