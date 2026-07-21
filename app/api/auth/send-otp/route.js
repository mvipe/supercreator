import { NextResponse } from "next/server";
import { normalizePhone, sendOtp } from "@/lib/msg91";
import { findUserIdByPhone } from "@/lib/authUsers";

// mode: "login"  -> only send if an account exists; otherwise tell the client
//                   to take the person to signup (no SMS wasted).
//       "signup" -> only send if the phone is NOT already registered.
export async function POST(req) {
  try {
    const { phone, mode = "login" } = await req.json();
    const p = normalizePhone(phone);
    if (!p) return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });

    const existingId = await findUserIdByPhone(p);

    if (mode === "login" && !existingId) {
      // New number: don't send an OTP — the client redirects to signup with
      // the number pre-filled.
      return NextResponse.json({ ok: true, newUser: true, phone: p });
    }
    if (mode === "signup" && existingId) {
      return NextResponse.json({ error: "This number already has an account. Please log in instead." }, { status: 409 });
    }

    await sendOtp(p);
    return NextResponse.json({ ok: true, phone: p });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
