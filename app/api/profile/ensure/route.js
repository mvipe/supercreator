import { NextResponse } from "next/server";
import { getUserFromRequest, supabaseAdmin } from "@/lib/supabaseAdmin";
import { ensureProfile } from "@/lib/subscription";
import { awardReferral } from "@/lib/referrals";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));

    // Only keep a referral code that belongs to a real creator (and isn't
    // a typo or junk from the URL).
    let ref = String(body?.ref || "").trim().toUpperCase().slice(0, 16) || null;
    if (ref) {
      const { data: owner } = await supabaseAdmin.from("mp_profiles")
        .select("user_id").ilike("referral_code", ref).maybeSingle();
      if (!owner || owner.user_id === user.id) ref = null;
    }

    // Creates the row if it's missing; retries on a lost race / code collision.
    const profile = await ensureProfile(user, { ref });

    // The row may already exist (a DB trigger or another route created it a
    // moment earlier without the code) — attach the referral if it's fresh.
    if (profile && ref && !profile.referred_by && profile.created_at &&
        Date.now() - new Date(profile.created_at).getTime() < 15 * 60 * 1000) {
      await supabaseAdmin.from("mp_profiles").update({ referred_by: ref }).eq("user_id", user.id).is("referred_by", null);
      profile.referred_by = ref;
    }

    // Refer & Earn: a brand-new profile that came in through a referral link
    // may earn its referrer a signup reward (only if the admin's trigger is
    // "signup"; the unique index makes this a one-time reward).
    if (profile?.referred_by && profile.created_at && Date.now() - new Date(profile.created_at).getTime() < 15 * 60 * 1000) {
      await awardReferral({ referredUserId: user.id, event: "signup" });
    }

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