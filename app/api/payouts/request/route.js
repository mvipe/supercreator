import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, isBlocked, kycStatus } from "@/lib/supabaseAdmin";

const MIN_PAYOUT_PAISE = 10000; // ₹100

async function availablePaise(creatorId) {
  const { data: earned } = await supabaseAdmin.rpc("mp_lifetime_earned", { p_creator: creatorId });
  const { data: reserved } = await supabaseAdmin.rpc("mp_reserved_payouts", { p_creator: creatorId });
  return Math.max(0, Number(earned || 0) - Number(reserved || 0));
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    if (await isBlocked(user.id)) return NextResponse.json({ error: "Your account is currently restricted. Contact support." }, { status: 403 });

    // KYC gate — must be verified before any payout.
    const kyc = await kycStatus(user.id);
    if (kyc !== "verified") {
      const reason = kyc === "under_review" ? "Your KYC is under review. You can request a payout once it's verified."
        : kyc === "rejected" ? "Your KYC was rejected. Please correct and resubmit it before requesting a payout."
        : "Complete your KYC verification before requesting a payout.";
      return NextResponse.json({ error: reason, kyc }, { status: 403 });
    }

    const { amount, method, note } = await req.json();
    const paise = Math.round(Number(amount) * 100);
    if (!Number.isFinite(paise) || paise <= 0) return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
    if (paise < MIN_PAYOUT_PAISE) return NextResponse.json({ error: "Minimum payout is ₹100." }, { status: 400 });

    const m = method || {};
    if (m.type === "upi" && !String(m.upi || "").trim()) return NextResponse.json({ error: "Enter your UPI ID." }, { status: 400 });
    if (m.type === "bank" && (!m.account || !m.ifsc)) return NextResponse.json({ error: "Enter account number and IFSC." }, { status: 400 });
    if (m.type !== "upi" && m.type !== "bank") return NextResponse.json({ error: "Choose a payout method." }, { status: 400 });

    // Block a second pending request while one is still open.
    const { data: open } = await supabaseAdmin.from("mp_payouts").select("id")
      .eq("creator_id", user.id).in("status", ["requested", "approved", "processing"]).maybeSingle();
    if (open) return NextResponse.json({ error: "You already have a payout in progress." }, { status: 409 });

    const available = await availablePaise(user.id);
    if (paise > available) return NextResponse.json({ error: `You can withdraw up to ₹${(available / 100).toLocaleString("en-IN")}.` }, { status: 400 });

    const { data, error } = await supabaseAdmin.from("mp_payouts").insert({
      creator_id: user.id, amount: paise, method: m, creator_note: note || null, status: "requested"
    }).select("*").single();
    if (error) throw error;

    await supabaseAdmin.from("mp_profiles").update({ payout_method: m }).eq("user_id", user.id);
    return NextResponse.json({ payout: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}