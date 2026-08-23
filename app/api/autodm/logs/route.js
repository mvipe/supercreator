import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, getActiveOwnerId } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — recent AutoDM activity plus headline counts. */
export async function GET(req) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const ownerId = await getActiveOwnerId(user);

  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit") || 100), 300);

  const { data: logs } = await supabaseAdmin
    .from("mp_autodm_logs")
    .select("id,rule_id,media_id,commenter_username,comment_text,matched_keyword,status,error,created_at")
    .eq("user_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const countBy = async (status) => {
    const { count } = await supabaseAdmin
      .from("mp_autodm_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ownerId)
      .gte("created_at", since)
      .in("status", status);
    return count || 0;
  };

  const [sent, failed, skipped] = await Promise.all([
    countBy(["sent", "replied"]),
    countBy(["failed"]),
    countBy(["skipped"])
  ]);

  return NextResponse.json({ logs: logs || [], stats: { sent, failed, skipped, window: "30d" } });
}
