import { supabaseAdmin, getUserFromRequest, isStaff } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

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

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or superadmin
    const { data: profile } = await supabaseAdmin
      .from("mp_profiles")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    const isAdminUser = profile?.plan === "admin" || profile?.plan === "superadmin" || await isStaff(user);
    if (!isAdminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get all notifications
    const { data: notifications } = await supabaseAdmin
      .from("mp_notifications")
      .select("id, title, message, type, target_type, created_at, expires_at, published")
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ notifications: notifications || [] });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or superadmin
    const { data: profile } = await supabaseAdmin
      .from("mp_profiles")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    const isAdminUser = profile?.plan === "admin" || profile?.plan === "superadmin" || await isStaff(user);
    if (!isAdminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { title, message, type, target_type, expires_at } = await req.json();

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    const payload = {
      title,
      message,
      type: type || "info",
      target_type: target_type || "all",
      expires_at: expires_at || null,
      published: true,
    };

    if (await columnExists("created_by")) {
      payload.created_by = user.id;
    }
    if (await columnExists("user_id")) {
      payload.user_id = user.id;
    }

    // Create notification
    const { data: notification, error: createError } = await supabaseAdmin
      .from("mp_notifications")
      .insert(payload)
      .select()
      .single();

    if (createError) throw createError;

    // Count target users for response
    let count = 0;

    if (target_type === "all") {
      const { count: totalCount } = await supabaseAdmin
        .from("mp_profiles")
        .select("id", { count: "exact", head: true });
      count = totalCount || 0;
    } else if (target_type === "free_users") {
      const { count: freeCount } = await supabaseAdmin
        .from("mp_profiles")
        .select("id", { count: "exact", head: true })
        .eq("plan", "free");
      count = freeCount || 0;
    } else if (target_type === "pro_users") {
      const { count: proCount } = await supabaseAdmin
        .from("mp_profiles")
        .select("id", { count: "exact", head: true })
        .eq("plan", "pro");
      count = proCount || 0;
    }

    return NextResponse.json({ success: true, notification, count });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
