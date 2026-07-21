import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizePhone, verifyOtp } from "@/lib/msg91";
import { findUserIdByPhone, findUserIdByEmail } from "@/lib/authUsers";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Full signup: name + email + password + phone, phone proven via OTP.
// Creates a real-email Supabase user and returns a session.
export async function POST(req) {
  try {
    const { name, email: rawEmail, password, phone, otp } = await req.json();
    const email = String(rawEmail || "").trim().toLowerCase();
    const p = normalizePhone(phone);

    if (!String(name || "").trim()) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (String(password || "").length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    if (!p) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
    if (!otp) return NextResponse.json({ error: "Enter the OTP sent to your phone." }, { status: 400 });

    const ok = await verifyOtp(p, String(otp).trim());
    if (!ok) return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 401 });

    // Uniqueness — checked AFTER the OTP so number ownership is proven first.
    if (await findUserIdByPhone(p)) {
      return NextResponse.json({ error: "This number already has an account. Please log in." }, { status: 409 });
    }
    if (await findUserIdByEmail(email)) {
      return NextResponse.json({ error: "This email is already registered. Please log in." }, { status: 409 });
    }

    const { error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      phone: p,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { full_name: String(name).trim(), phone: p, provider: "email" }
    });
    if (cErr) throw new Error(cErr.message);

    // Sign in with the password they just chose to mint the session.
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false }
    });
    const { data: signin, error: sErr } = await anon.auth.signInWithPassword({ email, password });
    if (sErr) throw new Error(`Account created but sign-in failed: ${sErr.message}`);

    return NextResponse.json({
      access_token: signin.session.access_token,
      refresh_token: signin.session.refresh_token
    });
  } catch (e) {
    console.error("[signup]", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
