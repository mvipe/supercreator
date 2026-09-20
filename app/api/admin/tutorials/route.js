import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, isStaff } from "@/lib/supabaseAdmin";

async function requireAdmin(req) {
  const user = await getUserFromRequest(req);
  if (!user) return { error: "Please sign in first.", status: 401 };
  if (!(await isStaff(user))) return { error: "Not authorized.", status: 403 };
  return { user };
}

// Admin: list ALL tutorials (published + hidden), ordered.
export async function GET(req) {
  const auth = await requireAdmin(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await supabaseAdmin.from("mp_tutorials")
    .select("*").order("position").order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tutorials: data });
}

// Admin: create / update / delete.
export async function POST(req) {
  const auth = await requireAdmin(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "delete") {
      if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
      await supabaseAdmin.from("mp_tutorials").delete().eq("id", body.id);
      return NextResponse.json({ ok: true });
    }

    const row = {
      title: (body.title || "").trim() || "Untitled tutorial",
      description: body.description || "",
      video_url: (body.video_url || "").trim(),
      category: body.category || "Essentials",
      position: Number(body.position) || 0,
      published: body.published !== false
    };
    if (!row.video_url) return NextResponse.json({ error: "Add a video link." }, { status: 400 });

    // Cover art for the Learn grid. Kept separate from `row` so that a DB
    // without revenue_and_covers.sql applied still accepts the write —
    // otherwise adding the field would break saving tutorials outright.
    const cover = (body.cover_image || "").trim();
    const withCover = { ...row, cover_image: cover };

    const table = () => supabaseAdmin.from("mp_tutorials");
    const write = async (payload) =>
      body.id
        ? table().update(payload).eq("id", body.id).select("*").single()
        : table().insert(payload).select("*").single();

    let { data, error } = await write(withCover);
    if (error) {
      // Most likely: cover_image column missing. Retry without it and tell
      // the admin which migration to run rather than failing the save.
      const retry = await write(row);
      if (retry.error) throw retry.error;
      return NextResponse.json({
        tutorial: retry.data,
        warning: "Saved, but the cover image wasn't stored — run supabase/revenue_and_covers.sql."
      });
    }
    return NextResponse.json({ tutorial: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
