import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { data: settings } = await supabaseAdmin
      .from("mp_platform_settings")
      .select("free_plan_commission, pro_plan_commission, pro_plan_price")
      .maybeSingle();

    const freePlanCommission = Number(settings?.free_plan_commission ?? 30);
    const proPlanCommission = Number(settings?.pro_plan_commission ?? 10);
    const proPlanPriceRupees = Number(settings?.pro_plan_price ?? 4.99);
    const safeProPlanPriceRupees = Number.isNaN(proPlanPriceRupees) ? 4.99 : proPlanPriceRupees;
    const proPlanPricePaise = Math.round(safeProPlanPriceRupees * 100);

    return NextResponse.json({
      freePlanCommission,
      proPlanCommission,
      proPlanPriceRupees: safeProPlanPriceRupees,
      proPlanPricePaise,
      proPlanPriceDisplay: `₹${safeProPlanPriceRupees.toFixed(2)}`,
    });
  } catch (error) {
    return NextResponse.json({
      freePlanCommission: 30,
      proPlanCommission: 10,
      proPlanPriceRupees: 4.99,
      proPlanPricePaise: 499,
      proPlanPriceDisplay: "₹4.99",
    });
  }
}
