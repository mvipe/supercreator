import { NextResponse } from "next/server";
import { getUserFromRequest, isStaff } from "@/lib/supabaseAdmin";

export async function GET(req) {
  const user = await getUserFromRequest(req);
  return NextResponse.json({ admin: await isStaff(user) });
}
