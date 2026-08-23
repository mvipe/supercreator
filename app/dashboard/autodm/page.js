"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { heroSurface, SHEEN } from "@/lib/texture";
import ConnectPanel from "@/components/autodm/ConnectPanel";
import RuleModal from "@/components/autodm/RuleModal";

const TABS = ["automations", "activity"];

const fmtWhen = (d) => {
  if (!d) return "—";
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const STATUS_STYLE = {
  sent: "bg-teal-soft text-teal",
  replied: "bg-teal-soft text-teal",
  skipped: "bg-paper text-inkmuted",
  failed: "bg-danger/10 text-danger"
};

export default function AutoDM() {
  const { user } = useAuth();

  const [status, setStatus] = useState(null);
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ sent: 0, failed: 0, skipped: 0 });
  const [tab, setTab] = useState("automations");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, rule: null });
  const [notice, setNotice] = useState("");
  const [test, setTest] = useState({ comment: "", result: null, busy: false });

  const load = useCallback(async () => {
    try {
      const [s, r, l] = await Promise.all([
        apiFetch("/api/instagram/account", undefined, "GET"),
        apiFetch("/api/autodm/rules", undefined, "GET").catch(() => ({ rules: [] })),
        apiFetch("/api/autodm/logs", undefined, "GET").catch(() => ({ logs: [], stats: {} }))
      ]);
      setStatus(s);
      setRules(r.rules || []);
      setLogs(l.logs || []);
      setStats(l.stats || { sent: 0, failed: 0, skipped: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  // Read the OAuth callback result off the URL, then clean it up. Done on the
  // client (not useSearchParams) so the route still prerenders.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const connected = p.get("connected");
    const error = p.get("error");
    if (connected) setNotice(`Instagram connected${connected !== "1" ? ` as @${connected}` : ""} 🎉`);
    if (error) setNotice(error);
    if (connected || error) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const account = status?.account;
  const liveCount = useMemo(() => rules.filter((r) => r.active).length, [rules]);
  const totalSent = useMemo(() => rules.reduce((a, r) => a + (r.sent_count || 0), 0), [rules]);

  async function toggle(rule) {
    setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, active: !r.active } : r)));
    try { await apiFetch(`/api/autodm/rules/${rule.id}`, { active: !rule.active }, "PATCH"); }
    catch { load(); }
  }

  async function remove(rule) {
    if (!confirm(`Delete "${rule.name}"? Its activity history is kept.`)) return;
    setRules((rs) => rs.filter((r) => r.id !== rule.id));
    try { await apiFetch(`/api/autodm/rules/${rule.id}`, undefined, "DELETE"); }
    catch { load(); }
  }

  function saved(rule) {
    setRules((rs) => (rs.some((r) => r.id === rule.id) ? rs.map((r) => (r.id === rule.id ? rule : r)) : [rule, ...rs]));
  }

  async function runTest() {
    setTest((t) => ({ ...t, busy: true, result: null }));
    try {
      const res = await apiFetch("/api/autodm/simulate", { comment: test.comment });
      setTest((t) => ({ ...t, busy: false, result: res }));
    } catch (e) {
      setTest((t) => ({ ...t, busy: false, result: { matched: false, error: e.message } }));
    }
  }

  return (
    <main>
      <section className="relative overflow-hidden px-6 pb-10 pt-8 text-white sm:px-8" style={heroSurface({ base: "#6228D7", tint: "#EE2A7B", accent: "#F9CE34", warm: "#EE2A7B" })}>
        <div className="pointer-events-none absolute inset-0" style={SHEEN} />
        <h1 className="relative font-display text-3xl font-bold drop-shadow-sm sm:text-4xl">AutoDM</h1>
        <p className="relative mt-1 max-w-lg text-sm text-white/75">
          Someone comments your keyword on Instagram — they get the link in their DMs a second later. No app for them to install.
        </p>
        <div className="relative mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
          <div className="rounded-card bg-white p-5 text-ink"><div className="text-xs font-semibold uppercase text-inkmuted">Live automations</div><div className="mt-1 font-display text-3xl font-bold">{liveCount}</div></div>
          <div className="rounded-card bg-white p-5 text-ink"><div className="text-xs font-semibold uppercase text-inkmuted">DMs sent</div><div className="mt-1 font-display text-3xl font-bold">{totalSent}</div></div>
          <div className="rounded-card bg-white p-5 text-ink"><div className="text-xs font-semibold uppercase text-inkmuted">Last 30 days</div><div className="mt-1 font-display text-3xl font-bold">{stats.sent || 0}</div></div>
        </div>
      </section>

      <section className="px-4 py-6 sm:px-8 sm:py-8">
        {notice && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-card border border-line bg-white p-4 text-sm">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} className="text-inkmuted">✕</button>
          </div>
        )}

        {loading ? (
          <div className="card p-16 text-center text-sm text-inkmuted">Loading…</div>
        ) : (
          <>
            <ConnectPanel status={status} onChange={load} />

            {account && (
              <>
                <div className="mt-8 flex flex-wrap items-center gap-2">
                  {TABS.map((t) => (
                    <button key={t} onClick={() => setTab(t)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-semibold capitalize ${tab === t ? "border-ink bg-ink text-white" : "border-line bg-white text-inkmuted hover:text-ink"}`}>
                      {t === "activity" ? `Activity (${logs.length})` : `Automations (${rules.length})`}
                    </button>
                  ))}
                  <button onClick={() => setModal({ open: true, rule: null })} className="btn-brand ml-auto">New automation</button>
                </div>

                {tab === "automations" && (
                  <div className="mt-5 space-y-3">
                    {rules.length === 0 && (
                      <div className="card p-12 text-center">
                        <div className="text-3xl">💬</div>
                        <h3 className="mt-3 font-display text-lg font-bold">No automations yet</h3>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-inkmuted">
                          Classic first one: keyword <b>LINK</b> on all posts, DM back your store URL.
                        </p>
                        <button onClick={() => setModal({ open: true, rule: null })} className="btn-brand mt-4">Create your first automation</button>
                      </div>
                    )}

                    {rules.map((r) => (
                      <div key={r.id} className="card flex flex-wrap items-center gap-4 p-4">
                        {r.media_thumbnail
                          ? <img src={r.media_thumbnail} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                          : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#F3E8FF] text-xl">💬</span>}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-display text-[15px] font-bold">{r.name}</span>
                            <span className={`pill ${r.active ? "bg-teal-soft text-teal" : "bg-paper text-inkmuted"}`}>{r.active ? "Live" : "Paused"}</span>
                            {!r.media_id && <span className="pill bg-paper text-inkmuted">All posts</span>}
                          </div>
                          <p className="mt-1 truncate text-sm text-inkmuted">
                            {r.match_mode === "any" ? "Any comment" : (r.keywords || []).map((k) => `“${k}”`).join(", ")}
                            {" → "}{r.button_url ? r.button_url : (r.dm_text || "").slice(0, 60)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-inkmuted">{r.sent_count || 0} sent{r.last_sent_at ? ` · last ${fmtWhen(r.last_sent_at)}` : ""}</p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <button className="switch" data-on={r.active} onClick={() => toggle(r)}><span className="knob" /></button>
                          <button onClick={() => setModal({ open: true, rule: r })} className="btn-ghost !px-3 !py-2 text-sm">Edit</button>
                          <button onClick={() => remove(r)} className="text-sm font-semibold text-inkmuted hover:text-danger">Delete</button>
                        </div>
                      </div>
                    ))}

                    {rules.length > 0 && (
                      <div className="card mt-6 p-5">
                        <h3 className="font-display text-base font-bold">Test a comment</h3>
                        <p className="mt-0.5 text-sm text-inkmuted">Runs the real matcher without sending anything on Instagram.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <input className="input max-w-sm" placeholder='e.g. "send me the LINK please"'
                            value={test.comment} onChange={(e) => setTest((t) => ({ ...t, comment: e.target.value }))} />
                          <button onClick={runTest} disabled={test.busy || !test.comment.trim()} className="btn-ghost">{test.busy ? "Checking…" : "Test"}</button>
                        </div>
                        {test.result && (
                          <div className="mt-3 rounded-[10px] bg-paper p-3.5 text-sm">
                            {test.result.matched ? (
                              <>
                                <div className="font-semibold text-teal">Matches “{test.result.rule.name}” on keyword “{test.result.keyword}”</div>
                                <div className="mt-1.5 whitespace-pre-wrap text-inkmuted">{test.result.dm.text}{test.result.dm.button_url ? `\n[${test.result.dm.button_label}] ${test.result.dm.button_url}` : ""}</div>
                                {test.result.comment_reply && <div className="mt-1.5 text-inkmuted">Public reply: {test.result.comment_reply}</div>}
                              </>
                            ) : (
                              <span className="text-inkmuted">{test.result.error || "No automation matches that comment."}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {tab === "activity" && (
                  <div className="card mt-5 overflow-x-auto">
                    <div className="grid min-w-[720px] grid-cols-12 gap-4 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-inkmuted">
                      <div className="col-span-3">Who</div><div className="col-span-4">Comment</div>
                      <div className="col-span-2">Keyword</div><div className="col-span-2">Status</div><div className="col-span-1 text-right">When</div>
                    </div>
                    {logs.length === 0 && <div className="px-5 py-16 text-center text-sm text-inkmuted">Nothing yet. Activity shows up here the moment someone comments.</div>}
                    {logs.map((l) => (
                      <div key={l.id} className="grid min-w-[720px] grid-cols-12 items-center gap-4 border-b border-line px-5 py-3 text-sm last:border-0">
                        <div className="col-span-3 truncate font-semibold">{l.commenter_username ? `@${l.commenter_username}` : "Someone"}</div>
                        <div className="col-span-4 truncate text-inkmuted">{l.comment_text || "—"}</div>
                        <div className="col-span-2 truncate text-inkmuted">{l.matched_keyword || "—"}</div>
                        <div className="col-span-2">
                          <span className={`pill ${STATUS_STYLE[l.status] || "bg-paper text-inkmuted"}`} title={l.error || ""}>{l.status}</span>
                        </div>
                        <div className="col-span-1 text-right text-[11px] text-inkmuted">{fmtWhen(l.created_at)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>

      <RuleModal
        open={modal.open}
        rule={modal.rule}
        account={account}
        onClose={() => setModal({ open: false, rule: null })}
        onSaved={saved}
      />
    </main>
  );
}
