import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, getActiveOwnerId } from "@/lib/supabaseAdmin";
import { pickRule, pickCommentReply } from "@/lib/autodm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST — dry run. Feeds a pretend comment through the exact matcher the
 * webhook uses, so a creator can check their keywords without posting on
 * Instagram. Sends nothing.
 */
export async function POST(req) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const ownerId = await getActiveOwnerId(user);

  const { comment = "", media_id = null } = await req.json().catch(() => ({}));

  const { data: rules } = await supabaseAdmin
    .from("mp_autodm_rules")
    .select("*")
    .eq("user_id", ownerId)
    .eq("active", true)
    .order("created_at", { ascending: false });

  const { rule, keyword } = pickRule(rules || [], { mediaId: media_id, commentText: comment });

  if (!rule) return NextResponse.json({ matched: false });

  return NextResponse.json({
    matched: true,
    rule: { id: rule.id, name: rule.name },
    keyword,
    dm: {
      text: rule.dm_text,
      button_label: rule.button_label,
      button_url: rule.button_url
    },
    comment_reply: rule.reply_to_comment ? pickCommentReply(rule) : null
  });
}
