import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";
import { getPacks } from "@/lib/aiCredits";
import { ensureProfile } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

    // Same lesson as the subscription bug: make sure the row exists BEFORE
    // taking money, so the credit grant can never no-op.
    await ensureProfile(user);

    const { packId } = await req.json();
    const packs = await getPacks();
    const pack = packs.find((p) => p.id === packId);
    if (!pack) return NextResponse.json({ error: "Unknown credit pack." }, { status: 400 });

    const rzp = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    const order = await rzp.orders.create({
      amount: pack.price,
      currency: "INR",
      receipt: `aic_${Date.now()}`
    });

    const { error } = await supabaseAdmin.from("mp_ai_credit_orders").insert({
      user_id: user.id,
      razorpay_order_id: order.id,
      pack_id: pack.id,
      credits: pack.credits,
      amount: pack.price,
      status: "created"
    });
    if (error) throw error;

    return NextResponse.json({
      orderId: order.id,
      amount: pack.price,
      credits: pack.credits,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}