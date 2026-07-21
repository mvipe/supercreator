"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/supabase";
import { inr } from "@/lib/courseModel";
import { TYPE_META } from "@/lib/products";
import { useAuth } from "@/components/AuthProvider";
import { heroSurface, SHEEN } from "@/lib/texture";

const VIEWS = ["customers", "visitors"];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function Audience() {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [visits, setVisits] = useState([]);
  const [view, setView] = useState("customers");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/audience", undefined, "GET")
      .then((res) => { setSales(res.sales || []); setVisits(res.visits || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Group sales by buyer → one row per customer.
  const customers = useMemo(() => {
    const m = {};
    for (const r of sales) {
      const key = r.buyer_id || r.buyer_phone || "unknown";
      if (!m[key]) m[key] = { key, name: r.name, username: r.username, phone: r.buyer_phone, joined: r.joined, count: 0, revenue: 0, products: new Set(), types: new Set(), first: r.created_at };
      const c = m[key];
      c.count++; c.revenue += (r.amount || 0) / 100;
      c.products.add(r.product_name); c.types.add(r.product_type);
      if (!c.name && r.name) c.name = r.name;
      if (!c.username && r.username) c.username = r.username;
      if (!c.joined && r.joined) c.joined = r.joined;
      if (new Date(r.created_at) < new Date(c.first)) c.first = r.created_at;
    }
    return Object.values(m).sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  const buyerPhones = useMemo(() => new Set(sales.map((r) => r.buyer_phone).filter(Boolean)), [sales]);

  // Visitors who didn't buy.
  const nonBuyers = useMemo(() => {
    const m = {};
    for (const v of visits) {
      const phone = v.buyer_phone || null;
      if (phone && buyerPhones.has(phone)) continue;
      const key = phone || v.visitor_id || "anon";
      if (!m[key]) m[key] = { key, phone, visits: 0, last: v.created_at, first: v.created_at, pages: new Set() };
      const x = m[key];
      x.visits++; x.pages.add(v.path);
      if (new Date(v.created_at) > new Date(x.last)) x.last = v.created_at;
      if (new Date(v.created_at) < new Date(x.first)) x.first = v.created_at;
    }
    return Object.values(m).sort((a, b) => new Date(b.last) - new Date(a.last));
  }, [visits, buyerPhones]);

  const custList = customers.filter((c) => {
    const s = q.toLowerCase();
    return !s || (c.name || "").toLowerCase().includes(s) || (c.username || "").toLowerCase().includes(s) || (c.phone || "").includes(s) || [...c.products].join(" ").toLowerCase().includes(s);
  });
  const visitList = nonBuyers.filter((v) => !q || (v.phone || "").includes(q));

  function exportCsv() {
    let head, lines, name;
    if (view === "customers") {
      head = ["Name", "Username", "Phone", "Products", "Purchases", "Revenue (₹)", "First purchase", "Joined"];
      lines = custList.map((c) => [c.name || "", c.username || "", c.phone || "", [...c.products].join(" | "), c.count, c.revenue.toFixed(2), fmtDate(c.first), fmtDate(c.joined)]);
      name = "customers";
    } else {
      head = ["Phone/Visitor", "Visits", "Pages", "First seen", "Last seen"];
      lines = visitList.map((v) => [v.phone || v.key, v.visits, v.pages.size, fmtDate(v.first), fmtDate(v.last)]);
      name = "visitors";
    }
    const csv = [head, ...lines].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `SuperCreators-${name}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <section className="relative overflow-hidden px-8 pb-10 pt-8 text-white" style={heroSurface()}>
        <div className="pointer-events-none absolute inset-0" style={SHEEN} />
        <h1 className="relative font-display text-4xl font-bold drop-shadow-sm">Audience</h1>
        <p className="relative mt-1 text-sm text-white/75">Buyers and interested visitors — your growth engine.</p>
        <div className="relative mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
          <div className="rounded-card bg-white p-5 text-ink"><div className="text-xs font-semibold uppercase text-inkmuted">Customers</div><div className="mt-1 font-display text-3xl font-bold">{customers.length}</div></div>
          <div className="rounded-card bg-white p-5 text-ink"><div className="text-xs font-semibold uppercase text-inkmuted">Visitors (no buy)</div><div className="mt-1 font-display text-3xl font-bold">{nonBuyers.length}</div></div>
          <div className="rounded-card bg-white p-5 text-ink"><div className="text-xs font-semibold uppercase text-inkmuted">Lifetime value</div><div className="mt-1 font-display text-3xl font-bold">{inr(customers.reduce((a, c) => a + c.revenue, 0))}</div></div>
        </div>
      </section>

      <section className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center gap-2">
          {VIEWS.map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${view === v ? "border-ink bg-ink text-white" : "border-line bg-white text-inkmuted hover:text-ink"}`}>
              {v === "customers" ? "Customers" : "Visited · didn't buy"}
            </button>
          ))}
          <input className="input ml-auto max-w-xs" placeholder="Search name, @username, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button onClick={exportCsv} className="btn-ghost">Export CSV</button>
        </div>

        {view === "customers" ? (
          <div className="card mt-5 overflow-x-auto">
            <div className="grid min-w-[900px] grid-cols-12 gap-4 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-inkmuted">
              <div className="col-span-3">Customer</div><div className="col-span-3">Products</div>
              <div className="col-span-1 text-center">Buys</div><div className="col-span-2 text-right">Revenue</div>
              <div className="col-span-2">First buy</div><div className="col-span-1">Joined</div>
            </div>
            {loading && <div className="px-5 py-16 text-center text-sm text-inkmuted">Loading…</div>}
            {!loading && custList.length === 0 && <div className="px-5 py-16 text-center text-sm text-inkmuted">No customers yet.</div>}
            {custList.map((c) => (
              <div key={c.key} className="grid min-w-[900px] grid-cols-12 items-center gap-4 border-b border-line px-5 py-3.5 text-sm last:border-0">
                <div className="col-span-3 min-w-0">
                  <div className="truncate font-semibold">{c.name || "—"}</div>
                  <div className="truncate text-xs text-inkmuted">{c.username ? `@${c.username}` : ""}{c.username && c.phone ? " · " : ""}{c.phone ? `+${c.phone}` : ""}</div>
                </div>
                <div className="col-span-3 min-w-0">
                  <div className="truncate">{[...c.products].slice(0, 2).join(", ")}{c.products.size > 2 ? ` +${c.products.size - 2}` : ""}</div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {[...c.types].map((t) => <span key={t} className="pill bg-brand-soft text-brand">{TYPE_META[t]?.label || t}</span>)}
                  </div>
                </div>
                <div className="col-span-1 text-center font-semibold">{c.count}</div>
                <div className="col-span-2 text-right font-semibold">{inr(c.revenue)}</div>
                <div className="col-span-2">{fmtDate(c.first)}</div>
                <div className="col-span-1 text-inkmuted">{fmtDate(c.joined)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card mt-5 overflow-x-auto">
            <div className="grid min-w-[720px] grid-cols-12 gap-4 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-inkmuted">
              <div className="col-span-4">Visitor</div><div className="col-span-2">Visits</div>
              <div className="col-span-2">Pages</div><div className="col-span-2">First seen</div><div className="col-span-2 text-right">Last seen</div>
            </div>
            {loading && <div className="px-5 py-16 text-center text-sm text-inkmuted">Loading…</div>}
            {!loading && visitList.length === 0 && <div className="px-5 py-16 text-center text-sm text-inkmuted">No visitor data yet. Share your links to start seeing interested people here.</div>}
            {visitList.map((v) => (
              <div key={v.key} className="grid min-w-[720px] grid-cols-12 items-center gap-4 border-b border-line px-5 py-3.5 text-sm last:border-0">
                <div className="col-span-4 font-semibold">{v.phone ? `+${v.phone}` : <span className="text-inkmuted">Anonymous visitor</span>}</div>
                <div className="col-span-2">{v.visits}</div>
                <div className="col-span-2">{v.pages.size}</div>
                <div className="col-span-2">{fmtDate(v.first)}</div>
                <div className="col-span-2 text-right text-inkmuted">{new Date(v.last).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            ))}
          </div>
        )}
        {view === "visitors" && <p className="mt-3 text-xs text-inkmuted">Signed-in visitors show their phone; others appear anonymous. These people viewed your pages but haven't purchased — great to retarget.</p>}
      </section>
    </main>
  );
}
