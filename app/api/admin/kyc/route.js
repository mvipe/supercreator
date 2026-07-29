import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, isStaff } from "@/lib/supabaseAdmin";

async function requireSuper(req) {
  const user = await getUserFromRequest(req);
  if (!user) return { error: "Please sign in first.", status: 401 };
  if (!(await isStaff(user))) return { error: "Admins only.", status: 403 };
  return { user };
}

export async function GET(req) {
  const auth = await requireSuper(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const status = new URL(req.url).searchParams.get("status");
  let q = supabaseAdmin.from("mp_kyc").select("*").order("submitted_at", { ascending: false, nullsFirst: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data: rows, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = [...new Set((rows || []).map((r) => r.user_id))];
  const { data: profiles } = await supabaseAdmin.from("mp_profiles")
    .select("user_id, username, display_name").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const byId = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
  return NextResponse.json({ submissions: (rows || []).map((r) => ({ ...r, creator: byId[r.user_id] || null })) });
}

export async function POST(req) {
  const auth = await requireSuper(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const { userId, status, adminNote } = await req.json();
    if (!userId || !["verified", "rejected"].includes(status)) return NextResponse.json({ error: "Invalid update." }, { status: 400 });
    await supabaseAdmin.from("mp_kyc").update({
      status, admin_note: adminNote || "", reviewed_at: new Date().toISOString(), reviewed_by: auth.user.id, updated_at: new Date().toISOString()
    }).eq("user_id", userId);
    await supabaseAdmin.from("mp_profiles").update({ kyc_status: status }).eq("user_id", userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
