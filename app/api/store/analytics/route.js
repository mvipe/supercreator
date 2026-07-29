import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";
import { rangeDays, bucketFor, countryName } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const MAX_ROWS = 20000; // plenty for a creator store; keeps the query bounded

/** Truncate a date to the start of its bucket. */
function bucketKey(d, bucket) {
  const t = new Date(d);
  if (bucket === "month") return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-01`;
  if (bucket === "week") {
    const day = (t.getDay() + 6) % 7;            // Monday-start
    t.setDate(t.getDate() - day);
  }
  return t.toISOString().slice(0, 10);
}

/** Every bucket in the window, so the chart shows real gaps as zero. */
function emptySeries(from, to, bucket) {
  const out = [];
  const cur = new Date(bucketKey(from, bucket));
  const end = new Date(bucketKey(to, bucket));
  let guard = 0;
  while (cur <= end && guard++ < 800) {
    out.push({ key: bucketKey(cur, bucket), visits: 0, uniques: 0, clicks: 0 });
    if (bucket === "month") cur.setMonth(cur.getMonth() + 1);
    else if (bucket === "week") cur.setDate(cur.getDate() + 7);
    else cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Group rows by a key, counting rows and distinct visitors. */
function tally(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (k === null || k === undefined || k === "") continue;
    let e = m.get(k);
    if (!e) { e = { key: k, total: 0, visitors: new Set() }; m.set(k, e); }
    e.total += 1;
    if (r.visitor_id) e.visitors.add(r.visitor_id);
  }
  return [...m.values()]
    .map((e) => ({ key: e.key, total: e.total, unique: e.visitors.size || e.total }))
    .sort((a, b) => b.total - a.total);
}

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

    const url = new URL(req.url);
    const range = url.searchParams.get("range") || "30d";

    // Resolve the [from, to] window. Most ranges are a rolling N-day window;
    // "yesterday" is the previous calendar day; "custom" takes explicit bounds.
    let from, to, bucket;
    if (range === "today") {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      from = start; to = new Date(); bucket = bucketFor("today");
    } else if (range === "yesterday") {
      const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 1);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      from = start; to = end; bucket = bucketFor("yesterday");
    } else if (range === "custom") {
      const fp = url.searchParams.get("from");
      const tp = url.searchParams.get("to");
      const start = fp ? new Date(fp) : new Date(Date.now() - 30 * 86400000);
      const end = tp ? new Date(tp) : new Date();
      if (isNaN(start) || isNaN(end)) return NextResponse.json({ error: "Invalid custom date range." }, { status: 400 });
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      from = start <= end ? start : end;
      to = start <= end ? end : start;
      const spanDays = Math.max(1, Math.round((to - from) / 86400000));
      bucket = bucketFor("custom", spanDays);
    } else {
      const days = rangeDays(range);
      bucket = bucketFor(range);
      to = new Date();
      from = days ? new Date(to.getTime() - days * 86400000) : new Date("2020-01-01");
    }
    const bounded = range !== "all";

    let vq = supabaseAdmin.from("mp_visits")
      .select("visitor_id, source, referrer_host, country_code, country, city, device, browser, path, created_at")
      .eq("owner_id", user.id).order("created_at", { ascending: true }).limit(MAX_ROWS);
    let cq = supabaseAdmin.from("mp_clicks")
      .select("visitor_id, source, country_code, country, city, device, target_type, target_id, label, created_at")
      .eq("owner_id", user.id).order("created_at", { ascending: true }).limit(MAX_ROWS);
    let pq = supabaseAdmin.from("mp_purchases")
      .select("amount, creator_amount, created_at").eq("owner_id", user.id);

    if (bounded) {
      const fromIso = from.toISOString();
      const toIso = to.toISOString();
      vq = vq.gte("created_at", fromIso).lte("created_at", toIso);
      cq = cq.gte("created_at", fromIso).lte("created_at", toIso);
      pq = pq.gte("created_at", fromIso).lte("created_at", toIso);
    }

    const [vr, cr, pr] = await Promise.all([vq, cq, pq]);

    // mp_clicks / the new columns only exist after analytics-pack.sql. Degrade
    // instead of 500-ing the whole panel.
    const warnings = [];
    if (vr.error) throw vr.error;
    if (cr.error) warnings.push("Click tracking isn't set up yet — run supabase/analytics-pack.sql.");

    const visits = vr.data || [];
    const clicks = cr.error ? [] : (cr.data || []);
    const purchases = pr.error ? [] : (pr.data || []);

    /* ---- time series ---- */
    const series = emptySeries(from, to, bucket);
    const idx = Object.fromEntries(series.map((s, i) => [s.key, i]));
    const seenPerBucket = {};
    for (const v of visits) {
      const k = bucketKey(v.created_at, bucket);
      const i = idx[k];
      if (i === undefined) continue;
      series[i].visits += 1;
      (seenPerBucket[k] ||= new Set()).add(v.visitor_id || Math.random());
    }
    for (const c of clicks) {
      const i = idx[bucketKey(c.created_at, bucket)];
      if (i !== undefined) series[i].clicks += 1;
    }
    for (const s of series) s.uniques = seenPerBucket[s.key]?.size || 0;

    /* ---- breakdowns ---- */
    const referrers = tally(visits, (v) => v.source || "Direct");
    const refClicks = tally(clicks, (c) => c.source || "Direct");
    const countries = tally(visits.filter((v) => v.country_code), (v) => v.country_code);
    const cities = tally(visits.filter((v) => v.city), (v) => `${v.city}|${v.country_code || ""}`);
    const countryClicks = tally(clicks.filter((c) => c.country_code), (c) => c.country_code);
    const cityClicks = tally(clicks.filter((c) => c.city), (c) => `${c.city}|${c.country_code || ""}`);

    const clicksByRef = Object.fromEntries(refClicks.map((r) => [r.key, r.total]));
    const clicksByCountry = Object.fromEntries(countryClicks.map((r) => [r.key, r.total]));
    const clicksByCity = Object.fromEntries(cityClicks.map((r) => [r.key, r.total]));

    const uniqueVisitors = new Set(visits.map((v) => v.visitor_id).filter(Boolean)).size;
    const revenue = purchases.reduce((a, p) => a + ((p.creator_amount ?? p.amount) || 0), 0);

    return NextResponse.json({
      range,
      bucket,
      from: from.toISOString(),
      to: to.toISOString(),
      totals: {
        visits: visits.length,
        uniques: uniqueVisitors,
        clicks: clicks.length,
        ctr: visits.length ? +((clicks.length / visits.length) * 100).toFixed(1) : 0,
        sales: purchases.length,
        revenue: revenue / 100,
        conversion: visits.length ? +((purchases.length / visits.length) * 100).toFixed(2) : 0
      },
      series,
      referrers: referrers.map((r) => ({ ...r, clicks: clicksByRef[r.key] || 0 })),
      countries: countries.map((c) => ({
        ...c, name: countryName(c.key), clicks: clicksByCountry[c.key] || 0,
        ctr: c.total ? +(((clicksByCountry[c.key] || 0) / c.total) * 100).toFixed(1) : 0
      })),
      cities: cities.map((c) => {
        const [city, cc] = c.key.split("|");
        return {
          key: c.key, city, countryCode: cc, total: c.total, unique: c.unique,
          clicks: clicksByCity[c.key] || 0,
          ctr: c.total ? +(((clicksByCity[c.key] || 0) / c.total) * 100).toFixed(1) : 0
        };
      }),
      devices: tally(visits, (v) => v.device || "Unknown"),
      browsers: tally(visits, (v) => v.browser || "Other"),
      pages: tally(visits, (v) => v.path || "/"),
      topClicked: tally(clicks, (c) => c.label || c.target_id || c.target_type).slice(0, 10),
      hasGeo: countries.length > 0,
      warnings
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}