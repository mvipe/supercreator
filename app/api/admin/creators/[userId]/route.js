import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, isStaff } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Detailed stats for one creator — courses & products with per-item sales and
// revenue, plus bookings and lifetime totals. Super-admins only.
export async function GET(req, { params }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!(await isStaff(user))) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const userId = params.userId;
  try {
    const [{ data: profile }, { data: courses }, { data: products }, { data: purchases }, { data: bookings }] = await Promise.all([
      supabaseAdmin.from("mp_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("mp_courses").select("id, title, status, pricing, modules, created_at").eq("owner_id", userId),
      supabaseAdmin.from("mp_products").select("id, type, title, status, created_at").eq("owner_id", userId),
      supabaseAdmin.from("mp_purchases").select("product_type, product_id, amount, creator_amount").eq("owner_id", userId),
      supabaseAdmin.from("mp_bookings").select("amount, status").eq("owner_id", userId)
    ]);

    if (!profile) return NextResponse.json({ error: "Creator not found." }, { status: 404 });

    // Sales + net revenue (creator_amount) per product.
    const byProduct = {};
    for (const p of purchases || []) {
      const key = `${p.product_type}:${p.product_id}`;
      const e = byProduct[key] || { sales: 0, revenue: 0 };
      e.sales += 1;
      e.revenue += (p.creator_amount != null ? p.creator_amount : p.amount) || 0;
      byProduct[key] = e;
    }

    const lessonCount = (c) => (c.modules || []).reduce((n, m) => n + (m.lessons?.filter((l) => l.published !== false).length || 0), 0);

    const courseRows = (courses || []).map((c) => {
      const s = byProduct[`course:${c.id}`] || { sales: 0, revenue: 0 };
      return { id: c.id, title: c.title || "Untitled course", status: c.status, lessons: lessonCount(c), sales: s.sales, revenue: s.revenue / 100 };
    }).sort((a, b) => b.revenue - a.revenue);

    const productRows = (products || []).map((x) => {
      const s = byProduct[`${x.type}:${x.id}`] || { sales: 0, revenue: 0 };
      return { id: x.id, type: x.type, title: x.title || "Untitled", status: x.status, sales: s.sales, revenue: s.revenue / 100 };
    }).sort((a, b) => b.revenue - a.revenue);

    let bookingSales = 0, bookingRevenue = 0;
    for (const b of bookings || []) {
      if (b.status !== "cancelled") { bookingSales += 1; bookingRevenue += (b.amount || 0); }
    }

    const productRevenue = [...courseRows, ...productRows].reduce((n, r) => n + r.revenue, 0);
    const productSales = [...courseRows, ...productRows].reduce((n, r) => n + r.sales, 0);

    const now = new Date();
    return NextResponse.json({
      creator: {
        userId,
        name: profile.full_name || profile.display_name || profile.business_name || (profile.username ? `@${profile.username}` : "Creator"),
        username: profile.username || null,
        email: profile.email || null,
        phone: profile.phone_number || null,
        businessName: profile.business_name || null,
        plan: profile.plan || "free",
        isPro: profile.plan === "pro" && profile.plan_expires_at && new Date(profile.plan_expires_at) > now,
        blocked: !!profile.blocked,
        createdAt: profile.created_at || null
      },
      totals: {
        courses: courseRows.length,
        products: productRows.length,
        totalSales: productSales + bookingSales,
        totalRevenue: productRevenue + bookingRevenue / 100,
        bookingSales,
        bookingRevenue: bookingRevenue / 100
      },
      courses: courseRows,
      products: productRows
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
