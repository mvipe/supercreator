import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    if (expected !== razorpay_signature) return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });

    const { data: order } = await supabaseAdmin.from("mp_orders").select("*")
      .eq("razorpay_order_id", razorpay_order_id).eq("buyer_id", user.id).maybeSingle();
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.status === "paid") return NextResponse.json({ ok: true });

    await supabaseAdmin.from("mp_orders").update({ status: "paid", razorpay_payment_id }).eq("id", order.id);

    if (order.product_type === "booking") {
      const { data: session } = await supabaseAdmin.from("mp_sessions").select("*").eq("id", order.product_id).single();
      const starts = new Date(order.meta.startsAt);
      const ends = new Date(starts.getTime() + session.duration_min * 60000);
      await supabaseAdmin.from("mp_bookings").insert({
        session_id: order.product_id, owner_id: order.owner_id, buyer_id: user.id,
        starts_at: starts.toISOString(), ends_at: ends.toISOString(),
        amount: order.amount, buyer_phone: order.buyer_phone, answers: order.answers
      });
      return NextResponse.json({ ok: true });
    }

    let expiresAt = null;
    if (order.product_type === "course") {
      const { data: c } = await supabaseAdmin.from("mp_courses").select("validity").eq("id", order.product_id).single();
      if (c?.validity?.mode === "limited") {
        const d = new Date(); d.setDate(d.getDate() + (Number(c.validity.days) || 365));
        expiresAt = d.toISOString();
      }
    }

    const commissionPercentage = order.commission_percentage ?? 0;
    const commissionAmount = order.commission_amount ?? Math.round((order.amount * commissionPercentage) / 100);
    const creatorAmount = order.creator_amount ?? (order.amount - commissionAmount);

    await supabaseAdmin.from("mp_purchases").upsert({
      product_type: order.product_type,
      product_id: order.product_id,
      owner_id: order.owner_id,
      buyer_id: user.id,
      order_id: order.id,
      amount: order.amount,
      coupon: order.coupon,
      buyer_phone: order.buyer_phone,
      answers: order.answers,
      expires_at: expiresAt,
      commission_percentage: commissionPercentage,
      commission_amount: commissionAmount,
      creator_amount: creatorAmount,
    }, { onConflict: "product_type,product_id,buyer_id" });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
