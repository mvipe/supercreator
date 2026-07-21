import { NextResponse } from "next/server";
import { normalizePhone, verifyOtp } from "@/lib/msg91";
import { findUserIdByPhone, emailOfUser, mintLoginToken } from "@/lib/authUsers";

// MSG91 -> Supabase login (existing accounts only):
//   1) verify the OTP with MSG91
//   2) find the account for this phone (email-signup or legacy alias)
//   3) mint a one-time token; the client redeems it with
//      supabase.auth.verifyOtp({ type: "email", token_hash })
//
// No auto-create here any more: brand-new numbers are sent to /signup so we
// collect a name, email and password first.
export async function POST(req) {
  try {
    const { phone, otp } = await req.json();
    const p = normalizePhone(phone);
    if (!p || !otp) return NextResponse.json({ error: "Phone and OTP are required" }, { status: 400 });

    const ok = await verifyOtp(p, String(otp).trim());
    if (!ok) return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 401 });

    const userId = await findUserIdByPhone(p);
    if (!userId) {
      // Shouldn't normally happen (send-otp already screens), but a direct
      // API call or a race can land here.
      return NextResponse.json({ newUser: true, error: "No account for this number yet — please sign up." }, { status: 404 });
    }

    const email = await emailOfUser(userId);
    if (!email) throw new Error("Account has no email on file.");

    const token_hash = await mintLoginToken(email);
    return NextResponse.json({ token_hash });
  } catch (e) {
    console.error("[verify-otp]", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
