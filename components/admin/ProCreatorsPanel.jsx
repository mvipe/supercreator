"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/supabase";
import { inr } from "@/lib/courseModel";

// =============================================================
// Admin → Pro Creators. Everyone on (or recently off) the Pro plan:
// where their Pro came from, when it ends, what they've paid — with
// extend / set-expiry / revoke, and a quick "grant Pro" for anyone else.
// =============================================================

const FILTERS = [
  ["active", "Active"], ["paid", "Paid"], ["comp", "Free (granted)"],
  ["expiring", "Expiring ≤ 7 days"], ["expired", "Expired"], ["all", "All"]
];
const SOURCE_PILL = {
  paid: "bg-teal-soft text-teal",
  comp: "bg-brand-soft text-brand",
  staff: "bg-paper text-inkmuted"
};
const SOURCE_LABEL = { paid: "Paid", comp: "Granted", staff: "Staff" };
const GRANT_OPTIONS = [["30", "30 days"], ["90", "90 days"], ["180", "6 months"], ["365", "1 year"], ["lifetime", "Lifetime"]];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default function ProCreatorsPanel() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("active");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [manage, setManage] = useState(null);   // row being managed
  const [days, setDays] = useState("30");
  const [date, setDate] = useState("");
  const [showGrant, setShowGrant] = useState(false);

  async function load() {
    setErr("");
    try {
      const res = await apiFetch("/api/admin/pro-creators", undefined, "GET");
      setRows(res.creators || []);
      setStats(res.stats || null);
    } catch (e) { setErr(e.message); }
    finally { setReady(true); }
  }
  useEffect(() => { load(); }, []);

  async function act(userId, body, confirmText) {
    if (confirmText && !confirm(confirmText)) return false;
    setBusyId(userId);
    try {
      await apiFetch("/api/admin/pro-creators", { userId, ...body }, "PATCH");
      await load();
      return true;
    } catch (e) { alert(e.message); return false; }
    finally { setBusyId(null); }
  }

  const list = useMemo(() => {
    const s = q.toLowerCase().trim();
    return rows.filter((r) => {
      if (filter === "active" && r.status !== "active") return false;
      if (filter === "paid" && !(r.status === "active" && r.source === "paid")) return false;
      if (filter === "comp" && !(r.status === "active" && r.source === "comp")) return false;
      if (filter === "expiring" && !(r.status === "active" && r.daysLeft !== null && r.daysLeft <= 7)) return false;
      if (filter === "expired" && r.status !== "expired") return false;
      if (!s) return true;
      return [r.name, r.username, r.email, r.phone].some((v) => (v || "").toLowerCase().includes(s));
    });
  }, [rows, filter, q]);

  function exportCsv() {
    const head = ["Name", "Username", "Email", "Phone", "Status", "Source", "Expires", "Days left", "Payments", "Paid (INR)", "Last paid"];
    const lines = list.map((r) => [r.name, r.username || "", r.email || "", r.phone || "", r.status, SOURCE_LABEL[r.source],
      r.lifetime ? "Lifetime" : (r.expiresAt || ""), r.daysLeft ?? "", r.payments, r.paidTotal, r.lastPaidAt || ""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const url = URL.createObjectURL(new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `pro-creators-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (!ready) return <div className="flex min-h-[50vh] items-center justify-center text-inkmuted">Loading…</div>;

  return (
    <section className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Pro creators</h2>
          <p className="mt-0.5 text-sm text-inkmuted">Everyone on the Pro plan — paid or granted — with expiry and payment history.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input className="input max-w-xs" placeholder="Search name, @user, email, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button onClick={load} className="btn-ghost shrink-0">Refresh</button>
          <button onClick={exportCsv} disabled={!list.length} className="btn-ghost shrink-0">Export CSV</button>
          <button onClick={() => setShowGrant(true)} className="btn-brand shrink-0">+ Grant Pro</button>
        </div>
      </div>

      {err && <div className="mt-4 rounded-[8px] border border-danger/30 bg-red-50 p-4 text-sm text-danger"><b>Couldn&apos;t load Pro creators.</b> {err}</div>}

      {stats && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Active Pro" value={stats.active} />
          <Stat label="Paid" value={stats.paid} />
          <Stat label="Granted free" value={stats.comp} />
          <Stat label="Expiring ≤ 7d" value={stats.expiringSoon} tone={stats.expiringSoon ? "warn" : ""} />
          <Stat label="Expired" value={stats.expired} />
          <Stat label="Subscription revenue" value={inr(stats.revenue)} />
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${filter === id ? "border-ink bg-ink text-white" : "border-line bg-white text-inkmuted hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="card mt-5 overflow-x-auto">
        <div className="grid min-w-[980px] grid-cols-12 gap-4 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-inkmuted">
          <div className="col-span-3">Creator</div><div className="col-span-1">Source</div><div className="col-span-2">Expires</div>
          <div className="col-span-2">Payments</div><div className="col-span-1 text-center">Status</div><div className="col-span-3 text-right">Action</div>
        </div>
        {list.length === 0 && <div className="px-5 py-16 text-center text-sm text-inkmuted">No creators in this view.</div>}
        {list.map((r) => (
          <div key={r.userId} className="grid min-w-[980px] grid-cols-12 items-center gap-4 border-b border-line px-5 py-3.5 text-sm last:border-0">
            <div className="col-span-3 min-w-0">
              <div className="truncate font-semibold">{r.name}{r.blocked && <span className="pill ml-2 bg-red-50 text-danger">blocked</span>}</div>
              <div className="truncate text-xs text-inkmuted">
                {r.username ? <a href={`/u/${r.username}`} target="_blank" rel="noopener noreferrer" className="hover:underline">@{r.username}</a> : "no store"}
                {r.email ? ` · ${r.email}` : r.phone ? ` · +${String(r.phone).replace(/^\+/, "")}` : ""}
              </div>
            </div>
            <div className="col-span-1"><span className={`pill ${SOURCE_PILL[r.source]}`}>{SOURCE_LABEL[r.source]}</span></div>
            <div className="col-span-2">
              {r.source === "staff" ? <span className="text-inkmuted">Always</span>
                : r.lifetime ? <span className="font-semibold">Lifetime</span>
                : <>
                    <div className="font-semibold">{fmtDate(r.expiresAt)}</div>
                    {r.daysLeft !== null && (
                      <div className={`text-xs ${r.daysLeft <= 7 ? "font-semibold text-[#92600A]" : "text-inkmuted"}`}>{r.daysLeft} day{r.daysLeft === 1 ? "" : "s"} left</div>
                    )}
                    {r.status === "expired" && <div className="text-xs text-danger">ended</div>}
                  </>}
            </div>
            <div className="col-span-2">
              {r.payments ? (
                <>
                  <div className="font-semibold">{inr(r.paidTotal)} <span className="font-normal text-inkmuted">· {r.payments}×</span></div>
                  <div className="text-xs text-inkmuted">last {fmtDate(r.lastPaidAt)}</div>
                </>
              ) : <span className="text-xs text-inkmuted">No payments</span>}
            </div>
            <div className="col-span-1 text-center">
              <span className={`pill ${r.status === "active" ? "bg-teal-soft text-teal" : "bg-red-50 text-danger"}`}>{r.status === "active" ? "Active" : "Expired"}</span>
            </div>
            <div className="col-span-3 flex flex-wrap justify-end gap-2">
              {r.source === "staff" ? <span className="text-xs text-inkmuted">Managed via sub-admin</span> : (
                <>
                  <button onClick={() => act(r.userId, { action: "extend", days: 30 })} disabled={busyId === r.userId} className="btn-ghost text-xs">
                    {busyId === r.userId ? "…" : r.status === "active" ? "+30 days" : "Renew 30 days"}
                  </button>
                  <button onClick={() => { setManage(r); setDays("30"); setDate(r.expiresAt && !r.lifetime ? r.expiresAt.slice(0, 10) : ""); }}
                    disabled={busyId === r.userId} className="btn-ghost text-xs">Manage</button>
                  {r.status === "active" && (
                    <button onClick={() => act(r.userId, { action: "revoke" }, `Revoke Pro from ${r.name}? They drop to the Free plan immediately.`)}
                      disabled={busyId === r.userId} className="btn-ghost text-xs text-danger">Revoke</button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {manage && (
        <Modal title={`Manage Pro — ${manage.name}`} onClose={() => setManage(null)}>
          <p className="text-sm text-inkmuted">
            Currently: <b className="text-ink">{manage.lifetime ? "Lifetime" : manage.status === "active" ? `until ${fmtDate(manage.expiresAt)}` : `expired ${fmtDate(manage.expiresAt)}`}</b>
          </p>
          <div className="mt-4">
            <label className="label">Extend by</label>
            <div className="flex gap-2">
              <select className="input" value={days} onChange={(e) => setDays(e.target.value)}>
                {GRANT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button className="btn-brand shrink-0" disabled={busyId === manage.userId}
                onClick={async () => { if (await act(manage.userId, { action: "extend", days })) setManage(null); }}>Extend</button>
            </div>
            <p className="mt-1 text-xs text-inkmuted">Added on top of the current expiry (or from today if it has already ended).</p>
          </div>
          <div className="mt-5">
            <label className="label">…or set an exact expiry date</label>
            <div className="flex gap-2">
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
              <button className="btn-ink shrink-0" disabled={!date || busyId === manage.userId}
                onClick={async () => { if (await act(manage.userId, { action: "set", expiresAt: date })) setManage(null); }}>Set date</button>
            </div>
          </div>
          {manage.status === "active" && (
            <div className="mt-6 border-t border-line pt-4">
              <button className="text-sm font-semibold text-danger" disabled={busyId === manage.userId}
                onClick={async () => { if (await act(manage.userId, { action: "revoke" }, `Revoke Pro from ${manage.name}?`)) setManage(null); }}>
                Revoke Pro now
              </button>
            </div>
          )}
        </Modal>
      )}

      {showGrant && <GrantModal proIds={new Set(rows.filter((r) => r.status === "active").map((r) => r.userId))}
        onClose={() => setShowGrant(false)} onDone={() => { setShowGrant(false); load(); }} />}
    </section>
  );
}

/** Search any creator who isn't Pro and grant them a plan. */
function GrantModal({ proIds, onClose, onDone }) {
  const [all, setAll] = useState(null);
  const [q, setQ] = useState("");
  const [pick, setPick] = useState(null);
  const [days, setDays] = useState("30");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    apiFetch("/api/admin/creators", undefined, "GET")
      .then((res) => setAll((res.creators || []).filter((c) => !proIds.has(c.user_id) && !c.isPro)))
      .catch((e) => { setErr(e.message); setAll([]); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const s = q.toLowerCase().trim();
  const matches = (all || []).filter((c) => !s || [c.username, c.display_name, c.full_name, c.email, c.phone_number]
    .some((v) => String(v || "").toLowerCase().includes(s))).slice(0, 30);

  async function grant() {
    setBusy(true); setErr("");
    try {
      await apiFetch("/api/admin/pro-creators", { userId: pick.user_id, action: "grant", days }, "PATCH");
      onDone();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Modal title="Grant Pro to a creator" onClose={onClose}>
      {!pick ? (
        <>
          <input className="input" autoFocus placeholder="Search name, @user, email, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="mt-3 max-h-80 divide-y divide-line overflow-y-auto rounded-xl border border-line">
            {all === null && <div className="p-6 text-center text-sm text-inkmuted">Loading creators…</div>}
            {all && matches.length === 0 && <div className="p-6 text-center text-sm text-inkmuted">No non-Pro creators match.</div>}
            {matches.map((c) => (
              <button key={c.user_id} onClick={() => setPick(c)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-paper">
                <span className="min-w-0 flex-1 truncate font-semibold">{c.full_name || c.display_name || c.username || "Creator"}</span>
                <span className="shrink-0 truncate text-xs text-inkmuted">{c.username ? `@${c.username}` : c.email || c.phone_number || ""}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="rounded-xl border border-line bg-paper px-4 py-3 text-sm">
            <b>{pick.full_name || pick.display_name || pick.username}</b>
            <span className="ml-2 text-inkmuted">{pick.username ? `@${pick.username}` : pick.email || ""}</span>
            <button onClick={() => setPick(null)} className="ml-3 text-xs font-semibold text-brand">Change</button>
          </div>
          <label className="label mt-4">Duration</label>
          <select className="input" value={days} onChange={(e) => setDays(e.target.value)}>
            {GRANT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <p className="mt-1 text-xs text-inkmuted">Free grant — no payment is taken.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={grant} disabled={busy} className="btn-brand">{busy ? "Granting…" : "Grant Pro"}</button>
          </div>
        </>
      )}
      {err && <p className="mt-3 text-sm text-danger">{err}</p>}
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <div className="my-auto w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-inkmuted hover:bg-paper" aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${tone === "warn" ? "border-[#F5D48A] bg-[#FEF3C7]" : "border-line bg-paper"}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-inkmuted">{label}</div>
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
    </div>
  );
}
