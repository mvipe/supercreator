import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// GET notifications for user
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's plan
    const { data: profile } = await supabaseAdmin
      .from("mp_profiles")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    // Get notifications meant for this user
    const { data: notifications } = await supabaseAdmin
      .from("mp_notifications")
      .select("*, user_notifications(read_at)")
      .eq("published", true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .or(
        `and(target_type.eq.all),and(target_type.eq.free_users,target_user_id.is.null),and(target_type.eq.pro_users,target_user_id.is.null),and(target_type.eq.specific_user,target_user_id.eq.${user.id})`
      )
      .order("created_at", { ascending: false });

    // Filter by plan if needed
    let filtered = notifications || [];
    if (profile?.plan === "free") {
      filtered = filtered.filter(
        (n) => n.target_type === "all" || n.target_type === "free_users" || (n.target_type === "specific_user" && n.target_user_id === user.id)
      );
    } else if (profile?.plan === "pro") {
      filtered = filtered.filter(
        (n) => n.target_type === "all" || n.target_type === "pro_users" || (n.target_type === "specific_user" && n.target_user_id === user.id)
      );
    }

    return NextResponse.json({ notifications: filtered });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function columnExists(columnName) {
  const { data, error } = await supabaseAdmin
    .from("information_schema.columns")
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", "mp_notifications")
    .eq("column_name", columnName)
    .maybeSingle();

  if (error) {
    console.error("Column lookup failed:", error);
    return false;
  }
  return !!data;
}

// CREATE notification (admin only)
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const { data: profile } = await supabaseAdmin
      .from("mp_profiles")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    if (profile?.plan !== "admin" && profile?.plan !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, message, type, target_type, target_user_id, expires_at } = body;

    if (!title || !message || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const payload = {
      title,
      message,
      type,
      target_type: target_type || "all",
      target_user_id: target_user_id || null,
      published: true,
      expires_at,
    };

    if (await columnExists("created_by")) {
      payload.created_by = user.id;
    }
    if (await columnExists("user_id")) {
      payload.user_id = user.id;
    }

    const { data: notification, error } = await supabaseAdmin
      .from("mp_notifications")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ notification });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
