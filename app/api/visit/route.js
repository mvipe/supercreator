import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { classifySource, hostOf, deviceFromUA, browserFromUA, geoFromHeaders } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// Public: log a visit to a creator's page (fire-and-forget from the client).
export async function POST(req) {
  try {
    const body = await req.json();
    const { ownerId, path, ref, visitorId, buyerPhone, referrer, utmSource } = body;
    if (!ownerId) return NextResponse.json({ ok: false });

    // De-dupe: skip if same visitor hit same path in the last 6 hours.
    if (visitorId) {
      const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
      const { data: recent } = await supabaseAdmin.from("mp_visits").select("id")
        .eq("owner_id", ownerId).eq("visitor_id", visitorId).eq("path", path || "")
        .gte("created_at", since).maybeSingle();
      if (recent) return NextResponse.json({ ok: true, deduped: true });
    }

    // document.referrer from the client is the reliable one; the Referer
    // header is our own page on a client-side navigation.
    const refUrl = referrer || req.headers.get("referer") || "";
    const selfHost = hostOf(req.headers.get("origin") || `https://${req.headers.get("host") || ""}`);
    const ua = req.headers.get("user-agent") || "";
    const geo = geoFromHeaders(req.headers);

    await supabaseAdmin.from("mp_visits").insert({
      owner_id: ownerId,
      path: path || "",
      ref: ref || null,
      visitor_id: visitorId || null,
      buyer_phone: buyerPhone || null,
      referrer: refUrl || null,
      referrer_host: hostOf(refUrl) || null,
      source: classifySource(refUrl, selfHost, utmSource),
      device: deviceFromUA(ua),
      browser: browserFromUA(ua),
      ...geo
    });
    return NextResponse.json({ ok: true });
  } catch {
    // Analytics must never break the page it's measuring.
    return NextResponse.json({ ok: false });
  }
}