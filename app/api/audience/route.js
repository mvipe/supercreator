import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, getActiveOwnerId } from "@/lib/supabaseAdmin";

const nameFromAnswers = (answers) =>
  (answers || []).find((a) => /name/i.test(a.label || ""))?.value?.trim() || null;

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    const ownerId = await getActiveOwnerId(user);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

    const [{ data: purchases }, { data: bookings }, { data: visits }] = await Promise.all([
      supabaseAdmin.from("mp_purchases").select("product_type,product_id,amount,buyer_id,buyer_phone,answers,coupon,created_at").eq("owner_id", ownerId).order("created_at", { ascending: false }),
      supabaseAdmin.from("mp_bookings").select("session_id,amount,buyer_id,buyer_phone,answers,status,created_at").eq("owner_id", ownerId).order("created_at", { ascending: false }),
      supabaseAdmin.from("mp_visits").select("path,ref,visitor_id,buyer_phone,created_at").eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(3000)
    ]);

    // Resolve product titles.
    const courseIds = (purchases || []).filter((p) => p.product_type === "course").map((p) => p.product_id);
    const productIds = (purchases || []).filter((p) => ["event", "locked", "payment", "book"].includes(p.product_type)).map((p) => p.product_id);
    const sessionIds = (bookings || []).map((b) => b.session_id);
    const buyerIds = [...new Set([...(purchases || []), ...(bookings || [])].map((r) => r.buyer_id).filter(Boolean))];

    const [{ data: courses }, { data: products }, { data: sessions }, { data: profiles }] = await Promise.all([
      courseIds.length ? supabaseAdmin.from("mp_courses").select("id,title").in("id", courseIds) : { data: [] },
      productIds.length ? supabaseAdmin.from("mp_products").select("id,title").in("id", productIds) : { data: [] },
      sessionIds.length ? supabaseAdmin.from("mp_sessions").select("id,title").in("id", sessionIds) : { data: [] },
      buyerIds.length ? supabaseAdmin.from("mp_profiles").select("user_id,username,full_name,display_name,created_at").in("user_id", buyerIds) : { data: [] }
    ]);
    const prof = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
    const titleOf = (type, id) =>
      type === "course" ? (courses.find((c) => c.id === id)?.title || "Course")
      : type === "booking" ? (sessions.find((s) => s.id === id)?.title || "Session")
      : (products.find((p) => p.id === id)?.title || "Product");

    const sales = [
      ...(purchases || []).map((p) => ({
        buyer_id: p.buyer_id, buyer_phone: p.buyer_phone,
        name: nameFromAnswers(p.answers) || prof[p.buyer_id]?.full_name || prof[p.buyer_id]?.display_name || null,
        username: prof[p.buyer_id]?.username || null,
        joined: prof[p.buyer_id]?.created_at || null,
        product_type: p.product_type, product_name: titleOf(p.product_type, p.product_id),
        amount: p.amount, created_at: p.created_at
      })),
      ...(bookings || []).filter((b) => b.status !== "cancelled").map((b) => ({
        buyer_id: b.buyer_id, buyer_phone: b.buyer_phone,
        name: nameFromAnswers(b.answers) || prof[b.buyer_id]?.full_name || prof[b.buyer_id]?.display_name || null,
        username: prof[b.buyer_id]?.username || null,
        joined: prof[b.buyer_id]?.created_at || null,
        product_type: "booking", product_name: titleOf("booking", b.session_id),
        amount: b.amount, created_at: b.created_at
      }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({ sales, visits: visits || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
