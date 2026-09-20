import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, getActiveOwnerId } from "@/lib/supabaseAdmin";
import { grossPaise, feePaise, netPaise } from "@/lib/earnings";

export const dynamic = "force-dynamic";

const DAY_MS = 86400000;
// Same set payments/route.js uses for mp_products-backed sales.
const PRODUCT_TYPES = ["event", "locked", "payment", "book"];

// Where "Recent Activity" should send you for each kind of sale.
const HREF_BY_TYPE = {
  course: "/dashboard/courses",
  booking: "/dashboard/bookings",
  event: "/dashboard/events",
  locked: "/dashboard/locked",
  payment: "/dashboard/pages",
  book: "/dashboard/books"
};

const WINDOWS = {
  "7d": { days: 7, prevDays: 7, label: "vs last week" },
  month: { days: 30, prevDays: 30, label: "vs last month" },
  all: { days: null, prevDays: null, label: "" }
};

/** % change from `prev` to `cur`, capped so a 0→N jump doesn't print "Infinity%". */
function pctChange(cur, prev) {
  if (prev <= 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

const nameFrom = (answers) => (answers || []).find((a) => /name/i.test(a.label))?.value || null;

/**
 * Bookings, asking for the commission columns when the DB has them.
 * `revenue_and_covers.sql` adds creator_amount/commission_amount to
 * mp_bookings; before it runs, the richer select errors and the whole stats
 * call used to fail — so fall back to the legacy shape instead.
 */
async function bookingsQuery(ownerId) {
  const base = "session_id, amount, answers, status, starts_at, ends_at, created_at";
  const rich = await supabaseAdmin.from("mp_bookings")
    .select(`${base}, creator_amount, commission_amount`)
    .eq("owner_id", ownerId).order("created_at", { ascending: false });
  if (!rich.error) return rich;
  return supabaseAdmin.from("mp_bookings").select(base)
    .eq("owner_id", ownerId).order("created_at", { ascending: false });
}

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    const ownerId = await getActiveOwnerId(user);

    const url = new URL(req.url);
    const rangeId = WINDOWS[url.searchParams.get("range")] ? url.searchParams.get("range") : "7d";
    const win = WINDOWS[rangeId];

    const now = new Date();
    const from = win.days ? new Date(now.getTime() - win.days * DAY_MS) : new Date("2015-01-01");
    const prevFrom = win.prevDays ? new Date(from.getTime() - win.prevDays * DAY_MS) : null;

    const visitsQuery = supabaseAdmin.from("mp_visits").select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId).gte("created_at", from.toISOString()).lte("created_at", now.toISOString());
    const visitsPrevQuery = prevFrom
      ? supabaseAdmin.from("mp_visits").select("id", { count: "exact", head: true })
          .eq("owner_id", ownerId).gte("created_at", prevFrom.toISOString()).lt("created_at", from.toISOString())
      : Promise.resolve({ count: null });

    const [
      { count: visitsNow },
      { count: visitsPrev },
      { data: purchases },
      { data: bookings },
      { count: coursesTotal },
      { count: coursesUnpublished },
      { count: productsTotal },
      { count: productsUnpublished }
    ] = await Promise.all([
      visitsQuery,
      visitsPrevQuery,
      supabaseAdmin.from("mp_purchases").select("product_type, product_id, amount, creator_amount, commission_amount, answers, created_at")
        .eq("owner_id", ownerId).order("created_at", { ascending: false }),
      bookingsQuery(ownerId),
      supabaseAdmin.from("mp_courses").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
      supabaseAdmin.from("mp_courses").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).neq("status", "published"),
      supabaseAdmin.from("mp_products").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
      supabaseAdmin.from("mp_products").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).neq("status", "published")
    ]);

    const buys = purchases || [];
    const books = (bookings || []).filter((b) => b.status !== "cancelled");

    // Product titles for the recent-activity feed (same lookup payments/route.js uses).
    const courseIds = buys.filter((p) => p.product_type === "course").map((p) => p.product_id);
    const productIds = buys.filter((p) => PRODUCT_TYPES.includes(p.product_type)).map((p) => p.product_id);
    const sessionIds = books.map((b) => b.session_id).filter(Boolean);
    const [{ data: courses }, { data: products }, { data: sessions }] = await Promise.all([
      courseIds.length ? supabaseAdmin.from("mp_courses").select("id,title").in("id", courseIds) : { data: [] },
      productIds.length ? supabaseAdmin.from("mp_products").select("id,title").in("id", productIds) : { data: [] },
      sessionIds.length ? supabaseAdmin.from("mp_sessions").select("id,title,duration_min").in("id", sessionIds) : { data: [] }
    ]);
    const titleOf = (type, id) => {
      if (type === "course") return (courses || []).find((c) => c.id === id)?.title || "Course";
      if (type === "booking") return (sessions || []).find((s) => s.id === id)?.title || "Session";
      return (products || []).find((p) => p.id === id)?.title || "Product";
    };

    // Unified sale events across one-off purchases and bookings.
    //
    // `amount` on a sale event is always the CREATOR'S NET (gross minus the
    // platform commission). The home page's "Revenue" tile was previously a
    // mix: purchases used creator_amount but bookings used the buyer's gross,
    // so the headline number was higher than anything the creator could
    // actually withdraw. lib/earnings.js is now the only thing that decides.
    const toSale = (row, extra) => ({
      created_at: row.created_at,
      gross: grossPaise(row) / 100,
      fee: feePaise(row) / 100,
      amount: netPaise(row) / 100,
      buyerName: nameFrom(row.answers),
      ...extra
    });

    const sales = [
      ...buys.map((p) => toSale(p, {
        title: titleOf(p.product_type, p.product_id),
        href: HREF_BY_TYPE[p.product_type] || "/dashboard/payments"
      })),
      ...books.map((b) => toSale(b, {
        title: titleOf("booking", b.session_id),
        href: HREF_BY_TYPE.booking
      }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const inRange = (s, start, end) => { const t = new Date(s.created_at); return t >= start && t < end; };
    const salesNow = sales.filter((s) => inRange(s, from, now));
    const salesPrev = prevFrom ? sales.filter((s) => inRange(s, prevFrom, from)) : [];
    const sum = (rows, key) => rows.reduce((a, s) => a + (s[key] || 0), 0);
    const revenueNow = sum(salesNow, "amount");
    const revenuePrev = sum(salesPrev, "amount");
    const grossNow = sum(salesNow, "gross");
    const feeNow = sum(salesNow, "fee");

    // Lifetime net — "what you've earned in total", independent of the filter.
    const lifetimeNet = sum(sales, "amount");
    const lifetimeGross = sum(sales, "gross");
    const lifetimeFee = sum(sales, "fee");

    const recentActivity = sales.slice(0, 5).map((s) => ({
      title: "New order received",
      subtitle: `${s.title} — Payment from ${s.buyerName || "a customer"}`,
      amount: s.amount,
      createdAt: s.created_at,
      href: s.href
    }));

    const totalHours = books.reduce((a, b) => {
      const mins = (new Date(b.ends_at) - new Date(b.starts_at)) / 60000;
      return a + (Number.isFinite(mins) ? mins : 0);
    }, 0) / 60;

    return NextResponse.json({
      rangeId,
      rangeLabel: win.label,
      range: { from: from.toISOString(), to: now.toISOString() },
      visits: { value: visitsNow || 0, change: prevFrom ? pctChange(visitsNow || 0, visitsPrev || 0) : null },
      sales: { value: salesNow.length, change: prevFrom ? pctChange(salesNow.length, salesPrev.length) : null },
      // revenue.value = NET of the platform fee, i.e. what the creator keeps.
      revenue: {
        value: revenueNow,
        gross: grossNow,
        fee: feeNow,
        change: prevFrom ? pctChange(revenueNow, revenuePrev) : null
      },
      // Lifetime totals — used for the "total you've earned" line.
      lifetime: { net: lifetimeNet, gross: lifetimeGross, fee: lifetimeFee, sales: sales.length },
      totalProducts: (coursesTotal || 0) + (productsTotal || 0),
      unpublished: (coursesUnpublished || 0) + (productsUnpublished || 0),
      sessions: {
        total: books.length,
        hours: Math.round(totalHours),
        // Net again, so this tile agrees with Payments and Payouts.
        earnings: books.reduce((a, b) => a + netPaise(b), 0) / 100
      },
      recentActivity
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
