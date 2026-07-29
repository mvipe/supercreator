import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, getActiveOwnerId } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Product types that live in mp_products (i.e. everything except courses
// and bookings). 'book' was missing here, so book sales showed as "Product".
const PRODUCT_TYPES = ["event", "locked", "payment", "book"];

// Returns the signed-in creator's sales enriched with buyer + product names,
// plus everything the client needs to render a PDF invoice.
export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    const ownerId = await getActiveOwnerId(user);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

    const [{ data: purchases, error: pErr }, { data: bookings, error: bErr }, { data: profile }] = await Promise.all([
      supabaseAdmin.from("mp_purchases").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false }),
      supabaseAdmin.from("mp_bookings").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false }),
      supabaseAdmin.from("mp_profiles")
        .select("full_name, display_name, business_name, email, phone_number, username")
        .eq("user_id", ownerId).maybeSingle()
    ]);
    if (pErr) throw pErr;
    if (bErr) throw bErr;

    const buys = purchases || [];
    const books = bookings || [];

    // Resolve product titles per type.
    const courseIds = buys.filter((p) => p.product_type === "course").map((p) => p.product_id);
    const productIds = buys.filter((p) => PRODUCT_TYPES.includes(p.product_type)).map((p) => p.product_id);
    const sessionIds = books.map((b) => b.session_id).filter(Boolean);

    const [{ data: courses }, { data: products }, { data: sessions }] = await Promise.all([
      courseIds.length ? supabaseAdmin.from("mp_courses").select("id,title").in("id", courseIds) : { data: [] },
      productIds.length ? supabaseAdmin.from("mp_products").select("id,title").in("id", productIds) : { data: [] },
      sessionIds.length ? supabaseAdmin.from("mp_sessions").select("id,title").in("id", sessionIds) : { data: [] }
    ]);

    const titleOf = (type, id) => {
      if (type === "course") return (courses || []).find((c) => c.id === id)?.title || "Course";
      if (type === "booking") return (sessions || []).find((s) => s.id === id)?.title || "Session";
      return (products || []).find((p) => p.id === id)?.title || "Product";
    };

    // Pull the matching order rows so invoices can show the real Razorpay IDs
    // and the gross/commission split.
    const orderIds = buys.map((p) => p.order_id).filter(Boolean);
    const { data: orders } = orderIds.length
      ? await supabaseAdmin.from("mp_orders")
          .select("id, razorpay_order_id, razorpay_payment_id, amount, commission_amount, commission_percentage, creator_amount")
          .in("id", orderIds)
      : { data: [] };
    const orderById = Object.fromEntries((orders || []).map((o) => [o.id, o]));

    const nameFrom = (answers) => (answers || []).find((a) => /name/i.test(a.label))?.value || null;
    const emailFrom = (answers) => (answers || []).find((a) => /e-?mail/i.test(a.label))?.value || null;

    const rows = [
      ...buys.map((p) => {
        const o = orderById[p.order_id] || {};
        return {
          id: p.id,
          created_at: p.created_at,
          product_type: p.product_type,
          product_id: p.product_id,
          product_name: titleOf(p.product_type, p.product_id),
          buyer_name: nameFrom(p.answers),
          buyer_email: emailFrom(p.answers),
          buyer_phone: p.buyer_phone,
          // what the creator actually keeps (table shows this)
          amount: p.creator_amount ?? p.amount,
          // invoice fields
          gross_amount: o.amount ?? p.amount,
          commission_amount: p.commission_amount ?? o.commission_amount ?? 0,
          commission_percentage: p.commission_percentage ?? o.commission_percentage ?? null,
          creator_amount: p.creator_amount ?? p.amount,
          razorpay_payment_id: o.razorpay_payment_id || p.razorpay_payment_id || null,
          razorpay_order_id: o.razorpay_order_id || null,
          coupon: p.coupon || null,
          status: "paid"
        };
      }),
      ...books.map((b) => ({
        id: b.id,
        created_at: b.created_at,
        product_type: "booking",
        product_id: b.session_id,
        product_name: titleOf("booking", b.session_id),
        buyer_name: nameFrom(b.answers),
        buyer_email: emailFrom(b.answers),
        buyer_phone: b.buyer_phone,
        amount: b.amount,
        gross_amount: b.amount,
        commission_amount: 0,
        commission_percentage: null,
        creator_amount: b.amount,
        razorpay_payment_id: null,
        razorpay_order_id: null,
        coupon: null,
        status: b.status === "cancelled" ? "refunded" : "paid",
        starts_at: b.starts_at
      }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const seller = {
      name: profile?.full_name || profile?.display_name || "",
      business: profile?.business_name || "",
      email: profile?.email || "",
      phone: profile?.phone_number || ""
    };

    return NextResponse.json({ rows, seller }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}