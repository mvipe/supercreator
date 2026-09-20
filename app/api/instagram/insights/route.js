import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, getActiveOwnerId } from "@/lib/supabaseAdmin";
import { fetchAccountInsights, fetchMediaInsights, fetchMedia } from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Instagram auth failures (expired/invalid token, permission removed).
const isAuthError = (err) => [190, 102, 10, 200].includes(Number(err?.code));

/**
 * GET — account + post insights for the connected Instagram account.
 *
 * This is the route that exercises the `instagram_business_manage_insights`
 * permission: it calls /{ig-user-id}/insights and /{media-id}/insights on the
 * Instagram Graph API with the creator's stored long-lived token. The AutoDM
 * dashboard's "Insights" tab loads this, so the permission is used inside the
 * product's real UI — which is what Meta App Review needs to observe.
 *
 * Query params:
 *   media_id — insights for a specific post (defaults to the most recent one).
 *   days     — window for account metrics (1–30, default 28).
 */
export async function GET(req) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const ownerId = await getActiveOwnerId(user);

  const { data: account } = await supabaseAdmin
    .from("mp_ig_accounts")
    .select("*")
    .eq("user_id", ownerId)
    .eq("active", true)
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: "Connect an Instagram account first." }, { status: 400 });
  }

  const p = new URL(req.url).searchParams;
  const mediaId = p.get("media_id");
  const days = Math.max(1, Math.min(30, Number(p.get("days")) || 28));

  const out = {
    account: { username: account.username, days },
    insights: null,
    media: null,
    errors: []
  };

  // Account-level insights — requires instagram_business_manage_insights.
  try {
    out.insights = await fetchAccountInsights(account, { days });
  } catch (err) {
    out.errors.push({ scope: "account", message: String(err?.message || err) });
    if (isAuthError(err)) await flagReconnect(account.id);
  }

  // Post-level insights for a chosen post, or the most recent one.
  try {
    let target = mediaId;
    if (!target) {
      const recent = await fetchMedia(account, 1);
      target = recent?.[0]?.id || null;
    }
    if (target) {
      out.media = await fetchMediaInsights(account, target);
    } else {
      out.errors.push({ scope: "media", message: "No posts found to read insights for." });
    }
  } catch (err) {
    out.errors.push({ scope: "media", message: String(err?.message || err) });
    if (isAuthError(err)) await flagReconnect(account.id);
  }

  return NextResponse.json(out);
}

async function flagReconnect(accountId) {
  await supabaseAdmin.from("mp_ig_accounts")
    .update({
      last_error: "Instagram rejected the saved token — reconnect the account.",
      updated_at: new Date().toISOString()
    })
    .eq("id", accountId);
}
