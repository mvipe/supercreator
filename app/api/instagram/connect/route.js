import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, getActiveOwnerId } from "@/lib/supabaseAdmin";
import { authorizeUrl, signState, oauthConfigured, oauthProblem, redirectUri, fetchAccount, exchangeLongLived } from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — hand the dashboard the Instagram sign-in URL. */
export async function GET(req) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!oauthConfigured()) {
    return NextResponse.json({ error: "Instagram sign-in isn't configured on this server yet. Paste an access token instead.", oauth: false }, { status: 400 });
  }

  // Catch the misconfigurations that would otherwise surface as Instagram's
  // opaque "Invalid platform app" / "Invalid redirect_uri" screens.
  const problem = oauthProblem(new URL(req.url).origin);
  if (problem) return NextResponse.json({ error: problem, oauth: true }, { status: 400 });

  const ownerId = await getActiveOwnerId(user);
  return NextResponse.json({ url: authorizeUrl(redirectUri(new URL(req.url).origin), signState(ownerId)), oauth: true });
}

/**
 * POST — connect with a token the creator already has (Graph API Explorer,
 * a Page token, or a long-lived Instagram token). This is the path that works
 * before the Meta app review is finished.
 */
export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    const ownerId = await getActiveOwnerId(user);

    const body = await req.json().catch(() => ({}));
    const token = String(body.access_token || "").trim();
    const kind = body.token_kind === "facebook" ? "facebook" : "instagram";
    if (!token) return NextResponse.json({ error: "Paste your Instagram access token." }, { status: 400 });

    // Validate it against Instagram before we store anything.
    let info;
    try {
      info = await fetchAccount(token, kind);
    } catch (err) {
      return NextResponse.json({ error: `Instagram rejected that token: ${err.message}` }, { status: 400 });
    }

    // Upgrade a short-lived Instagram token to 60 days when we can.
    let finalToken = token;
    let expiresAt = body.expires_at || null;
    if (kind === "instagram" && process.env.INSTAGRAM_APP_SECRET) {
      try {
        const long = await exchangeLongLived(token);
        finalToken = long.access_token;
        expiresAt = new Date(Date.now() + long.expires_in * 1000).toISOString();
      } catch { /* already long-lived, or no secret — keep what we were given */ }
    }

    const row = {
      user_id: ownerId,
      ig_user_id: info.ig_user_id,
      username: info.username,
      name: info.name,
      profile_picture_url: info.profile_picture_url,
      followers_count: info.followers_count,
      access_token: finalToken,
      token_expires_at: expiresAt,
      token_kind: kind,
      page_id: info.page_id,
      active: true,
      last_error: null,
      updated_at: new Date().toISOString()
    };

    // Free the handle if someone else had it connected and inactive.
    await supabaseAdmin.from("mp_ig_accounts")
      .update({ active: false })
      .eq("ig_user_id", info.ig_user_id)
      .neq("user_id", ownerId);

    const { data, error } = await supabaseAdmin
      .from("mp_ig_accounts")
      .upsert(row, { onConflict: "user_id,ig_user_id" })
      .select("id,ig_user_id,username,name,profile_picture_url,followers_count,token_kind,token_expires_at,connected_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ account: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not connect Instagram." }, { status: 500 });
  }
}
