import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, isAdmin, isSuperAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET notifications for current user
export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's subscription plan
    const { data: profile } = await supabaseAdmin
      .from("mp_profiles")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    const userPlan = profile?.plan || "free";

    // Get all active notifications (not expired)
    const { data: allNotifications } = await supabaseAdmin
      .from("mp_notifications")
      .select("id, title, message, type, target_type, target_user_id, created_at, expires_at")
      .eq("published", true)
      .order("created_at", { ascending: false });

    // Filter notifications based on user's plan and targeting
    let notifications = (allNotifications || []).filter((notif) => {
      // Check if expired
      if (notif.expires_at && new Date(notif.expires_at) < new Date()) {
        return false;
      }

      // Public audience
      if (notif.target_type === "all") {
        return true;
      }

      // Explicit audience
      if (notif.target_type === "free_users" && userPlan === "free") {
        return true;
      }

      if (notif.target_type === "pro_users" && userPlan === "pro") {
        return true;
      }

      if (notif.target_type === "specific_user" && notif.target_user_id === user.id) {
        return true;
      }

      return false;
    });

    // Get read status for each notification
    const { data: readStatuses } = await supabaseAdmin
      .from("mp_user_notifications")
      .select("notification_id, read_at")
      .eq("user_id", user.id);

    const readMap = {};
    (readStatuses || []).forEach((rs) => {
      readMap[rs.notification_id] = rs.read_at;
    });

    // Enrich with read status
    notifications = notifications.map((notif) => ({
      ...notif,
      read_at: readMap[notif.id] || null,
    }));

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notificationId, read } = await req.json();
    if (!notificationId || read !== true) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("mp_user_notifications")
      .upsert({
        notification_id: notificationId,
        user_id: user.id,
        read_at: new Date().toISOString(),
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

