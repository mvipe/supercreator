"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/supabase";
import { inr } from "@/lib/courseModel";
import { RANGES, colorForSource, flagEmoji, COUNTRY_LATLNG, project } from "@/lib/analytics";

// =============================================================
// StoreAnalytics — referrers, locations, devices and trends.
//
// Charts are hand-drawn SVG rather than a charting library: the app has no
// chart dependency and a donut plus a bar chart aren't worth ~100KB of one.
// =============================================================

const num = (n) => Number(n || 0).toLocaleString("en-IN");

/* ---------------- small UI atoms ---------------- */

function Toggle({ options, value, onChange, size = "sm" }) {
  return (
    <div className={`inline-flex shrink-0 rounded-full bg-paper p-0.5 ${size === "xs" ? "text-[11px]" : "text-xs"}`}>
      {options.map((o) => {
        const id = o.id ?? o;
        const label = o.label ?? o;
        return (
          <button key={id} onClick={() => onChange(id)}
            className={`rounded-full px-3 py-1.5 font-semibold transition-all duration-200 ease-out ${
              value === id ? "bg-brand text-white shadow-sm" : "text-inkmuted hover:text-ink"
            }`}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Card({ title, right, children, className = "" }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-line bg-white ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <h3 className="font-display text-[15px] font-bold">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function Empty({ children = "No activity in this time range." }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-1 p-8 text-center">
      <div className="text-sm font-semibold text-inkmuted">Nothing here yet</div>
      <div className="text-sm text-inkmuted">{children}</div>
    </div>
  );
}

/* ---------------- donut ---------------- */

/** SVG arc path for one donut segment. */
function arc(cx, cy, rOuter, rInner, startPct, endPct) {
  const a = (p) => (p * 2 * Math.PI) - Math.PI / 2; // 12 o'clock start
  const [s, e] = [a(startPct), a(endPct)];
  const big = endPct - startPct > 0.5 ? 1 : 0;
  const p = (r, ang) => [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  const [x1, y1] = p(rOuter, s), [x2, y2] = p(rOuter, e);
  const [x3, y3] = p(rInner, e), [x4, y4] = p(rInner, s);
  return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${big} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${big} 0 ${x4} ${y4} Z`;
}

function Donut({ data, metric }) {
  const [hover, setHover] = useState(null);
  const total = data.reduce((a, d) => a + d.value, 0);
  if (!total) return <Empty />;

  const top = data.slice(0, 6);
  const restVal = data.slice(6).reduce((a, d) => a + d.value, 0);
  const slices = restVal > 0 ? [...top, { key: "Other", value: restVal }] : top;

  let acc = 0;
  const segs = slices.map((d, i) => {
    const from = acc / total;
    acc += d.value;
    return { ...d, from, to: acc / total, pct: (d.value / total) * 100, color: colorForSource(d.key, i) };
  });

  const active = hover !== null ? segs[hover] : null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-8 p-6">
      <div className="relative">
        <svg width="230" height="230" viewBox="0 0 230 230" role="img" aria-label={`${metric} by source`}>
          {segs.map((sg, i) => (
            <path key={sg.key} d={arc(115, 115, hover === i ? 100 : 96, 56, sg.from, sg.to)}
              fill={sg.color} opacity={hover === null || hover === i ? 1 : 0.35}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              style={{ transition: "opacity .15s, d .15s", cursor: "pointer" }} />
          ))}
          {segs.filter((sg) => sg.pct >= 8).map((sg) => {
            const mid = (sg.from + sg.to) / 2 * 2 * Math.PI - Math.PI / 2;
            const r = 76;
            return (
              <text key={sg.key} x={115 + r * Math.cos(mid)} y={115 + r * Math.sin(mid)}
                textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="12" fontWeight="700"
                style={{ pointerEvents: "none" }}>
                {Math.round(sg.pct)}%
              </text>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-2xl font-bold">{num(active ? active.value : total)}</div>
          <div className="max-w-[80px] truncate text-[11px] text-inkmuted">{active ? active.key : metric}</div>
        </div>
      </div>

      <ul className="min-w-[150px] space-y-2">
        {segs.map((sg, i) => (
          <li key={sg.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            className="flex cursor-pointer items-center gap-2.5 text-sm">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: sg.color }} />
            <span className={`min-w-0 flex-1 truncate ${hover === i ? "font-semibold text-ink" : "text-inkmuted"}`}>{sg.key}</span>
            <span className="shrink-0 font-semibold tabular-nums">{num(sg.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- bars ---------------- */

function BarList({ rows, metric, renderLabel }) {
  if (!rows.length) return <Empty />;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="divide-y divide-line">
      {rows.slice(0, 12).map((r, i) => (
        <li key={r.key} className="relative flex items-center gap-3 px-5 py-2.5 text-sm">
          <span className="absolute inset-y-0 left-0 opacity-[0.09]"
            style={{ width: `${(r.value / max) * 100}%`, background: colorForSource(r.key, i) }} />
          <span className="relative min-w-0 flex-1 truncate">{renderLabel ? renderLabel(r) : r.key}</span>
          {r.extra && <span className="relative shrink-0 text-xs text-inkmuted">{r.extra}</span>}
          <span className="relative shrink-0 font-semibold tabular-nums">{num(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- bubble map ---------------- */

/**
 * Bubbles on a graticule, positioned by country centroid.
 *
 * A true choropleth needs a topojson world file plus a map library — a lot of
 * weight for a panel most creators glance at. Bubbles read the same at this
 * size and add nothing to the bundle.
 */
function BubbleMap({ rows }) {
  const [hover, setHover] = useState(null);
  const plotted = rows.filter((r) => COUNTRY_LATLNG[r.key]);
  if (!plotted.length) {
    return <Empty>No location data yet — see the note below the map.</Empty>;
  }
  const max = Math.max(...plotted.map((r) => r.value), 1);

  return (
    <div className="relative mx-auto aspect-[2/1] w-full max-w-3xl overflow-hidden rounded-xl bg-[#F7F9FC]">
      {/* graticule */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 360 180" preserveAspectRatio="none" aria-hidden="true">
        {[...Array(11)].map((_, i) => <line key={`h${i}`} x1="0" y1={i * 18} x2="360" y2={i * 18} stroke="#E5E9F0" strokeWidth="0.5" />)}
        {[...Array(13)].map((_, i) => <line key={`v${i}`} x1={i * 30} y1="0" x2={i * 30} y2="180" stroke="#E5E9F0" strokeWidth="0.5" />)}
        <line x1="0" y1="90" x2="360" y2="90" stroke="#CBD5E1" strokeWidth="0.8" />
      </svg>

      {plotted.map((r, i) => {
        const [lat, lng] = COUNTRY_LATLNG[r.key];
        const { x, y } = project(lat, lng);
        const size = 10 + (r.value / max) * 34;
        return (
          <button key={r.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform hover:scale-110"
            style={{
              left: `${x}%`, top: `${y}%`, width: size, height: size,
              background: "rgba(46,110,247,0.28)", border: "1.5px solid #2E6EF7"
            }}
            aria-label={`${r.name}: ${r.value}`}>
            {hover === i && (
              <span className="pointer-events-none absolute bottom-[120%] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] font-semibold text-white shadow-lg">
                {flagEmoji(r.key)} {r.name} · {num(r.value)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- trend ---------------- */

function TrendChart({ series, bucket }) {
  const [hover, setHover] = useState(null);
  if (!series?.length) return <Empty />;
  const max = Math.max(...series.map((s) => Math.max(s.visits, s.clicks)), 1);
  const W = 720, H = 180, pad = 8;
  const bw = (W - pad * 2) / series.length;

  const fmt = (k) => {
    const d = new Date(k);
    if (bucket === "month") return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <div className="p-5">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" role="img" aria-label="Visits over time">
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={pad} y1={H - g * (H - 30)} x2={W - pad} y2={H - g * (H - 30)} stroke="#E5E9F0" strokeWidth="1" strokeDasharray="3 3" />
        ))}
        {series.map((s, i) => {
          const h = (s.visits / max) * (H - 34);
          const ch = (s.clicks / max) * (H - 34);
          const x = pad + i * bw;
          return (
            <g key={s.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x} y={0} width={bw} height={H} fill={hover === i ? "rgba(46,110,247,0.06)" : "transparent"} />
              <rect x={x + bw * 0.22} y={H - 14 - h} width={bw * 0.3} height={Math.max(h, s.visits ? 2 : 0)} rx="2" fill="#2E6EF7" />
              <rect x={x + bw * 0.52} y={H - 14 - ch} width={bw * 0.3} height={Math.max(ch, s.clicks ? 2 : 0)} rx="2" fill="#7C3AED" />
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[11px] text-inkmuted">
        <span>{fmt(series[0].key)}</span>
        {hover !== null && (
          <span className="font-semibold text-ink">
            {fmt(series[hover].key)} · {num(series[hover].visits)} visits · {num(series[hover].clicks)} clicks
          </span>
        )}
        <span>{fmt(series[series.length - 1].key)}</span>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-inkmuted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Visits</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#7C3AED]" /> Clicks</span>
      </div>
    </div>
  );
}

/* ---------------- page ---------------- */

// Default the custom picker to the last 7 days, in yyyy-mm-dd for <input type=date>.
const isoDay = (d) => new Date(d).toISOString().slice(0, 10);

export default function StoreAnalytics() {
  const [range, setRange] = useState("month");
  const [customFrom, setCustomFrom] = useState(isoDay(Date.now() - 6 * 86400000));
  const [customTo, setCustomTo] = useState(isoDay(Date.now()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Top Referrers controls
  const [refView, setRefView] = useState("chart");
  const [refCount, setRefCount] = useState("total");
  const [refMetric, setRefMetric] = useState("visits");

  // Top Locations controls
  const [locView, setLocView] = useState("map");
  const [locGran, setLocGran] = useState("country");
  const [locCount, setLocCount] = useState("total");
  const [locMetric, setLocMetric] = useState("visits");

  useEffect(() => {
    let q = `/api/store/analytics?range=${range}&t=${Date.now()}`;
    if (range === "custom") {
      if (!customFrom || !customTo) return; // wait until both dates are chosen
      q += `&from=${customFrom}&to=${customTo}`;
    }
    setLoading(true); setErr("");
    apiFetch(q, undefined, "GET")
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [range, customFrom, customTo]);

  const referrerRows = useMemo(() => {
    if (!data) return [];
    return data.referrers.map((r) => ({
      key: r.key,
      value: refMetric === "clicks" ? r.clicks : (refCount === "unique" ? r.unique : r.total)
    })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  }, [data, refCount, refMetric]);

  const locationRows = useMemo(() => {
    if (!data) return [];
    const src = locGran === "city" ? data.cities : data.countries;
    return src.map((r) => {
      const value = locMetric === "clicks" ? r.clicks : locMetric === "ctr" ? r.ctr : (locCount === "unique" ? r.unique : r.total);
      return {
        key: locGran === "city" ? r.key : r.key,
        name: locGran === "city" ? r.city : r.name,
        countryCode: locGran === "city" ? r.countryCode : r.key,
        value,
        extra: locMetric === "ctr" ? "%" : undefined
      };
    }).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  }, [data, locGran, locCount, locMetric]);

  if (loading && !data) return <div className="p-8 text-center text-sm text-inkmuted">Loading analytics…</div>;
  if (err) return <div className="rounded-2xl border border-danger/30 bg-red-50 p-5 text-sm text-danger"><b>Couldn&rsquo;t load analytics.</b> {err}</div>;
  if (!data) return null;

  const t = data.totals;

  return (
    <div className="space-y-4">
      {/* range */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Store analytics</h2>
          <p className="text-sm text-inkmuted">Where your visitors come from, and what they do.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input h-9 w-auto py-0 text-sm font-semibold" value={range} onChange={(e) => setRange(e.target.value)}>
            {RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          {range === "custom" && (
            <div className="flex items-center gap-1.5 text-xs text-inkmuted">
              <input type="date" value={customFrom} max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-line bg-white px-2 py-1.5 text-ink" />
              <span>→</span>
              <input type="date" value={customTo} min={customFrom || undefined} max={isoDay(Date.now())}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-line bg-white px-2 py-1.5 text-ink" />
            </div>
          )}
          {loading && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-inkmuted">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Updating…
            </span>
          )}
        </div>
      </div>

      {/* Data area fades gently while a new range loads, so switching filters
          feels smooth instead of blanking out and snapping back. */}
      <div className={`space-y-4 transition-opacity duration-300 ${loading ? "opacity-40" : "opacity-100"}`} aria-busy={loading}>
      {data.warnings?.map((w) => (
        <div key={w} className="rounded-[8px] border border-[#F5D48A] bg-[#FEF3C7] p-3 text-sm text-[#92600A]">{w}</div>
      ))}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Visits" value={num(t.visits)} />
        <Kpi label="Unique" value={num(t.uniques)} />
        <Kpi label="Clicks" value={num(t.clicks)} />
        <Kpi label="CTR" value={`${t.ctr}%`} hint="Clicks ÷ visits" />
        <Kpi label="Sales" value={num(t.sales)} />
        <Kpi label="Revenue" value={inr(t.revenue)} />
      </div>

      <Card title="Visits & clicks over time">
        <TrendChart series={data.series} bucket={data.bucket} />
      </Card>

      {/* ---- Top Referrers ---- */}
      <Card
        title="Top Referrers"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Toggle size="xs" options={[{ id: "chart", label: "Chart" }, { id: "list", label: "List" }]} value={refView} onChange={setRefView} />
            <Toggle size="xs" options={[{ id: "total", label: "Total" }, { id: "unique", label: "Unique" }]} value={refCount} onChange={setRefCount} />
          </div>
        }
      >
        <div className="flex justify-end border-b border-line px-5 py-2">
          <Toggle size="xs" options={[{ id: "visits", label: "Visits" }, { id: "clicks", label: "Clicks" }]} value={refMetric} onChange={setRefMetric} />
        </div>
        {refView === "chart"
          ? <Donut data={referrerRows} metric={refMetric === "clicks" ? "Clicks" : "Visits"} />
          : <BarList rows={referrerRows} metric={refMetric} />}
      </Card>

      {/* ---- Top Locations ---- */}
      <Card
        title="Top Locations"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Toggle size="xs" options={[{ id: "map", label: "Map" }, { id: "list", label: "List" }]} value={locView} onChange={setLocView} />
            <Toggle size="xs" options={[{ id: "total", label: "Total" }, { id: "unique", label: "Unique" }]} value={locCount} onChange={setLocCount} />
          </div>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-2">
          <Toggle size="xs" options={[{ id: "country", label: "Country" }, { id: "city", label: "City" }]} value={locGran} onChange={setLocGran} />
          <Toggle size="xs" options={[{ id: "visits", label: "Visits" }, { id: "clicks", label: "Clicks" }, { id: "ctr", label: "CTR" }]} value={locMetric} onChange={setLocMetric} />
        </div>

        {locView === "map" && locGran === "country"
          ? <div className="p-5"><BubbleMap rows={locationRows} /></div>
          : <BarList rows={locationRows} renderLabel={(r) => <span className="flex items-center gap-2">{flagEmoji(r.countryCode)} {r.name}</span>} />}

        {!data.hasGeo && (
          <p className="border-t border-line bg-paper px-5 py-3 text-xs text-inkmuted">
            No location data yet. Country/city come from your host&rsquo;s geo headers — Vercel and
            Cloudflare provide them automatically; other hosts may not, in which case this panel
            stays empty rather than guessing.
          </p>
        )}
      </Card>

      {/* ---- extras ---- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Devices">
          <BarList rows={data.devices.map((d) => ({ key: d.key, value: d.total }))} />
        </Card>
        <Card title="Browsers">
          <BarList rows={data.browsers.map((d) => ({ key: d.key, value: d.total }))} />
        </Card>
        <Card title="Most clicked">
          <BarList rows={data.topClicked.map((d) => ({ key: d.key, value: d.total }))} />
        </Card>
        <Card title="Top pages">
          <BarList rows={data.pages.map((d) => ({ key: d.key, value: d.total }))} />
        </Card>
      </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-3.5" title={hint}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-inkmuted">{label}</div>
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
    </div>
  );
}