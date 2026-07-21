import { NextResponse } from "next/server";
import { getUserFromRequest, isAdmin } from "@/lib/supabaseAdmin";

export async function GET(req) {
  const user = await getUserFromRequest(req);
  return NextResponse.json({ admin: isAdmin(user) });
}
