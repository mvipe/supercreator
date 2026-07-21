import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, isSuperAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function requireSuper(req) {
  const user = await getUserFromRequest(req);
  if (!user) return { error: "Please sign in first.", status: 401 };
  if (!(await isSuperAdmin(user))) return { error: "Super admins only.", status: 403 };
  return { user };
}

// Columns we'd like, in the order we'd like to try them. If the DB is behind
// on a migration, a single missing column used to make the whole select fail
// and the route quietly returned an empty list — which looked exactly like
// "no creators registered". Fall back to a minimal select instead.
const FULL_SELECT = "user_id, username, display_name, full_name, business_name, email, phone_number, blocked, is_super_admin, plan, plan_expires_at, created_at";
const SAFE_SELECT = "user_id, username, display_name, created_at";

export async function GET(req) {
  const auth = await requireSuper(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    let warning = null;
    let { data: profiles, error } = await supabaseAdmin.from("mp_profiles")
      .select(FULL_SELECT)
      .order("created_at", { ascending: false });

    if (error) {
      // Most likely an undefined column (42703). Retry with the minimum set so
      // the panel still works, and tell the admin what's wrong.
      const retry = await supabaseAdmin.from("mp_profiles")
        .select(SAFE_SELECT)
        .order("created_at", { ascending: false });
      if (retry.error) throw retry.error;
      profiles = retry.data;
      warning = `Some profile columns are missing (${error.message}). Run supabase/fix-pack.sql — showing limited data.`;
    }

    profiles = profiles || [];

    // Revenue per creator (purchases + bookings). Select the columns we
    // actually read — creator_amount was being read but never selected, so
    // every creator silently fell back to gross.
    const [{ data: purchases }, { data: bookings }] = await Promise.all([
      supabaseAdmin.from("mp_purchases").select("owner_id, amount, creator_amount"),
      supabaseAdmin.from("mp_bookings").select("owner_id, amount, status")
    ]);

    const rev = {};
    for (const p of purchases || []) {
      rev[p.owner_id] = (rev[p.owner_id] || 0) + ((p.creator_amount != null ? p.creator_amount : p.amount) || 0);
    }
    for (const b of bookings || []) {
      if (b.status !== "cancelled") rev[b.owner_id] = (rev[b.owner_id] || 0) + (b.amount || 0);
    }

    const now = new Date();
    const rows = profiles.map((p) => ({
      ...p,
      revenue: (rev[p.user_id] || 0) / 100,
      isPro: p.plan === "pro" && p.plan_expires_at && new Date(p.plan_expires_at) > now
    }));

    return NextResponse.json({ creators: rows, total: rows.length, warning }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Block / unblock a creator.
export async function POST(req) {
  const auth = await requireSuper(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const { userId, blocked } = await req.json();
    if (!userId) return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    if (userId === auth.user.id) return NextResponse.json({ error: "You can't block yourself." }, { status: 400 });

    const { data: target } = await supabaseAdmin.from("mp_profiles").select("is_super_admin").eq("user_id", userId).maybeSingle();
    if (target?.is_super_admin) return NextResponse.json({ error: "Can't block another super admin." }, { status: 400 });

    const { data, error } = await supabaseAdmin.from("mp_profiles")
      .update({ blocked: !!blocked }).eq("user_id", userId).select("user_id, blocked");
    if (error) throw error;
    if (!data?.length) return NextResponse.json({ error: "Creator not found." }, { status: 404 });

    // Also revoke active sessions when blocking so they're kicked out.
    if (blocked) { try { await supabaseAdmin.auth.admin.signOut(userId, "global"); } catch {} }

    return NextResponse.json({ ok: true, blocked: !!data[0].blocked });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}