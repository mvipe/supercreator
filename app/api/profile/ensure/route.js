import { NextResponse } from "next/server";
import { getUserFromRequest, supabaseAdmin } from "@/lib/supabaseAdmin";
import { ensureProfile } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { ref } = await req.json().catch(() => ({}));

    // Creates the row if it's missing; retries on a lost race / code collision.
    const profile = await ensureProfile(user, { ref });

    // Backfill the phone if we learned it after signup.
    const phone = user.phone || user.user_metadata?.phone || "";
    if (profile && !profile.phone_number && phone) {
      await supabaseAdmin.from("mp_profiles").update({ phone_number: phone }).eq("user_id", user.id);
      profile.phone_number = phone;
    }

    return NextResponse.json({ profile });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}