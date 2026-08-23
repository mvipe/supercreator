import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { readState, exchangeCode, exchangeLongLived, fetchAccount, redirectUri } from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const appUrl = (req) => (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/$/, "");
const back = (req, params) => {
  const u = new URL(`${appUrl(req)}/dashboard/autodm`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return Response.redirect(u.toString(), 302);
};

/** Instagram sends the creator back here after they approve the app. */
export async function GET(req) {
  const p = new URL(req.url).searchParams;

  if (p.get("error")) {
    return back(req, { error: p.get("error_description") || "Instagram sign-in was cancelled." });
  }

  const userId = readState(p.get("state"));
  if (!userId) return back(req, { error: "That sign-in link expired. Please try connecting again." });

  const code = p.get("code");
  if (!code) return back(req, { error: "Instagram didn't return a sign-in code." });

  try {
    // Must be byte-identical to the one used on the way out.
    const short = await exchangeCode(code.replace(/#_$/, ""), redirectUri(new URL(req.url).origin));
    const long = await exchangeLongLived(short.access_token);
    const info = await fetchAccount(long.access_token, "instagram");

    await supabaseAdmin.from("mp_ig_accounts")
      .update({ active: false })
      .eq("ig_user_id", info.ig_user_id)
      .neq("user_id", userId);

    const { error } = await supabaseAdmin.from("mp_ig_accounts").upsert({
      user_id: userId,
      ig_user_id: info.ig_user_id,
      username: info.username,
      name: info.name,
      profile_picture_url: info.profile_picture_url,
      followers_count: info.followers_count,
      access_token: long.access_token,
      token_expires_at: new Date(Date.now() + long.expires_in * 1000).toISOString(),
      token_kind: "instagram",
      active: true,
      last_error: null,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id,ig_user_id" });

    if (error) return back(req, { error: error.message });
    return back(req, { connected: info.username || "1" });
  } catch (err) {
    return back(req, { error: err.message || "Could not finish connecting Instagram." });
  }
}
