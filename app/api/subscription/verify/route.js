import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";
import { grantPro, isProProfile, PLAN_DAYS } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Incomplete payment details." }, { status: 400 });
    }

    // 1. Signature check — never trust the client.
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    const ok = expected.length === razorpay_signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature));
    if (!ok) return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });

    // 2. The order must be ours.
    const { data: order, error: orderErr } = await supabaseAdmin.from("mp_sub_orders").select("*")
      .eq("razorpay_order_id", razorpay_order_id).eq("user_id", user.id).maybeSingle();
    if (orderErr) throw orderErr;
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    // 3. Idempotency: a replay of an order we already *applied* is a no-op.
    //    An order marked paid but never applied still needs granting — that's
    //    exactly the case that used to strand people on the free plan.
    if (order.status === "paid" && order.applied_at) {
      const { data: prof } = await supabaseAdmin.from("mp_profiles")
        .select("plan, plan_expires_at").eq("user_id", user.id).maybeSingle();
      if (isProProfile(prof)) {
        return NextResponse.json({ ok: true, plan: "pro", planExpiresAt: prof.plan_expires_at, alreadyApplied: true });
      }
    }

    // 4. Grant Pro FIRST. If this throws we leave the order un-applied so a
    //    retry (or /api/me's reconcile) can pick it up — money is never taken
    //    without the plan eventually landing.
    const { plan, planExpiresAt } = await grantPro(user, { days: PLAN_DAYS });

    // 5. Only now mark the order settled.
    const { error: updErr } = await supabaseAdmin.from("mp_sub_orders").update({
      status: "paid",
      razorpay_payment_id,
      applied_at: new Date().toISOString()
    }).eq("id", order.id);
    if (updErr) throw updErr;

    return NextResponse.json({ ok: true, plan, planExpiresAt });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}