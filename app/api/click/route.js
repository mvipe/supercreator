import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { classifySource, hostOf, deviceFromUA, geoFromHeaders } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * Public: log a click on a store link / product / social.
 * Fire-and-forget — a failure here must never block the navigation the user
 * actually asked for.
 */
export async function POST(req) {
  try {
    const { ownerId, path, targetType, targetId, label, visitorId, referrer, utmSource } = await req.json();
    if (!ownerId) return NextResponse.json({ ok: false });

    const refUrl = referrer || req.headers.get("referer") || "";
    const selfHost = hostOf(req.headers.get("origin") || `https://${req.headers.get("host") || ""}`);
    const ua = req.headers.get("user-agent") || "";
    const geo = geoFromHeaders(req.headers);

    await supabaseAdmin.from("mp_clicks").insert({
      owner_id: ownerId,
      visitor_id: visitorId || null,
      path: path || "",
      target_type: targetType || "link",
      target_id: targetId ? String(targetId) : null,
      label: label || null,
      referrer_host: hostOf(refUrl) || null,
      source: classifySource(refUrl, selfHost, utmSource),
      device: deviceFromUA(ua),
      ...geo
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}