import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { productChargeRupees, findProductCoupon } from "@/lib/products";

// Public price quote so the checkout modal can show the live total
// (base price, coupon discount, PWYW) before payment.
export async function POST(req) {
  try {
    const { productType, productId, coupon, pwywAmount } = await req.json();

    if (productType === "course") {
      const { data: c } = await supabaseAdmin.from("mp_courses").select("pricing,settings").eq("id", productId).eq("status", "published").maybeSingle();
      if (!c) return NextResponse.json({ error: "Not found." }, { status: 404 });
      const pr = c.pricing || {};
      let base;
      if (pr.mode === "free") base = 0;
      else if (pr.mode === "pwyw") base = Math.max(Number(pr.minPrice) || 1, Number(pwywAmount) || 0);
      else base = pr.discountEnabled && Number(pr.discountPrice) > 0 ? Number(pr.discountPrice) : Number(pr.price) || 0;

      let final = base, applied = null, couponError = null;
      if (coupon && base > 0) {
        const found = (c.settings?.coupons || []).find((x) => x.code === String(coupon).toUpperCase() && x.active);
        if (!found) couponError = "That coupon code isn't valid.";
        else { final = Math.round(base * (1 - found.percentOff / 100)); applied = found.code; }
      }
      return NextResponse.json({ base, final, applied, couponError });
    }

    // Products (book/event/locked/payment): honour discount, pwyw AND coupons.
    const { data: p } = await supabaseAdmin.from("mp_products").select("type,data").eq("id", productId).eq("status", "published").maybeSingle();
    if (p) {
      const d = p.data || {};
      const base = Math.round(productChargeRupees(p.type, d, { pwywAmount }));
      let final = base, applied = null, couponError = null;
      if (coupon && base > 0) {
        const found = findProductCoupon(d, coupon);
        if (!found) couponError = "That coupon code isn't valid.";
        else { final = Math.round(base * (1 - found.percentOff / 100)); applied = found.code; }
      }
      return NextResponse.json({ base, final, applied, couponError });
    }
    const { data: s } = await supabaseAdmin.from("mp_sessions").select("price").eq("id", productId).maybeSingle();
    if (s) return NextResponse.json({ base: Number(s.price) || 0, final: Number(s.price) || 0, applied: null, couponError: null });

    return NextResponse.json({ error: "Not found." }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
