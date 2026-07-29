import { supabaseAdmin, getUserFromRequest, isStaff } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is superadmin
    const { data: profile } = await supabaseAdmin
      .from("mp_profiles")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    const superAdmin = profile?.plan === "superadmin" || await isStaff(user);
    if (!superAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get platform settings
    const { data: settings } = await supabaseAdmin
      .from("mp_platform_settings")
      .select("free_plan_commission, pro_plan_commission, pro_plan_price")
      .maybeSingle();

    const defaultSettings = {
      free_plan_commission: 30,
      pro_plan_commission: 10,
      pro_plan_price: 4.99,
    };

    const settingsObj = settings || defaultSettings;
    return NextResponse.json({
      settings: {
        free_plan_commission: Number(settingsObj.free_plan_commission ?? 30),
        pro_plan_commission: Number(settingsObj.pro_plan_commission ?? 10),
        pro_plan_price: Number(settingsObj.pro_plan_price ?? 4.99),
      },
    });
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

    // Check if user is superadmin
    const { data: profile } = await supabaseAdmin
      .from("mp_profiles")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    const superAdmin = profile?.plan === "superadmin" || await isStaff(user);
    if (!superAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { free_plan_commission, pro_plan_commission, pro_plan_price } = await req.json();

    // Validate commission rates
    if (
      typeof free_plan_commission !== "number" ||
      typeof pro_plan_commission !== "number" ||
      free_plan_commission < 0 ||
      free_plan_commission > 100 ||
      pro_plan_commission < 0 ||
      pro_plan_commission > 100 ||
      typeof pro_plan_price !== "number" ||
      pro_plan_price < 0
    ) {
      return NextResponse.json(
        { error: "Invalid settings values" },
        { status: 400 }
      );
    }

    // Upsert settings (if exists, update; if not, insert)
    const { data: settings, error } = await supabaseAdmin
      .from("mp_platform_settings")
      .upsert(
        {
          id: 1, // Single settings record
          free_plan_commission,
          pro_plan_commission,
          pro_plan_price,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      settings: {
        free_plan_commission: Number(settings.free_plan_commission ?? 30),
        pro_plan_commission: Number(settings.pro_plan_commission ?? 10),
        pro_plan_price: Number(settings.pro_plan_price ?? 4.99),
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
