import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";

export async function GET(req) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const { data } = await supabaseAdmin.from("mp_kyc").select("*").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ kyc: data || { status: "not_started" } });
}

// Creator submits / resubmits KYC → goes to 'under_review'.
export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    const b = await req.json();

    const legal_name = String(b.legal_name || "").trim();
    const pan = String(b.pan || "").trim().toUpperCase();
    if (!legal_name) return NextResponse.json({ error: "Enter your legal name." }, { status: 400 });
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return NextResponse.json({ error: "Enter a valid PAN (e.g. ABCDE1234F)." }, { status: 400 });
    if (!b.bank_account || !b.ifsc) return NextResponse.json({ error: "Enter your bank account and IFSC." }, { status: 400 });

    const row = {
      user_id: user.id, status: "under_review",
      legal_name, pan, gst: String(b.gst || "").trim().toUpperCase(),
      bank_account: String(b.bank_account || "").trim(),
      ifsc: String(b.ifsc || "").trim().toUpperCase(),
      bank_holder: String(b.bank_holder || "").trim() || legal_name,
      doc_url: b.doc_url || "",
      submitted_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      admin_note: ""
    };
    const { error } = await supabaseAdmin.from("mp_kyc").upsert(row, { onConflict: "user_id" });
    if (error) throw error;
    await supabaseAdmin.from("mp_profiles").update({ kyc_status: "under_review" }).eq("user_id", user.id);
    return NextResponse.json({ ok: true, status: "under_review" });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
