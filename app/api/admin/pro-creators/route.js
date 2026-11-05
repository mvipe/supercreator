import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, isStaff } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// =============================================================
// Pro Creators — every creator who is (or was) on the Pro plan, where that
// Pro came from (paid subscription / admin comp / staff), when it ends, and
// what they've paid the platform. Staff only.
//
// GET   -> { creators[], stats }
// PATCH -> { userId, action: "extend" | "set" | "grant" | "revoke", days?, expiresAt? }
// =============================================================

const LIFETIME_MS = 100 * 365 * 86400000;
const COMP_THRESHOLD_MS = 50 * 365 * 86400000; // expiry this far out = a manual grant

async function requireStaff(req) {
  const user = await getUserFromRequest(req);
  if (!user) return { error: "Please sign in first.", status: 401 };
  if (!(await isStaff(user))) return { error: "Admins only.", status: 403 };
  return { user };
}

const SELECTS = [
  "user_id, username, display_name, full_name, business_name, email, phone_number, plan, plan_expires_at, is_admin, is_super_admin, blocked, created_at",
  "user_id, username, display_name, full_name, business_name, email, phone_number, plan, plan_expires_at, is_super_admin, blocked, created_at",
  "user_id, username, display_name, plan, plan_expires_at, created_at"
];

async function loadProfiles() {
  let lastErr;
  for (const sel of SELECTS) {
    const { data, error } = await supabaseAdmin.from("mp_profiles").select(sel).order("created_at", { ascending: false });
    if (!error) return data || [];
    lastErr = error;
  }
  throw lastErr;
}

export async function GET(req) {
  const auth = await requireStaff(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const profiles = await loadProfiles();
    const { data: orders } = await supabaseAdmin.from("mp_sub_orders")
      .select("user_id, amount, status, created_at").eq("status", "paid");

    const paid = {};
    for (const o of orders || []) {
      const p = paid[o.user_id] || (paid[o.user_id] = { count: 0, total: 0, first: o.created_at, last: o.created_at });
      p.count += 1;
      p.total += Number(o.amount || 0);
      if (o.created_at < p.first) p.first = o.created_at;
      if (o.created_at > p.last) p.last = o.created_at;
    }

    const now = Date.now();
    const rows = [];
    for (const p of profiles) {
      const staff = !!p.is_admin || !!p.is_super_admin || p.plan === "admin" || p.plan === "superadmin";
      const exp = p.plan_expires_at ? new Date(p.plan_expires_at).getTime() : null;
      const onPro = p.plan === "pro";
      const active = staff || (onPro && (exp === null || exp > now));
      const expired = onPro && exp !== null && exp <= now && !staff;
      const pay = paid[p.user_id];
      // Include anyone currently Pro, anyone whose Pro lapsed, and anyone who
      // has ever paid (they may have been downgraded to free).
      if (!active && !expired && !pay) continue;

      let source = "paid";
      if (staff) source = "staff";
      else if (onPro && (exp === null || exp - now > COMP_THRESHOLD_MS)) source = "comp";
      else if (!pay) source = "comp";

      rows.push({
        userId: p.user_id,
        name: p.full_name || p.display_name || p.business_name || (p.username ? `@${p.username}` : "Creator"),
        username: p.username || null,
        email: p.email || null,
        phone: p.phone_number || null,
        blocked: !!p.blocked,
        plan: p.plan || "free",
        status: active ? "active" : "expired",
        source,
        lifetime: source === "comp" && (exp === null || exp - now > COMP_THRESHOLD_MS),
        expiresAt: p.plan_expires_at || null,
        daysLeft: active && exp && exp - now < COMP_THRESHOLD_MS ? Math.ceil((exp - now) / 86400000) : null,
        payments: pay?.count || 0,
        paidTotal: (pay?.total || 0) / 100,
        firstPaidAt: pay?.first || null,
        lastPaidAt: pay?.last || null,
        joinedAt: p.created_at
      });
    }

    rows.sort((a, b) => (a.status === b.status ? (b.lastPaidAt || "").localeCompare(a.lastPaidAt || "") : a.status === "active" ? -1 : 1));

    const active = rows.filter((r) => r.status === "active");
    const stats = {
      active: active.length,
      paid: active.filter((r) => r.source === "paid").length,
      comp: active.filter((r) => r.source === "comp").length,
      staff: active.filter((r) => r.source === "staff").length,
      expiringSoon: active.filter((r) => r.daysLeft !== null && r.daysLeft <= 7).length,
      expired: rows.filter((r) => r.status === "expired").length,
      revenue: rows.reduce((n, r) => n + r.paidTotal, 0)
    };

    return NextResponse.json({ creators: rows, stats }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  const auth = await requireStaff(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { userId, action, days, expiresAt } = await req.json();
    if (!userId) return NextResponse.json({ error: "Missing userId." }, { status: 400 });

    const { data: prof } = await supabaseAdmin.from("mp_profiles")
      .select("plan, plan_expires_at").eq("user_id", userId).maybeSingle();
    if (!prof) return NextResponse.json({ error: "Creator not found." }, { status: 404 });

    let update;
    if (action === "revoke") {
      update = { plan: "free", plan_expires_at: null };
    } else if (action === "set") {
      const d = new Date(expiresAt);
      if (!expiresAt || Number.isNaN(d.getTime())) return NextResponse.json({ error: "Pick a valid expiry date." }, { status: 400 });
      d.setHours(23, 59, 59, 999);
      update = { plan: "pro", plan_expires_at: d.toISOString() };
    } else if (action === "extend" || action === "grant") {
      if (days === "lifetime") {
        update = { plan: "pro", plan_expires_at: new Date(Date.now() + LIFETIME_MS).toISOString() };
      } else {
        const n = Math.round(Number(days));
        if (!Number.isFinite(n) || n < 1 || n > 3650) return NextResponse.json({ error: "Days must be between 1 and 3650." }, { status: 400 });
        // Extend from the later of now and the current expiry.
        const cur = prof.plan === "pro" && prof.plan_expires_at ? new Date(prof.plan_expires_at) : null;
        const base = cur && cur > new Date() ? cur : new Date();
        base.setDate(base.getDate() + n);
        update = { plan: "pro", plan_expires_at: base.toISOString() };
      }
    } else {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from("mp_profiles")
      .update(update).eq("user_id", userId).select("plan, plan_expires_at");
    if (error) throw error;
    if (!data?.length) return NextResponse.json({ error: "Creator not found." }, { status: 404 });
    return NextResponse.json({ ok: true, plan: data[0].plan, planExpiresAt: data[0].plan_expires_at });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
