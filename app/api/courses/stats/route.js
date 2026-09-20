import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, getActiveOwnerId } from "@/lib/supabaseAdmin";
import { netPaise, grossPaise, feePaise } from "@/lib/earnings";

// Per-course sales + revenue for the signed-in creator (service role — bypasses RLS timing).
export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    const ownerId = await getActiveOwnerId(user);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

    const { data: purchases } = await supabaseAdmin.from("mp_purchases")
      .select("product_id, amount, creator_amount, commission_amount")
      .eq("owner_id", ownerId).eq("product_type", "course");

    // `revenue` is the creator's NET (gross minus the platform fee) — the old
    // version summed the buyer's gross, so course revenue read higher here
    // than it did on Payments and Payouts for the same sales.
    const perCourse = {};
    for (const p of purchases || []) {
      perCourse[p.product_id] = perCourse[p.product_id] || { sales: 0, revenue: 0, gross: 0, fee: 0 };
      perCourse[p.product_id].sales += 1;
      perCourse[p.product_id].revenue += netPaise(p) / 100;
      perCourse[p.product_id].gross += grossPaise(p) / 100;
      perCourse[p.product_id].fee += feePaise(p) / 100;
    }
    return NextResponse.json({ perCourse });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
