import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, getActiveOwnerId } from "@/lib/supabaseAdmin";
import { validateRule, DEFAULT_COMMENT_REPLIES } from "@/lib/autodm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ctx(req) {
  const user = await getUserFromRequest(req);
  if (!user) return { error: NextResponse.json({ error: "Please sign in first." }, { status: 401 }) };
  const ownerId = await getActiveOwnerId(user);
  const { data: account } = await supabaseAdmin
    .from("mp_ig_accounts").select("id").eq("user_id", ownerId).eq("active", true).maybeSingle();
  return { ownerId, account };
}

/** GET — every automation for this creator, newest first. */
export async function GET(req) {
  const { error, ownerId } = await ctx(req);
  if (error) return error;

  const { data, error: dbErr } = await supabaseAdmin
    .from("mp_autodm_rules")
    .select("*")
    .eq("user_id", ownerId)
    .order("created_at", { ascending: false });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 400 });
  return NextResponse.json({ rules: data || [] });
}

/** POST — create an automation. */
export async function POST(req) {
  const { error, ownerId, account } = await ctx(req);
  if (error) return error;
  if (!account) return NextResponse.json({ error: "Connect your Instagram account first." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { errors, keywords, match_mode } = validateRule(body);
  if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 });

  const replies = (body.comment_replies || []).map((s) => String(s || "").trim()).filter(Boolean);

  const { data, error: dbErr } = await supabaseAdmin.from("mp_autodm_rules").insert({
    user_id: ownerId,
    ig_account_id: account.id,
    name: String(body.name || "").trim() || (keywords[0] ? `"${keywords[0]}" → DM` : "New automation"),
    media_id: body.media_id ? String(body.media_id) : null,
    media_permalink: body.media_permalink || null,
    media_thumbnail: body.media_thumbnail || null,
    media_caption: (body.media_caption || "").slice(0, 300) || null,
    keywords,
    match_mode,
    dm_text: String(body.dm_text || "").trim(),
    button_label: body.button_label ? String(body.button_label).trim().slice(0, 20) : null,
    button_url: body.button_url ? String(body.button_url).trim() : null,
    reply_to_comment: body.reply_to_comment !== false,
    comment_replies: replies.length ? replies : DEFAULT_COMMENT_REPLIES,
    once_per_user: !!body.once_per_user,
    active: body.active !== false
  }).select("*").single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 400 });
  return NextResponse.json({ rule: data });
}
