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

// Edit a creator's KYC details (typically a verified record that needs a
// correction — wrong IFSC, typo in the legal name, new bank account).
// Status is kept unless `status` is passed explicitly.
export async function PATCH(req) {
  const auth = await requireSuper(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const b = await req.json();
    const userId = b.userId;
    if (!userId) return NextResponse.json({ error: "Missing userId." }, { status: 400 });

    const { data: existing } = await supabaseAdmin.from("mp_kyc").select("user_id, status").eq("user_id", userId).maybeSingle();
    if (!existing) return NextResponse.json({ error: "KYC record not found." }, { status: 404 });

    const f = b.fields || {};
    const patch = { updated_at: new Date().toISOString() };
    const str = (v) => String(v ?? "").trim();
    if (f.legal_name !== undefined) {
      if (!str(f.legal_name)) return NextResponse.json({ error: "Legal name can't be empty." }, { status: 400 });
      patch.legal_name = str(f.legal_name);
    }
    if (f.pan !== undefined) {
      const pan = str(f.pan).toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return NextResponse.json({ error: "Enter a valid PAN (e.g. ABCDE1234F)." }, { status: 400 });
      patch.pan = pan;
    }
    if (f.gst !== undefined) patch.gst = str(f.gst).toUpperCase();
    if (f.bank_account !== undefined) {
      if (!str(f.bank_account)) return NextResponse.json({ error: "Bank account can't be empty." }, { status: 400 });
      patch.bank_account = str(f.bank_account);
    }
    if (f.ifsc !== undefined) {
      const ifsc = str(f.ifsc).toUpperCase();
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return NextResponse.json({ error: "Enter a valid IFSC (e.g. HDFC0001234)." }, { status: 400 });
      patch.ifsc = ifsc;
    }
    if (f.bank_holder !== undefined) patch.bank_holder = str(f.bank_holder);
    if (f.doc_url !== undefined) patch.doc_url = str(f.doc_url);
    if (b.adminNote !== undefined) patch.admin_note = str(b.adminNote);

    if (b.status !== undefined) {
      if (!["under_review", "verified", "rejected"].includes(b.status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
      patch.status = b.status;
      patch.reviewed_at = new Date().toISOString();
      patch.reviewed_by = auth.user.id;
    }

    const { error } = await supabaseAdmin.from("mp_kyc").update(patch).eq("user_id", userId);
    if (error) throw error;
    if (patch.status) await supabaseAdmin.from("mp_profiles").update({ kyc_status: patch.status }).eq("user_id", userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Remove a creator's KYC entirely. They go back to "not started" and must
// submit again before any payout.
export async function DELETE(req) {
  const auth = await requireSuper(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const userId = new URL(req.url).searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    const { error } = await supabaseAdmin.from("mp_kyc").delete().eq("user_id", userId);
    if (error) throw error;
    await supabaseAdmin.from("mp_profiles").update({ kyc_status: "not_started" }).eq("user_id", userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
