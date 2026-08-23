import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, getActiveOwnerId } from "@/lib/supabaseAdmin";
import { fetchMedia } from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — recent posts and reels, for the "which post?" picker. */
export async function GET(req) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const ownerId = await getActiveOwnerId(user);

  const { data: account } = await supabaseAdmin
    .from("mp_ig_accounts").select("*").eq("user_id", ownerId).eq("active", true).maybeSingle();
  if (!account) return NextResponse.json({ error: "Connect your Instagram account first." }, { status: 400 });

  try {
    return NextResponse.json({ media: await fetchMedia(account, 30) });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not load your posts." }, { status: 400 });
  }
}
