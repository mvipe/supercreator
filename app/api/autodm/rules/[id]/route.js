import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, getActiveOwnerId } from "@/lib/supabaseAdmin";
import { validateRule } from "@/lib/autodm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function owner(req) {
  const user = await getUserFromRequest(req);
  if (!user) return null;
  return await getActiveOwnerId(user);
}

/** PATCH — edit, or just flip the on/off switch. */
export async function PATCH(req, { params }) {
  const ownerId = await owner(req);
  if (!ownerId) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const patch = { updated_at: new Date().toISOString() };

  // A bare toggle skips full validation so switching off a half-built rule works.
  const isToggle = Object.keys(body).length === 1 && "active" in body;
  if (isToggle) {
    patch.active = !!body.active;
  } else {
    const { errors, keywords, match_mode } = validateRule(body);
    if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 });
    Object.assign(patch, {
      name: String(body.name || "").trim() || "Untitled automation",
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
      comment_replies: (body.comment_replies || []).map((s) => String(s || "").trim()).filter(Boolean),
      once_per_user: !!body.once_per_user
    });
    if ("active" in body) patch.active = !!body.active;
  }

  const { data, error } = await supabaseAdmin
    .from("mp_autodm_rules")
    .update(patch)
    .eq("id", params.id)
    .eq("user_id", ownerId)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Automation not found." }, { status: 404 });
  return NextResponse.json({ rule: data });
}

/** DELETE — remove an automation (its log history is kept). */
export async function DELETE(req, { params }) {
  const ownerId = await owner(req);
  if (!ownerId) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const { error } = await supabaseAdmin
    .from("mp_autodm_rules")
    .delete()
    .eq("id", params.id)
    .eq("user_id", ownerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
