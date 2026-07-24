import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Guest-capable payment verification for the course checkout. Mirrors
// /api/checkout/verify but resolves the buyer from the order (no session
// required) and grants the add-on too. Returns a magic-link token so a guest
// buyer can be signed in on-screen right after paying.

async function grantOne({ productType, productId, ownerId, buyerId, amount, coupon, buyerPhone, answers, orderId, expiresAt, commissionPercentage }) {
  const commissionAmount = Math.round((amount * commissionPercentage) / 100);
  await supabaseAdmin.from("mp_purchases").upsert({
    product_type: productType, product_id: productId, owner_id: ownerId, buyer_id: buyerId,
    order_id: orderId, amount, coupon: coupon || null, buyer_phone: buyerPhone || null,
    answers: answers || [], expires_at: expiresAt || null,
    commission_percentage: commissionPercentage, commission_amount: commissionAmount,
    creator_amount: amount - commissionAmount
  }, { onConflict: "product_type,product_id,buyer_id" });
}

export async function POST(req) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    if (expected !== razorpay_signature) return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });

    const { data: order } = await supabaseAdmin.from("mp_orders").select("*")
      .eq("razorpay_order_id", razorpay_order_id).maybeSingle();
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    const meta = order.meta || {};
    const commissionPercentage = order.commission_percentage ?? 0;
    let tokenHash = null;

    if (order.status !== "paid") {
      await supabaseAdmin.from("mp_orders").update({ status: "paid", razorpay_payment_id }).eq("id", order.id);

      // Course expiry from validity.
      let expiresAt = null;
      const { data: c } = await supabaseAdmin.from("mp_courses").select("validity").eq("id", order.product_id).maybeSingle();
      if (c?.validity?.mode === "limited") {
        const d = new Date(); d.setDate(d.getDate() + (Number(c.validity.days) || 365));
        expiresAt = d.toISOString();
      }

      const courseAmount = meta.courseAmount ?? (order.amount - (meta.addon?.amount || 0));
      await grantOne({
        productType: "course", productId: order.product_id, ownerId: order.owner_id, buyerId: order.buyer_id,
        amount: courseAmount, coupon: order.coupon, buyerPhone: order.buyer_phone, answers: order.answers,
        orderId: order.id, expiresAt, commissionPercentage
      });

      if (meta.addon?.id) {
        await grantOne({
          productType: meta.addon.type, productId: meta.addon.id, ownerId: order.owner_id, buyerId: order.buyer_id,
          amount: meta.addon.amount || 0, buyerPhone: order.buyer_phone, answers: order.answers,
          orderId: order.id, commissionPercentage
        });
      }
    }

    if (meta.guest && meta.email) {
      const link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: meta.email });
      tokenHash = link?.data?.properties?.hashed_token || null;
    }

    return NextResponse.json({ ok: true, guest: !!meta.guest, tokenHash, email: meta.email || null });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
