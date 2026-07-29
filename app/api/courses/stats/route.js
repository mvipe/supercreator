import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, getActiveOwnerId } from "@/lib/supabaseAdmin";

// Per-course sales + revenue for the signed-in creator (service role — bypasses RLS timing).
export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    const ownerId = await getActiveOwnerId(user);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

    const { data: purchases } = await supabaseAdmin.from("mp_purchases")
      .select("product_id, amount").eq("owner_id", ownerId).eq("product_type", "course");

    const perCourse = {};
    for (const p of purchases || []) {
      perCourse[p.product_id] = perCourse[p.product_id] || { sales: 0, revenue: 0 };
      perCourse[p.product_id].sales += 1;
      perCourse[p.product_id].revenue += ((p.amount || 0) || 0) / 100;
    }
    return NextResponse.json({ perCourse });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
