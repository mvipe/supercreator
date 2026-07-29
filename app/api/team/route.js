import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";
import { PERMISSION_KEYS } from "@/lib/team";

export const dynamic = "force-dynamic";

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
const cleanPerms = (p) => (Array.isArray(p) ? p.filter((x) => PERMISSION_KEYS.includes(x)) : []);

async function requireOwner(req) {
  const user = await getUserFromRequest(req);
  if (!user) return { error: "Please sign in first.", status: 401 };
  // A sub-admin can't manage other sub-admins.
  const { data } = await supabaseAdmin.from("mp_team_members").select("id").eq("member_id", user.id).maybeSingle();
  if (data) return { error: "Sub-admins can't manage the team.", status: 403 };
  return { user };
}

// List the owner's sub-admins.
export async function GET(req) {
  const auth = await requireOwner(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await supabaseAdmin.from("mp_team_members")
    .select("id, member_id, name, email, permissions, active, created_at")
    .eq("owner_id", auth.user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data || [] }, { headers: { "Cache-Control": "no-store" } });
}

// Create a sub-admin: makes an auth account (email + password) linked to the owner.
export async function POST(req) {
  const auth = await requireOwner(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const { name, email, password, permissions } = await req.json();
    if (!isEmail(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    if (!password || String(password).length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

    const created = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(), password: String(password), email_confirm: true,
      user_metadata: { full_name: name || "", team_owner: auth.user.id, is_team_member: true }
    });
    if (created.error || !created.data?.user) {
      return NextResponse.json({ error: created.error?.message || "That email may already be registered." }, { status: 400 });
    }
    const memberId = created.data.user.id;

    const { data, error } = await supabaseAdmin.from("mp_team_members").insert({
      owner_id: auth.user.id, member_id: memberId, name: name || "", email: email.trim(),
      permissions: cleanPerms(permissions), active: true
    }).select("id, member_id, name, email, permissions, active, created_at").single();

    if (error) {
      try { await supabaseAdmin.auth.admin.deleteUser(memberId); } catch {}
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, member: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Update a sub-admin's permissions / active state / name.
export async function PATCH(req) {
  const auth = await requireOwner(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const { id, permissions, active, name } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const update = {};
    if (permissions !== undefined) update.permissions = cleanPerms(permissions);
    if (active !== undefined) update.active = !!active;
    if (name !== undefined) update.name = name;
    const { data, error } = await supabaseAdmin.from("mp_team_members")
      .update(update).eq("id", id).eq("owner_id", auth.user.id)
      .select("id, member_id, name, email, permissions, active, created_at").maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Sub-admin not found." }, { status: 404 });
    // Kick an inactive sub-admin out of any live session.
    if (active === false) { try { await supabaseAdmin.auth.admin.signOut(data.member_id, "global"); } catch {} }
    return NextResponse.json({ ok: true, member: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Remove a sub-admin (deletes the row and the auth account).
export async function DELETE(req) {
  const auth = await requireOwner(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const { data: m } = await supabaseAdmin.from("mp_team_members")
      .select("member_id").eq("id", id).eq("owner_id", auth.user.id).maybeSingle();
    if (!m) return NextResponse.json({ error: "Sub-admin not found." }, { status: 404 });
    await supabaseAdmin.from("mp_team_members").delete().eq("id", id).eq("owner_id", auth.user.id);
    try { await supabaseAdmin.auth.admin.deleteUser(m.member_id); } catch {}
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
