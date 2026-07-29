import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, getActiveOwnerId } from "@/lib/supabaseAdmin";

// Save the "complete your profile" details.
export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    const ownerId = await getActiveOwnerId(user);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    const b = await req.json();

    const full_name = String(b.full_name || "").trim();
    const email = String(b.email || "").trim();
    if (!full_name) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });

    const patch = {
      full_name,
      business_name: String(b.business_name || "").trim(),
      email,
      profession: String(b.profession || "").trim(),
      display_name: full_name,          // keep display name in sync
      profile_complete: true
    };
    const { error } = await supabaseAdmin.from("mp_profiles").update(patch).eq("user_id", ownerId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
