import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { supabaseAdmin, getUserFromRequest, isBlocked } from "@/lib/supabaseAdmin";
import { productChargeRupees } from "@/lib/products";

async function loadProduct(productType, productId) {
  if (productType === "course") {
    const { data } = await supabaseAdmin.from("mp_courses").select("*").eq("id", productId).eq("status", "published").maybeSingle();
    return data && { ownerId: data.owner_id, course: data };
  }
  if (productType === "booking") {
    const { data } = await supabaseAdmin.from("mp_sessions").select("*").eq("id", productId).eq("active", true).maybeSingle();
    return data && { ownerId: data.owner_id, session: data };
  }
  const { data } = await supabaseAdmin.from("mp_products").select("*").eq("id", productId).eq("type", productType).eq("status", "published").maybeSingle();
  return data && { ownerId: data.owner_id, product: data };
}

function computeAmountPaise(productType, loaded, body) {
  if (productType === "course") {
    const pr = loaded.course.pricing || {};
    let rupees;
    if (pr.mode === "free") rupees = 0;
    else if (pr.mode === "pwyw") rupees = Math.max(Number(pr.minPrice) || 1, Number(body.pwywAmount) || 0);
    else rupees = pr.discountEnabled && Number(pr.discountPrice) > 0 ? Number(pr.discountPrice) : Number(pr.price) || 0;
    if (body.coupon && rupees > 0) {
      const c = (loaded.course.settings?.coupons || []).find((x) => x.code === body.coupon && x.active);
      if (!c) return { error: "That coupon code isn't valid." };
      rupees = Math.round(rupees * (1 - c.percentOff / 100));
      return { amount: Math.round(rupees * 100), applied: c.code };
    }
    return { amount: Math.round(rupees * 100), applied: null };
  }
  if (productType === "booking") return { amount: Math.round((Number(loaded.session.price) || 0) * 100), applied: null };
  const d = loaded.product.data || {};
  // event/locked/book/payment: honour free, pwyw and the "Offer discounted price" toggle.
  if (["event", "locked", "book", "payment"].includes(productType)) {
    const rupees = productChargeRupees(productType, d, { pwywAmount: body.pwywAmount });
    return { amount: Math.round(rupees * 100), applied: null };
  }
  return { error: "Unknown product type" };
}

function expiryForCourse(course) {
  const v = course.validity || {};
  if (v.mode !== "limited") return null;
  const d = new Date(); d.setDate(d.getDate() + (Number(v.days) || 365));
  return d.toISOString();
}

async function grantAccess({ productType, productId, ownerId, user, amount, applied, answers, meta, loaded, orderId = null, commissionPercentage = 0, commissionAmount = 0, creatorAmount = null }) {
  const buyerPhone = user.user_metadata?.phone || user.phone || null;
  if (productType === "booking") {
    const starts = new Date(meta.startsAt);
    const ends = new Date(starts.getTime() + loaded.session.duration_min * 60000);
    const { data: clash } = await supabaseAdmin.from("mp_bookings").select("id")
      .eq("owner_id", ownerId).eq("status", "confirmed")
      .lt("starts_at", ends.toISOString()).gt("ends_at", starts.toISOString());
    if (clash?.length) throw new Error("That slot was just booked by someone else. Pick another time. Choose another slot.");
    await supabaseAdmin.from("mp_bookings").insert({
      session_id: productId, owner_id: ownerId, buyer_id: user.id,
      starts_at: starts.toISOString(), ends_at: ends.toISOString(),
      amount, buyer_phone: buyerPhone, answers: answers || []
    });
    return;
  }
  await supabaseAdmin.from("mp_purchases").upsert({
    product_type: productType,
    product_id: productId,
    owner_id: ownerId,
    buyer_id: user.id,
    order_id: orderId,
    amount,
    coupon: applied,
    buyer_phone: buyerPhone,
    answers: answers || [],
    expires_at: productType === "course" ? expiryForCourse(loaded.course) : null,
    commission_percentage: commissionPercentage,
    commission_amount: commissionAmount,
    creator_amount: creatorAmount ?? (amount - commissionAmount),
  }, { onConflict: "product_type,product_id,buyer_id" });
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    const body = await req.json();
    const { productType, productId, answers, meta = {} } = body;

    const loaded = await loadProduct(productType, productId);
    if (!loaded) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    const ownerId = loaded.ownerId;

    if (await isBlocked(ownerId)) return NextResponse.json({ error: "This store is currently unavailable." }, { status: 403 });

    if (productType !== "booking" && productType !== "payment") {
      const { data: existing } = await supabaseAdmin.from("mp_purchases").select("id")
        .eq("product_type", productType).eq("product_id", productId).eq("buyer_id", user.id).maybeSingle();
      if (existing) return NextResponse.json({ free: true, alreadyOwned: true });
    }
    if (productType === "booking" && !meta.startsAt) return NextResponse.json({ error: "Pick a time slot first." }, { status: 400 });

    const { amount, applied, error } = computeAmountPaise(productType, loaded, body);
    if (error) return NextResponse.json({ error }, { status: 400 });

    if (amount === 0) {
      await grantAccess({ productType, productId, ownerId, user, amount: 0, applied, answers, meta, loaded });
      return NextResponse.json({ free: true });
    }

    const { data: ownerProfile } = await supabaseAdmin.from("mp_profiles")
      .select("plan, plan_expires_at")
      .eq("user_id", ownerId)
      .maybeSingle();
    const isProOwner = ownerProfile?.plan === "pro" && ownerProfile?.plan_expires_at && new Date(ownerProfile.plan_expires_at) > new Date();

    const { data: settings } = await supabaseAdmin
      .from("mp_platform_settings")
      .select("free_plan_commission, pro_plan_commission")
      .maybeSingle();
    const commissionPercentage = isProOwner ? (settings?.pro_plan_commission ?? 10) : (settings?.free_plan_commission ?? 30);
    const commissionAmount = Math.round((amount * commissionPercentage) / 100);
    const creatorAmount = amount - commissionAmount;

    const rzp = new Razorpay({ key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const order = await rzp.orders.create({ amount, currency: "INR", receipt: `mp_${Date.now()}` });
    await supabaseAdmin.from("mp_orders").insert({
      product_type: productType,
      product_id: productId,
      owner_id: ownerId,
      buyer_id: user.id,
      razorpay_order_id: order.id,
      amount,
      coupon: applied,
      buyer_phone: user.user_metadata?.phone || null,
      answers: answers || [],
      meta,
      status: "created",
      commission_percentage: commissionPercentage,
      commission_amount: commissionAmount,
      creator_amount: creatorAmount,
      owner_plan: isProOwner ? "pro" : "free",
    });
    return NextResponse.json({ orderId: order.id, amount, keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
