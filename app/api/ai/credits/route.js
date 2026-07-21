import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabaseAdmin";
import { getBalance, getPacks } from "@/lib/aiCredits";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

    const [balance, packs] = await Promise.all([getBalance(user.id), getPacks()]);
    return NextResponse.json({ balance, packs }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}