import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";

const nameFromAnswers = (answers) =>
  (answers || []).find((a) => /name/i.test(a.label || ""))?.value?.trim() || null;

export async function GET(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

    const courseId = params?.courseId;
    if (!courseId) return NextResponse.json({ error: "Missing course id." }, { status: 400 });

    const [{ data: course, error: courseError }, { data: purchases, error: purchasesError }] = await Promise.all([
      supabaseAdmin.from("mp_courses").select("id,title").eq("id", courseId).eq("owner_id", user.id).maybeSingle(),
      supabaseAdmin.from("mp_purchases")
        .select("id,amount,buyer_id,buyer_phone,answers,coupon,created_at")
        .eq("owner_id", user.id)
        .eq("product_type", "course")
        .eq("product_id", courseId)
        .order("created_at", { ascending: false })
    ]);

    if (courseError) throw courseError;
    if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
    if (purchasesError) throw purchasesError;

    const buyerIds = [...new Set((purchases || []).map((p) => p.buyer_id).filter(Boolean))];
    const { data: profiles } = buyerIds.length
      ? await supabaseAdmin.from("mp_profiles").select("user_id,username,full_name,display_name,created_at,phone,email").in("user_id", buyerIds)
      : { data: [] };

    const prof = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
    const rows = (purchases || []).map((p) => ({
      id: p.id,
      amount: (p.amount || 0) / 100,
      creatorAmount: (p.amount || 0) / 100,
      buyerName: nameFromAnswers(p.answers) || prof[p.buyer_id]?.full_name || prof[p.buyer_id]?.display_name || null,
      buyerUsername: prof[p.buyer_id]?.username || null,
      buyerPhone: p.buyer_phone || prof[p.buyer_id]?.phone || null,
      buyerEmail: prof[p.buyer_id]?.email || null,
      buyerJoined: prof[p.buyer_id]?.created_at || null,
      purchasedAt: p.created_at,
      coupon: p.coupon || null,
    }));

    return NextResponse.json({
      course: { id: course.id, title: course.title },
      sales: rows,
      totals: {
        sales: rows.length,
        uniqueBuyers: new Set(rows.map((r) => r.buyerUsername || r.buyerPhone || r.id)).size,
        revenue: rows.reduce((sum, r) => sum + r.creatorAmount, 0),
        gross: rows.reduce((sum, r) => sum + r.amount, 0)
      }
    });
  } catch (e) {
    console.error("Course stats GET error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
