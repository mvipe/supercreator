import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, isStaff } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Creator earnings leaderboard for a chosen window. Super-admins only.
// range: today | yesterday | 7d | month | year | custom (+ from/to)

function windowFor(range, fromP, toP) {
  if (range === "yesterday") {
    const s = new Date(); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() - 1);
    const e = new Date(s); e.setDate(e.getDate() + 1);
    return { from: s, to: e };
  }
  if (range === "custom") {
    const s = fromP ? new Date(fromP) : new Date(Date.now() - 30 * 86400000);
    const e = toP ? new Date(toP) : new Date();
    s.setHours(0, 0, 0, 0); e.setHours(23, 59, 59, 999);
    return { from: s <= e ? s : e, to: s <= e ? e : s };
  }
  const to = new Date();
  let from = new Date();
  if (range === "today") from.setHours(0, 0, 0, 0);
  else if (range === "7d") from = new Date(Date.now() - 7 * 86400000);
  else if (range === "year") from = new Date(Date.now() - 365 * 86400000);
  else from = new Date(Date.now() - 30 * 86400000); // "month" / default
  return { from, to };
}

export async function GET(req) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!(await isStaff(user))) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  try {
    const url = new URL(req.url);
    const range = url.searchParams.get("range") || "today";
    const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get("limit")) || 10));
    const { from, to } = windowFor(range, url.searchParams.get("from"), url.searchParams.get("to"));
    const iso = from.toISOString(), isoTo = to.toISOString();

    const [{ data: purchases }, { data: bookings }] = await Promise.all([
      supabaseAdmin.from("mp_purchases").select("owner_id, amount, creator_amount, created_at").gte("created_at", iso).lte("created_at", isoTo),
      supabaseAdmin.from("mp_bookings").select("owner_id, amount, status, created_at").gte("created_at", iso).lte("created_at", isoTo)
    ]);

    const earn = {}, sales = {};
    for (const p of purchases || []) {
      earn[p.owner_id] = (earn[p.owner_id] || 0) + ((p.creator_amount != null ? p.creator_amount : p.amount) || 0);
      sales[p.owner_id] = (sales[p.owner_id] || 0) + 1;
    }
    for (const b of bookings || []) {
      if (b.status === "cancelled") continue;
      earn[b.owner_id] = (earn[b.owner_id] || 0) + (b.amount || 0);
      sales[b.owner_id] = (sales[b.owner_id] || 0) + 1;
    }

    const ids = Object.keys(earn);
    const names = {};
    if (ids.length) {
      const { data: profs } = await supabaseAdmin.from("mp_profiles")
        .select("user_id, username, display_name, full_name, business_name").in("user_id", ids);
      for (const p of profs || []) names[p.user_id] = p;
    }

    const rows = ids.map((id) => {
      const p = names[id] || {};
      return {
        userId: id,
        name: p.full_name || p.display_name || p.business_name || (p.username ? `@${p.username}` : "Creator"),
        username: p.username || null,
        earnings: (earn[id] || 0) / 100,
        sales: sales[id] || 0
      };
    }).sort((a, b) => b.earnings - a.earnings).slice(0, limit);

    const totalEarnings = rows.reduce((n, r) => n + r.earnings, 0);
    return NextResponse.json({ range, from: iso, to: isoTo, count: rows.length, totalEarnings, rows },
      { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
