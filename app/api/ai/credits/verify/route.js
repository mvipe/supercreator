import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";
import { getBalance } from "@/lib/aiCredits";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Incomplete payment details." }, { status: 400 });
    }

    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    const ok = expected.length === razorpay_signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature));
    if (!ok) return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });

    const { data: order, error: oErr } = await supabaseAdmin.from("mp_ai_credit_orders")
      .select("*").eq("razorpay_order_id", razorpay_order_id).eq("user_id", user.id).maybeSingle();
    if (oErr) throw oErr;
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    // Replay of an already-applied order is a no-op.
    if (order.applied_at) {
      return NextResponse.json({ ok: true, balance: await getBalance(user.id), alreadyApplied: true });
    }

    // Credit FIRST, then mark applied — if the grant fails the order stays
    // un-applied and a retry can still deliver it.
    const { data: balance, error: cErr } = await supabaseAdmin.rpc("mp_add_ai_credits", {
      p_user: user.id,
      p_credits: order.credits
    });
    if (cErr) throw new Error(`Could not add credits: ${cErr.message}`);

    const { error: uErr } = await supabaseAdmin.from("mp_ai_credit_orders").update({
      status: "paid",
      razorpay_payment_id,
      applied_at: new Date().toISOString()
    }).eq("id", order.id);
    if (uErr) throw uErr;

    return NextResponse.json({ ok: true, credits: order.credits, balance: Number(balance) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}