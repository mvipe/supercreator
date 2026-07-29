import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, isStaff } from "@/lib/supabaseAdmin";

const NEXT_STATUS = ["approved", "processing", "paid", "rejected"];

async function requireAdmin(req) {
  const user = await getUserFromRequest(req);
  if (!user) return { error: "Please sign in first.", status: 401 };
  if (!(await isStaff(user))) return { error: "Not authorized.", status: 403 };
  return { user };
}

// List all payout requests (optionally filtered by ?status=), newest first,
// enriched with the creator's phone/username.
export async function GET(req) {
  const auth = await requireAdmin(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const status = new URL(req.url).searchParams.get("status");
  let q = supabaseAdmin.from("mp_payouts").select("*").order("requested_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data: payouts, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = [...new Set(payouts.map((p) => p.creator_id))];
  const { data: profiles } = await supabaseAdmin.from("mp_profiles")
    .select("user_id, username, display_name").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const byId = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));

  const rows = payouts.map((p) => ({ ...p, creator: byId[p.creator_id] || null }));
  return NextResponse.json({ payouts: rows });
}

// Update a payout's status (approve / mark processing / mark paid / reject).
export async function POST(req) {
  const auth = await requireAdmin(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id, status, reference, adminNote } = await req.json();
    if (!id || !NEXT_STATUS.includes(status)) return NextResponse.json({ error: "Invalid update." }, { status: 400 });
    if (status === "paid" && !String(reference || "").trim()) {
      return NextResponse.json({ error: "Add a payment reference before marking as paid." }, { status: 400 });
    }

    const patch = {
      status,
      admin_note: adminNote ?? null,
      processed_by: auth.user.id,
      processed_at: (status === "paid" || status === "rejected") ? new Date().toISOString() : null
    };
    if (reference !== undefined) patch.reference = reference || null;

    const { data, error } = await supabaseAdmin.from("mp_payouts")
      .update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ payout: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
