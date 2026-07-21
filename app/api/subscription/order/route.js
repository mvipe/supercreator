import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";
import { ensureProfile, isProProfile, reconcilePro } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

    // Make sure the profile exists BEFORE taking money, so the grant on the
    // way back out can never no-op.
    const prof = await ensureProfile(user);

    // Someone who already paid but was stranded on free shouldn't be charged
    // twice — settle it here and short-circuit.
    try { await reconcilePro(user, prof); } catch { /* non-fatal */ }

    const { data: fresh } = await supabaseAdmin.from("mp_profiles")
      .select("plan, plan_expires_at").eq("user_id", user.id).maybeSingle();
    if (isProProfile(fresh)) {
      return NextResponse.json({ alreadyPro: true, planExpiresAt: fresh.plan_expires_at });
    }

    const { data: settings } = await supabaseAdmin
      .from("mp_platform_settings")
      .select("pro_plan_price")
      .maybeSingle();

    const proPriceRupees = Number(settings?.pro_plan_price ?? 4.99);
    const amountPaise = Math.round((Number.isNaN(proPriceRupees) ? 4.99 : proPriceRupees) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
      return NextResponse.json({ error: "Subscription price is misconfigured. Please contact support." }, { status: 500 });
    }

    const rzp = new Razorpay({ key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const order = await rzp.orders.create({ amount: amountPaise, currency: "INR", receipt: `sub_${Date.now()}` });

    const { error } = await supabaseAdmin.from("mp_sub_orders").insert({
      user_id: user.id,
      razorpay_order_id: order.id,
      amount: amountPaise,
      status: "created"
    });
    if (error) throw error;

    return NextResponse.json({ orderId: order.id, amount: amountPaise, keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}