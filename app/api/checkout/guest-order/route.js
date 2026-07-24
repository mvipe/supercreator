import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { supabaseAdmin, getUserFromRequest, isBlocked } from "@/lib/supabaseAdmin";
import { productPrice } from "@/lib/products";

// =============================================================
// Guest-capable checkout for COURSES (+ one optional add-on product).
//
// Unlike /api/checkout/order this does NOT require an authenticated session:
// a buyer can pay with just email + phone + state. We create (or reuse) an
// email-based auth user for them so the existing purchase/access model keeps
// working, and hand back a magic-link token so the client can sign them in
// on-screen straight after payment. No email is sent (deferred).
//
// A logged-in buyer hitting this endpoint is used as-is (no guest account).
// =============================================================

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

/** Ensure an email-based auth user exists; return its id. */
async function ensureBuyer(email, phone) {
  const created = await supabaseAdmin.auth.admin.createUser({
    email, email_confirm: true, user_metadata: { phone: phone || null, guest: true }
  });
  if (created?.data?.user) return created.data.user.id;
  // Already registered (or another race) — resolve the id via a magic link,
  // which returns the existing user object.
  const link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
  if (link?.data?.user) return link.data.user.id;
  throw new Error(link?.error?.message || created?.error?.message || "Could not prepare your account.");
}

/** Rupees for the course itself, honouring pwyw + an active coupon. */
function courseAmountPaise(course, body) {
  const pr = course.pricing || {};
  let rupees;
  if (pr.mode === "free") rupees = 0;
  else if (pr.mode === "pwyw") rupees = Math.max(Number(pr.minPrice) || 1, Number(body.pwywAmount) || 0);
  else rupees = pr.discountEnabled && Number(pr.discountPrice) > 0 ? Number(pr.discountPrice) : Number(pr.price) || 0;
  let applied = null;
  if (body.coupon && rupees > 0) {
    const c = (course.settings?.coupons || []).find((x) => x.code === body.coupon && x.active);
    if (!c) return { error: "That coupon code isn't valid." };
    rupees = Math.round(rupees * (1 - c.percentOff / 100));
    applied = c.code;
  }
  return { paise: Math.round(rupees * 100), applied };
}

/** Resolve the configured add-on product (owned by the same creator). */
async function resolveAddon(course, ownerId) {
  const a = course.settings?.addon;
  if (!a?.id) return null;
  if (a.type === "course") {
    const { data } = await supabaseAdmin.from("mp_courses").select("id,title,pricing")
      .eq("id", a.id).eq("owner_id", ownerId).eq("status", "published").maybeSingle();
    if (!data) return null;
    const pr = data.pricing || {};
    const rupees = pr.mode === "free" ? 0
      : (pr.discountEnabled && Number(pr.discountPrice) > 0 ? Number(pr.discountPrice) : Number(pr.price) || 0);
    return { type: "course", id: data.id, title: data.title, paise: Math.round(rupees * 100) };
  }
  const { data } = await supabaseAdmin.from("mp_products").select("id,type,title,data")
    .eq("id", a.id).eq("owner_id", ownerId).eq("status", "published").maybeSingle();
  if (!data) return null;
  const rupees = productPrice(data.type, data.data || {});
  return { type: data.type, id: data.id, title: data.title, paise: Math.round((Number(rupees) || 0) * 100) };
}

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

function expiryForCourse(course) {
  const v = course.validity || {};
  if (v.mode !== "limited") return null;
  const d = new Date(); d.setDate(d.getDate() + (Number(v.days) || 365));
  return d.toISOString();
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { productId, email, phone, state, gstin, addon: wantAddon } = body;
    if (!productId) return NextResponse.json({ error: "Missing course." }, { status: 400 });

    // Buyer identity: logged-in user if present, else a guest email account.
    const authed = await getUserFromRequest(req);
    let buyerId, buyerEmail, isGuest;
    if (authed) {
      buyerId = authed.id; buyerEmail = authed.email; isGuest = false;
    } else {
      if (!isEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
      if (!String(phone || "").trim()) return NextResponse.json({ error: "Enter your phone number." }, { status: 400 });
      buyerId = await ensureBuyer(email.trim(), phone);
      buyerEmail = email.trim(); isGuest = true;
    }
    const buyerPhone = String(phone || authed?.user_metadata?.phone || "").replace(/\D/g, "") || null;

    const { data: courseRow } = await supabaseAdmin.from("mp_courses").select("*")
      .eq("id", productId).eq("status", "published").maybeSingle();
    if (!courseRow) return NextResponse.json({ error: "Course not found." }, { status: 404 });
    const ownerId = courseRow.owner_id;
    if (await isBlocked(ownerId)) return NextResponse.json({ error: "This store is currently unavailable." }, { status: 403 });

    // Answers capture the SuperProfile-style fields for the creator's records.
    const answers = [
      { label: "Email", value: buyerEmail || "" },
      { label: "Phone", value: buyerPhone || "" },
      { label: "State", value: state || "" }
    ];
    if (gstin) answers.push({ label: "GSTIN", value: gstin });

    const { paise: coursePaise, applied, error: cErr } = courseAmountPaise(courseRow, body);
    if (cErr) return NextResponse.json({ error: cErr }, { status: 400 });

    const addon = wantAddon ? await resolveAddon(courseRow, ownerId) : null;
    const total = coursePaise + (addon?.paise || 0);

    // Commission %: same rule as the authed checkout.
    const { data: ownerProfile } = await supabaseAdmin.from("mp_profiles")
      .select("plan, plan_expires_at").eq("user_id", ownerId).maybeSingle();
    const isProOwner = ownerProfile?.plan === "pro" && ownerProfile?.plan_expires_at && new Date(ownerProfile.plan_expires_at) > new Date();
    const { data: settings } = await supabaseAdmin.from("mp_platform_settings")
      .select("free_plan_commission, pro_plan_commission").maybeSingle();
    const commissionPercentage = isProOwner ? (settings?.pro_plan_commission ?? 10) : (settings?.free_plan_commission ?? 30);

    const meta = {
      guest: isGuest, email: buyerEmail, state: state || "", gstin: gstin || "",
      addon: addon ? { type: addon.type, id: addon.id, amount: addon.paise } : null,
      courseAmount: coursePaise
    };

    // Free course + no paid add-on: grant immediately, no Razorpay.
    if (total === 0) {
      await grantOne({ productType: "course", productId: courseRow.id, ownerId, buyerId, amount: 0, coupon: applied, buyerPhone, answers, expiresAt: expiryForCourse(courseRow), commissionPercentage });
      let tokenHash = null;
      if (isGuest) {
        const link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: buyerEmail });
        tokenHash = link?.data?.properties?.hashed_token || null;
      }
      return NextResponse.json({ free: true, guest: isGuest, tokenHash, email: buyerEmail });
    }

    const rzp = new Razorpay({ key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const order = await rzp.orders.create({ amount: total, currency: "INR", receipt: `mp_${Date.now()}` });
    const commissionAmount = Math.round((total * commissionPercentage) / 100);
    await supabaseAdmin.from("mp_orders").insert({
      product_type: "course", product_id: courseRow.id, owner_id: ownerId, buyer_id: buyerId,
      razorpay_order_id: order.id, amount: total, coupon: applied, buyer_phone: buyerPhone,
      answers, meta, status: "created",
      commission_percentage: commissionPercentage, commission_amount: commissionAmount,
      creator_amount: total - commissionAmount, owner_plan: isProOwner ? "pro" : "free"
    });

    return NextResponse.json({ orderId: order.id, amount: total, keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, guest: isGuest, email: buyerEmail });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
