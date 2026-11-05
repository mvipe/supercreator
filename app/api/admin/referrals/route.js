import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, isStaff } from "@/lib/supabaseAdmin";
import { getReferralSettings, REFERRAL_DEFAULTS } from "@/lib/referrals";

export const dynamic = "force-dynamic";

// =============================================================
// Admin → Refer & Earn.
// GET  ?status=pending|approved|rejected|all
//   -> { settings, stats, rewards[], referrers[] }
// POST { action: "settings", settings }
//      { action: "review", id, status: "approved"|"rejected", note? }
//      { action: "manual", userId, amount (₹), note? }
//      { action: "creator", userId, disabled }
//      { action: "delete", id }
// =============================================================

async function requireStaff(req) {
  const user = await getUserFromRequest(req);
  if (!user) return { error: "Please sign in first.", status: 401 };
  if (!(await isStaff(user))) return { error: "Admins only.", status: 403 };
  return { user };
}

const nameOf = (p) => p ? (p.full_name || p.display_name || p.business_name || (p.username ? `@${p.username}` : "Creator")) : "—";

export async function GET(req) {
  const auth = await requireStaff(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const status = new URL(req.url).searchParams.get("status") || "pending";
    const settings = await getReferralSettings();
    if (!settings.migrated) {
      return NextResponse.json({ settings, migrated: false, stats: null, rewards: [], referrers: [],
        warning: "Run supabase/referrals.sql in the Supabase SQL editor to switch on Refer & Earn." });
    }

    const [{ data: all }, { data: referredProfiles }] = await Promise.all([
      supabaseAdmin.from("mp_referral_rewards").select("*").order("created_at", { ascending: false }).limit(2000),
      supabaseAdmin.from("mp_profiles").select("user_id, referred_by, plan, plan_expires_at").not("referred_by", "is", null)
    ]);

    // Referral counts per code.
    const now = new Date();
    const byCode = {};
    for (const p of referredProfiles || []) {
      const c = String(p.referred_by || "").toUpperCase();
      if (!c) continue;
      const x = byCode[c] || (byCode[c] = { referred: 0, pro: 0 });
      x.referred += 1;
      if (p.plan === "pro" && (!p.plan_expires_at || new Date(p.plan_expires_at) > now)) x.pro += 1;
    }
    const codes = Object.keys(byCode);

    const ids = new Set();
    for (const r of all || []) { ids.add(r.referrer_id); if (r.referred_id) ids.add(r.referred_id); }
    const { data: codeOwners } = codes.length
      ? await supabaseAdmin.from("mp_profiles").select("user_id, referral_code").in("referral_code", codes)
      : { data: [] };
    for (const o of codeOwners || []) ids.add(o.user_id);

    const idList = [...ids];
    const { data: profs } = idList.length
      ? await supabaseAdmin.from("mp_profiles")
          .select("user_id, username, display_name, full_name, business_name, referral_code, referral_disabled, blocked")
          .in("user_id", idList)
      : { data: [] };
    const P = Object.fromEntries((profs || []).map((p) => [p.user_id, p]));

    // Leaderboard of referrers.
    const refMap = {};
    const touch = (uid) => refMap[uid] || (refMap[uid] = { userId: uid, referred: 0, pro: 0, approved: 0, pending: 0, rejected: 0 });
    for (const o of codeOwners || []) {
      const x = touch(o.user_id);
      const c = byCode[String(o.referral_code).toUpperCase()] || { referred: 0, pro: 0 };
      x.referred = c.referred; x.pro = c.pro;
    }
    for (const r of all || []) touch(r.referrer_id)[r.status] += r.amount;
    const referrers = Object.values(refMap).map((x) => {
      const p = P[x.userId];
      return {
        ...x,
        approved: x.approved / 100, pending: x.pending / 100, rejected: x.rejected / 100,
        name: nameOf(p), username: p?.username || null, code: p?.referral_code || "",
        disabled: !!p?.referral_disabled, blocked: !!p?.blocked
      };
    }).sort((a, b) => b.referred - a.referred || b.approved - a.approved);

    const list = (all || []).filter((r) => status === "all" || r.status === status).slice(0, 500).map((r) => ({
      ...r,
      amount: r.amount / 100,
      referrer: { id: r.referrer_id, name: nameOf(P[r.referrer_id]), username: P[r.referrer_id]?.username || null },
      referred: r.referred_id ? { id: r.referred_id, name: nameOf(P[r.referred_id]), username: P[r.referred_id]?.username || null } : null
    }));

    const sum = (st) => (all || []).filter((r) => r.status === st).reduce((n, r) => n + r.amount, 0) / 100;
    const stats = {
      referredCreators: (referredProfiles || []).length,
      activeReferrers: referrers.filter((r) => r.referred > 0).length,
      pendingCount: (all || []).filter((r) => r.status === "pending").length,
      pending: sum("pending"),
      approved: sum("approved")
    };

    return NextResponse.json({ settings, migrated: true, stats, rewards: list, referrers }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await requireStaff(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const b = await req.json();
    const now = new Date().toISOString();

    if (b.action === "settings") {
      const s = { ...REFERRAL_DEFAULTS, ...(b.settings || {}) };
      if (!["signup", "first_pro", "every_pro"].includes(s.trigger)) return NextResponse.json({ error: "Invalid trigger." }, { status: 400 });
      if (!["flat", "percent"].includes(s.reward_type)) return NextResponse.json({ error: "Invalid reward type." }, { status: 400 });
      const rewardRupees = Number(b.settings?.reward_rupees ?? Number(s.reward_amount) / 100);
      const pct = Number(s.reward_percent);
      if (s.reward_type === "flat" && (!Number.isFinite(rewardRupees) || rewardRupees < 0 || rewardRupees > 100000)) return NextResponse.json({ error: "Reward must be between ₹0 and ₹1,00,000." }, { status: 400 });
      if (s.reward_type === "percent" && (!Number.isFinite(pct) || pct < 0 || pct > 100)) return NextResponse.json({ error: "Percentage must be 0–100." }, { status: 400 });
      if (s.reward_type === "percent" && s.trigger === "signup") return NextResponse.json({ error: "A % reward needs a Pro payment — pick a Pro trigger or a flat amount." }, { status: 400 });

      const row = {
        id: 1,
        enabled: !!s.enabled,
        trigger: s.trigger,
        reward_type: s.reward_type,
        reward_amount: Math.round(rewardRupees * 100),
        reward_percent: pct,
        auto_approve: !!s.auto_approve,
        max_rewards_per_user: Math.max(0, Math.round(Number(s.max_rewards_per_user) || 0)),
        headline: String(s.headline || "").slice(0, 120) || REFERRAL_DEFAULTS.headline,
        terms: String(s.terms || "").slice(0, 4000),
        updated_at: now,
        updated_by: auth.user.id
      };
      const { error } = await supabaseAdmin.from("mp_referral_settings").upsert(row, { onConflict: "id" });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (b.action === "review") {
      if (!b.id || !["approved", "rejected", "pending"].includes(b.status)) return NextResponse.json({ error: "Invalid update." }, { status: 400 });
      const patch = { status: b.status, reviewed_at: now, reviewed_by: auth.user.id };
      if (b.note !== undefined) patch.note = String(b.note || "");
      const { error } = await supabaseAdmin.from("mp_referral_rewards").update(patch).eq("id", b.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (b.action === "manual") {
      const paise = Math.round(Number(b.amount) * 100);
      if (!b.userId) return NextResponse.json({ error: "Pick a creator." }, { status: 400 });
      if (!Number.isFinite(paise) || paise <= 0) return NextResponse.json({ error: "Enter an amount above ₹0." }, { status: 400 });
      const { error } = await supabaseAdmin.from("mp_referral_rewards").insert({
        referrer_id: b.userId, amount: paise, status: "approved", source: "manual",
        note: String(b.note || "Manual referral bonus"), reviewed_at: now, reviewed_by: auth.user.id
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (b.action === "creator") {
      if (!b.userId) return NextResponse.json({ error: "Missing userId." }, { status: 400 });
      const { error } = await supabaseAdmin.from("mp_profiles").update({ referral_disabled: !!b.disabled }).eq("user_id", b.userId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (b.action === "delete") {
      if (!b.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
      const { error } = await supabaseAdmin.from("mp_referral_rewards").delete().eq("id", b.id).neq("status", "approved");
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
