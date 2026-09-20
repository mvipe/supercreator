import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, isSuperAdmin, isStaff } from "@/lib/supabaseAdmin";
import { netPaise, grossPaise, feePaise } from "@/lib/earnings";

export const dynamic = "force-dynamic";

// Any admin (super or sub-admin) may view/manage creators.
async function requireStaff(req) {
  const user = await getUserFromRequest(req);
  if (!user) return { error: "Please sign in first.", status: 401 };
  if (!(await isStaff(user))) return { error: "Admins only.", status: 403 };
  return { user };
}

// Columns we'd like, in the order we'd like to try them. If the DB is behind
// on a migration, a single missing column used to make the whole select fail
// and the route quietly returned an empty list — which looked exactly like
// "no creators registered". Fall back to a minimal select instead.
// Column sets in decreasing richness. FULL includes is_admin (needs
// subadmin.sql); RICH is everything except that; SAFE is the bare minimum.
const FULL_SELECT = "user_id, username, display_name, full_name, business_name, email, phone_number, blocked, is_super_admin, is_admin, plan, plan_expires_at, created_at";
const RICH_SELECT = "user_id, username, display_name, full_name, business_name, email, phone_number, blocked, is_super_admin, plan, plan_expires_at, created_at";
const SAFE_SELECT = "user_id, username, display_name, created_at";

/**
 * Bookings with their commission split when the DB has those columns
 * (revenue_and_covers.sql), falling back to the legacy shape otherwise.
 */
async function bookingRows() {
  const rich = await supabaseAdmin.from("mp_bookings").select("owner_id, amount, status, creator_amount, commission_amount");
  if (!rich.error) return rich;
  return supabaseAdmin.from("mp_bookings").select("owner_id, amount, status");
}

export async function GET(req) {
  const auth = await requireStaff(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    let warning = null;
    let { data: profiles, error } = await supabaseAdmin.from("mp_profiles")
      .select(FULL_SELECT)
      .order("created_at", { ascending: false });

    if (error) {
      // is_admin probably missing (subadmin.sql not run) — retry without it,
      // then fall back to the minimum so the panel always works.
      let retry = await supabaseAdmin.from("mp_profiles").select(RICH_SELECT).order("created_at", { ascending: false });
      if (retry.error) {
        retry = await supabaseAdmin.from("mp_profiles").select(SAFE_SELECT).order("created_at", { ascending: false });
        if (retry.error) throw retry.error;
        warning = `Some profile columns are missing (${error.message}). Run supabase/fix-pack.sql — showing limited data.`;
      }
      profiles = retry.data;
    }

    profiles = profiles || [];

    // Revenue per creator (purchases + bookings). Select the columns we
    // actually read — creator_amount was being read but never selected, so
    // every creator silently fell back to gross.
    const [{ data: purchases }, { data: bookings }, { data: courses }, { data: products }] = await Promise.all([
      supabaseAdmin.from("mp_purchases").select("owner_id, amount, creator_amount, commission_amount"),
      bookingRows(),
      supabaseAdmin.from("mp_courses").select("owner_id, status"),
      supabaseAdmin.from("mp_products").select("owner_id, status")
    ]);

    const rev = {}, gross = {}, fee = {}, sales = {};
    const add = (id, row) => {
      rev[id] = (rev[id] || 0) + netPaise(row);
      gross[id] = (gross[id] || 0) + grossPaise(row);
      fee[id] = (fee[id] || 0) + feePaise(row);
      sales[id] = (sales[id] || 0) + 1;
    };
    for (const p of purchases || []) add(p.owner_id, p);
    for (const b of bookings || []) if (b.status !== "cancelled") add(b.owner_id, b);

    // How much is actually ON each store — the admin needs to tell a real
    // storefront apart from an empty signup.
    const live = {}, drafts = {};
    for (const x of [...(courses || []), ...(products || [])]) {
      if (x.status === "published") live[x.owner_id] = (live[x.owner_id] || 0) + 1;
      else drafts[x.owner_id] = (drafts[x.owner_id] || 0) + 1;
    }

    const now = new Date();
    const rows = profiles.map((p) => ({
      ...p,
      revenue: (rev[p.user_id] || 0) / 100,
      grossRevenue: (gross[p.user_id] || 0) / 100,
      platformFee: (fee[p.user_id] || 0) / 100,
      sales: sales[p.user_id] || 0,
      // A "store" exists once the creator has claimed a username — that's the
      // public URL buyers visit.
      store: p.username
        ? {
            name: p.business_name || p.display_name || p.full_name || `@${p.username}`,
            username: p.username,
            url: `/u/${p.username}`,
            liveProducts: live[p.user_id] || 0,
            draftProducts: drafts[p.user_id] || 0
          }
        : null,
      isPro: (p.plan === "pro" && p.plan_expires_at && new Date(p.plan_expires_at) > now) || !!p.is_admin || !!p.is_super_admin
    }));

    const storeRows = rows.filter((r) => r.store);

    return NextResponse.json({
      creators: rows,
      total: rows.length,
      // Store roll-up for the panel header.
      stores: {
        total: storeRows.length,
        withProducts: storeRows.filter((r) => r.store.liveProducts > 0).length,
        list: storeRows.map((r) => ({ userId: r.user_id, ...r.store, revenue: r.revenue }))
      },
      warning
    }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Grant / revoke free Pro access for a creator (manual comp — no payment).
// Pro = plan "pro" with a far-future expiry; revoke = back to "free".
export async function PATCH(req) {
  const auth = await requireStaff(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const { userId, pro, subadmin } = await req.json();
    if (!userId) return NextResponse.json({ error: "Missing userId." }, { status: 400 });

    // Promoting / demoting a sub-admin is a SUPER-admin-only action (a sub-admin
    // has full access but can't create other admins). A promoted sub-admin also
    // gets free Pro.
    if (subadmin !== undefined) {
      if (!(await isSuperAdmin(auth.user))) return NextResponse.json({ error: "Only a super admin can manage admins." }, { status: 403 });
      const update = subadmin
        ? { is_admin: true, plan: "pro", plan_expires_at: new Date(Date.now() + 100 * 365 * 86400000).toISOString() }
        : { is_admin: false };
      const { data, error } = await supabaseAdmin.from("mp_profiles")
        .update(update).eq("user_id", userId).select("user_id, is_admin");
      if (error) throw error;
      if (!data?.length) return NextResponse.json({ error: "Creator not found." }, { status: 404 });
      return NextResponse.json({ ok: true, isAdmin: !!data[0].is_admin });
    }

    const update = pro
      ? { plan: "pro", plan_expires_at: new Date(Date.now() + 100 * 365 * 86400000).toISOString() }
      : { plan: "free", plan_expires_at: null };
    const { data, error } = await supabaseAdmin.from("mp_profiles")
      .update(update).eq("user_id", userId).select("user_id, plan, plan_expires_at");
    if (error) throw error;
    if (!data?.length) return NextResponse.json({ error: "Creator not found." }, { status: 404 });
    return NextResponse.json({ ok: true, plan: data[0].plan, isPro: !!pro });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Block / unblock a creator.
export async function POST(req) {
  const auth = await requireStaff(req);
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