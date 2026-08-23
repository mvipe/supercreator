import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, getActiveOwnerId } from "@/lib/supabaseAdmin";
import { oauthConfigured, oauthProblem, redirectUri } from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_FIELDS = "id,ig_user_id,username,name,profile_picture_url,followers_count,token_kind,token_expires_at,connected_at,last_error,active";

/** GET — connection status for the AutoDM dashboard. */
export async function GET(req) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const ownerId = await getActiveOwnerId(user);

  const { data } = await supabaseAdmin
    .from("mp_ig_accounts")
    .select(PUBLIC_FIELDS)
    .eq("user_id", ownerId)
    .eq("active", true)
    .maybeSingle();

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/$/, "");

  const origin = new URL(req.url).origin;

  return NextResponse.json({
    account: data || null,
    oauth: oauthConfigured(),
    oauthProblem: oauthConfigured() ? oauthProblem(origin) : null,
    redirectUri: redirectUri(origin),
    webhookUrl: `${appUrl}/api/instagram/webhook`,
    webhookReady: Boolean(process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.IG_WEBHOOK_VERIFY_TOKEN)
  });
}

/** DELETE — disconnect. Rules stay put so reconnecting picks up where they left off. */
export async function DELETE(req) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const ownerId = await getActiveOwnerId(user);

  await supabaseAdmin.from("mp_ig_accounts")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("user_id", ownerId);

  return NextResponse.json({ ok: true });
}
