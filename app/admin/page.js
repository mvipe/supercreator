"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/supabase";
import { inr, ytEmbed } from "@/lib/courseModel";
import { useAuth } from "@/components/AuthProvider";
import NotificationsPanel from "@/components/admin/NotificationsPanel";

const PAYOUT_TABS = ["requested", "approved", "processing", "paid", "rejected", "all"];
const STATUS_STYLE = {
  requested: "bg-brand-soft text-brand",
  approved: "bg-brand-soft text-brand",
  processing: "bg-[#FEF3C7] text-[#92600A]",
  paid: "bg-teal-soft text-teal",
  rejected: "bg-red-50 text-danger"
};
const CATEGORIES = ["Essentials", "Getting started", "Monetization", "Growth", "Advanced"];

export default function AdminPanel() {
  const { user, loading } = useAuth();
  const r = useRouter();
  const [section, setSection] = useState("payouts"); // payouts | tutorials | creators | notifications
  const [state, setState] = useState("loading");     // loading | ok | denied
  const [superAdmin, setSuperAdmin] = useState(false);

  useEffect(() => { if (!loading && !user) r.replace("/login"); }, [loading, user, r]);
  useEffect(() => {
    if (!user) return;
    apiFetch("/api/me", undefined, "GET").then((me) => setSuperAdmin(!!me.superAdmin)).catch(() => {});
  }, [user]);

  if (loading || state === "loading" && section === "payouts") {
    // initial gate happens inside PayoutsPanel; keep a light frame here
  }
  if (loading) return <div className="flex min-h-screen items-center justify-center text-inkmuted">Loading…</div>;

  return (
    <main className="min-h-screen bg-paper">
      <header className="flex items-center gap-3 bg-[#101114] px-8 py-5 text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold">A</span>
        <div>
          <div className="font-display text-lg font-bold">SuperCreators Admin</div>
          <div className="text-xs text-white/50">Manage payouts, tutorials & notifications</div>
        </div>
        <nav className="ml-8 flex gap-1">
          {[["payouts", "Payouts"], ["tutorials", "Tutorials"], ...(superAdmin ? [["creators", "Creators"], ["kyc", "KYC"], ["notifications", "Notifications"]] : [])].map(([id, label]) => (
            <button key={id} onClick={() => setSection(id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${section === id ? "bg-white/10 text-white" : "text-white/55 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </nav>
        {superAdmin && (
          <a href="/admin/settings" className="ml-4 rounded-lg px-4 py-2 text-sm font-semibold text-white/70 border border-white/15 hover:text-white hover:border-white/30 transition-colors">
            Settings
          </a>
        )}
        <a href="/dashboard" className="ml-auto text-sm font-semibold text-white/70 hover:text-white">Exit to dashboard →</a>
      </header>

      {section === "payouts" ? <PayoutsPanel setDenied={() => setState("denied")} denied={state === "denied"} />
        : section === "creators" ? <CreatorsPanel />
        : section === "kyc" ? <KycReviewPanel />
        : section === "notifications" ? <NotificationsPanel />
        : <TutorialsPanel setDenied={() => setState("denied")} denied={state === "denied"} />}
    </main>
  );
}

function Denied() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
      <h1 className="font-display text-2xl font-bold">Admins only</h1>
      <p className="text-sm text-inkmuted">This area is restricted to SuperCreators admins.</p>
      <a href="/dashboard" className="btn-ink mt-3">Back to dashboard</a>
    </div>
  );
}

/* ---------------- PAYOUTS ---------------- */
function PayoutsPanel({ setDenied, denied }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("requested");
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [ready, setReady] = useState(false);

  async function load() {
    try {
      const { payouts } = await apiFetch(`/api/admin/payouts?status=${tab}`, undefined, "GET");
      setRows(payouts); setReady(true);
    } catch (e) { setDenied(); }
  }
  useEffect(() => { if (user) load(); }, [user, tab]);

  async function update(id, status) {
    setBusyId(id);
    try {
      const d = drafts[id] || {};
      await apiFetch("/api/admin/payouts", { id, status, reference: d.reference, adminNote: d.adminNote }, "POST");
      await load();
    } catch (e) { alert(e.message); }
    finally { setBusyId(null); }
  }
  const setDraft = (id, patch) => setDrafts((s) => ({ ...s, [id]: { ...s[id], ...patch } }));

  if (denied) return <Denied />;
  if (!ready) return <div className="flex min-h-[50vh] items-center justify-center text-inkmuted">Loading…</div>;

  return (
    <section className="px-8 py-8">
      <div className="flex flex-wrap gap-2">
        {PAYOUT_TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold capitalize ${tab === t ? "border-ink bg-ink text-white" : "border-line bg-white text-inkmuted hover:text-ink"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="mt-6 space-y-4">
        {rows.length === 0 && <div className="card px-5 py-16 text-center text-sm text-inkmuted">No {tab === "all" ? "" : tab} payouts.</div>}
        {rows.map((p) => {
          const d = drafts[p.id] || {};
          const m = p.method || {};
          return (
            <div key={p.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xl font-bold">{inr(p.amount / 100)}</span>
                    <span className={`pill ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                  </div>
                  <div className="mt-1 text-sm text-inkmuted">
                    {p.creator?.display_name || "Creator"} {p.creator?.username && <>· @{p.creator.username}</>} · {new Date(p.requested_at).toLocaleString("en-IN")}
                  </div>
                  <div className="mt-2 text-sm">
                    {m.type === "upi" ? <>UPI: <b>{m.upi}</b></> : <>Bank: <b>{m.holder}</b> · A/C {m.account} · IFSC {m.ifsc}</>}
                  </div>
                  {p.creator_note && <div className="mt-1 text-sm text-inkmuted">Creator note: {p.creator_note}</div>}
                </div>
              </div>
              {["requested", "approved", "processing"].includes(p.status) && (
                <div className="mt-4 border-t border-line pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className="input" placeholder="Payment reference / UTR (required to mark paid)"
                      value={d.reference ?? p.reference ?? ""} onChange={(e) => setDraft(p.id, { reference: e.target.value })} />
                    <input className="input" placeholder="Admin note (optional)"
                      value={d.adminNote ?? p.admin_note ?? ""} onChange={(e) => setDraft(p.id, { adminNote: e.target.value })} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.status === "requested" && <button onClick={() => update(p.id, "approved")} disabled={busyId === p.id} className="btn-ghost">Approve</button>}
                    {p.status !== "processing" && <button onClick={() => update(p.id, "processing")} disabled={busyId === p.id} className="btn-ghost">Mark processing</button>}
                    <button onClick={() => update(p.id, "paid")} disabled={busyId === p.id} className="btn-brand">Mark as paid</button>
                    <button onClick={() => update(p.id, "rejected")} disabled={busyId === p.id} className="btn-ghost text-danger">Reject</button>
                  </div>
                </div>
              )}
              {(p.status === "paid" || p.status === "rejected") && (p.reference || p.admin_note) && (
                <div className="mt-3 border-t border-line pt-3 text-sm text-inkmuted">
                  {p.reference && <>Ref: <b className="text-ink">{p.reference}</b>. </>}
                  {p.admin_note && <>Note: {p.admin_note}</>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- TUTORIALS ---------------- */
function TutorialsPanel({ setDenied, denied }) {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(null); // draft object or null
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    try {
      const { tutorials } = await apiFetch("/api/admin/tutorials", undefined, "GET");
      setRows(tutorials); setReady(true);
    } catch (e) { setDenied(); }
  }
  useEffect(() => { if (user) load(); }, [user]);

  const blank = { title: "", description: "", video_url: "", category: "Essentials", position: rows.length, published: true };

  async function save() {
    setBusy(true); setErr("");
    try {
      await apiFetch("/api/admin/tutorials", editing, "POST");
      setEditing(null); await load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }
  async function remove(id) {
    if (!confirm("Delete this tutorial?")) return;
    await apiFetch("/api/admin/tutorials", { action: "delete", id }, "POST");
    await load();
  }
  async function togglePublish(t) {
    await apiFetch("/api/admin/tutorials", { ...t, published: !t.published }, "POST");
    await load();
  }

  if (denied) return <Denied />;
  if (!ready) return <div className="flex min-h-[50vh] items-center justify-center text-inkmuted">Loading…</div>;

  return (
    <section className="px-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Learn tutorials</h2>
          <p className="mt-0.5 text-sm text-inkmuted">These show up in the creators' Learn section.</p>
        </div>
        <button onClick={() => { setEditing(blank); setErr(""); }} className="btn-ink">+ Add tutorial</button>
      </div>

      <div className="card mt-6">
        <div className="grid grid-cols-12 gap-4 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-inkmuted">
          <div className="col-span-5">Title</div><div className="col-span-3">Category</div>
          <div className="col-span-2">Status</div><div className="col-span-2 text-right">Actions</div>
        </div>
        {rows.length === 0 && <div className="px-5 py-14 text-center text-sm text-inkmuted">No tutorials yet. Add your first one.</div>}
        {rows.map((t) => (
          <div key={t.id} className="grid grid-cols-12 items-center gap-4 border-b border-line px-5 py-3.5 text-sm last:border-0">
            <div className="col-span-5 min-w-0"><div className="truncate font-semibold">{t.title}</div><div className="truncate text-xs text-inkmuted">{t.video_url}</div></div>
            <div className="col-span-3">{t.category}</div>
            <div className="col-span-2"><span className={`pill ${t.published ? "bg-teal-soft text-teal" : "bg-paper text-inkmuted"}`}>{t.published ? "Published" : "Hidden"}</span></div>
            <div className="col-span-2 flex justify-end gap-2">
              <button onClick={() => togglePublish(t)} className="text-xs font-semibold text-inkmuted hover:text-ink">{t.published ? "Hide" : "Show"}</button>
              <button onClick={() => { setEditing(t); setErr(""); }} className="text-xs font-semibold text-brand">Edit</button>
              <button onClick={() => remove(t.id)} className="text-xs font-semibold text-danger">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold">{editing.id ? "Edit tutorial" : "Add tutorial"}</h3>
            <div className="mt-4 space-y-4">
              <div><label className="label">Title</label><input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div><label className="label">Video link (YouTube, Vimeo or direct URL)</label><input className="input" placeholder="https://youtu.be/…" value={editing.video_url} onChange={(e) => setEditing({ ...editing, video_url: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Category</label>
                  <select className="input" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="label">Position</label><input className="input" type="number" value={editing.position} onChange={(e) => setEditing({ ...editing, position: Number(e.target.value) })} /></div>
              </div>
              <div><label className="label">Description</label><textarea className="input min-h-[80px]" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} /> Published</label>
              {ytEmbed(editing.video_url) && <div className="aspect-video overflow-hidden rounded-xl border border-line"><iframe src={ytEmbed(editing.video_url)} className="h-full w-full" title="preview" /></div>}
              {err && <p className="text-sm text-danger">{err}</p>}
              <div className="flex justify-end gap-3">
                <button onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
                <button onClick={save} disabled={busy} className="btn-brand">{busy ? "Saving…" : "Save tutorial"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------------- CREATORS (super admin) ---------------- */
function CreatorsPanel() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);
  const [err, setErr] = useState("");
  const [warning, setWarning] = useState("");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setErr(""); setWarning("");
    try {
      const res = await apiFetch("/api/admin/creators", undefined, "GET");
      setRows(res.creators || []);
      setWarning(res.warning || "");
      setReady(true);
    } catch (e) {
      // Only a real 403 means "not a super admin". Anything else is a bug we
      // should show, not swallow into an empty list.
      if (/super admin/i.test(e.message) || /sign in/i.test(e.message)) setDenied(true);
      else { setErr(e.message); setReady(true); }
    }
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function toggleBlock(c) {
    if (!confirm(`${c.blocked ? "Unblock" : "Block"} ${c.display_name || c.full_name || c.username || "this creator"}?`)) return;
    setBusyId(c.user_id);
    try { await apiFetch("/api/admin/creators", { userId: c.user_id, blocked: !c.blocked }, "POST"); await load(); }
    catch (e) { alert(e.message); }
    finally { setBusyId(null); }
  }

  if (denied) return <Denied />;
  if (!ready) return <div className="flex min-h-[50vh] items-center justify-center text-inkmuted">Loading…</div>;

  const list = rows.filter((c) => {
    const s = q.toLowerCase().trim();
    if (!s) return true;
    return [c.username, c.display_name, c.full_name, c.business_name, c.email, c.phone_number]
      .some((v) => (v || "").toLowerCase().includes(s));
  });

  return (
    <section className="px-8 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Creators <span className="text-inkmuted">({rows.length})</span></h2>
          <p className="mt-0.5 text-sm text-inkmuted">Block or unblock any creator. Blocked creators can't sell or withdraw.</p>
        </div>
        <div className="flex items-center gap-2">
          <input className="input max-w-xs" placeholder="Search name, @user, email, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button onClick={load} className="btn-ghost shrink-0">Refresh</button>
        </div>
      </div>

      {err && (
        <div className="mt-4 rounded-[8px] border border-danger/30 bg-red-50 p-4 text-sm text-danger">
          <b>Couldn't load creators.</b> {err}
        </div>
      )}
      {warning && (
        <div className="mt-4 rounded-[8px] border border-[#F5D48A] bg-[#FEF3C7] p-4 text-sm text-[#92600A]">{warning}</div>
      )}

      <div className="card mt-6 overflow-x-auto">
        <div className="grid min-w-[860px] grid-cols-12 gap-4 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-inkmuted">
          <div className="col-span-4">Creator</div><div className="col-span-3">Contact</div>
          <div className="col-span-2 text-right">Revenue</div><div className="col-span-1 text-center">Status</div><div className="col-span-2 text-right">Action</div>
        </div>
        {list.length === 0 && (
          <div className="px-5 py-16 text-center text-sm text-inkmuted">
            {rows.length === 0 ? "No creators found. If you expect creators here, run supabase/fix-pack.sql — profile rows may be missing." : "No creators match that search."}
          </div>
        )}
        {list.map((c) => (
          <div key={c.user_id} className="grid min-w-[860px] grid-cols-12 items-center gap-4 border-b border-line px-5 py-3.5 text-sm last:border-0">
            <div className="col-span-4 min-w-0">
              <div className="flex items-center gap-2 truncate font-semibold">
                {c.full_name || c.display_name || "—"}
                {c.is_super_admin && <span className="pill bg-brand-soft text-brand">super</span>}
                {c.isPro && <span className="pill bg-teal-soft text-teal">pro</span>}
              </div>
              <div className="truncate text-xs text-inkmuted">
                {c.username ? `@${c.username}` : "no store"}{c.business_name ? ` · ${c.business_name}` : ""}
                {c.created_at ? ` · joined ${new Date(c.created_at).toLocaleDateString("en-IN")}` : ""}
              </div>
            </div>
            <div className="col-span-3 min-w-0 text-inkmuted">
              <div className="truncate">{c.email || "—"}</div>
              {c.phone_number && <div className="truncate text-xs">+{String(c.phone_number).replace(/^\+/, "")}</div>}
            </div>
            <div className="col-span-2 text-right font-semibold">{inr(c.revenue)}</div>
            <div className="col-span-1 text-center"><span className={`pill ${c.blocked ? "bg-red-50 text-danger" : "bg-teal-soft text-teal"}`}>{c.blocked ? "Blocked" : "Active"}</span></div>
            <div className="col-span-2 text-right">
              {c.is_super_admin
                ? <span className="text-xs text-inkmuted">—</span>
                : <button onClick={() => toggleBlock(c)} disabled={busyId === c.user_id}
                    className={c.blocked ? "btn-ghost" : "btn-ghost text-danger"}>{busyId === c.user_id ? "…" : c.blocked ? "Unblock" : "Block"}</button>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- KYC REVIEW (super admin) ---------------- */
const KYC_TABS = ["under_review", "verified", "rejected", "all"];
const KYC_ST = {
  not_started: "bg-paper text-inkmuted", under_review: "bg-[#FEF3C7] text-[#92600A]",
  verified: "bg-teal-soft text-teal", rejected: "bg-red-50 text-danger"
};

function KycReviewPanel() {
  const { user } = useAuth();
  const [tab, setTab] = useState("under_review");
  const [rows, setRows] = useState([]);
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState(null);

  async function load() {
    try { const { submissions } = await apiFetch(`/api/admin/kyc?status=${tab}`, undefined, "GET"); setRows(submissions); setReady(true); }
    catch { setDenied(true); }
  }
  useEffect(() => { if (user) load(); }, [user, tab]);

  async function review(userId, status) {
    setBusyId(userId);
    try { await apiFetch("/api/admin/kyc", { userId, status, adminNote: notes[userId] || "" }, "POST"); await load(); }
    catch (e) { alert(e.message); }
    finally { setBusyId(null); }
  }

  if (denied) return <Denied />;
  if (!ready) return <div className="flex min-h-[50vh] items-center justify-center text-inkmuted">Loading…</div>;

  return (
    <section className="px-8 py-8">
      <h2 className="font-display text-2xl font-bold">KYC verification</h2>
      <p className="mt-0.5 text-sm text-inkmuted">Review creator documents and approve or reject.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {KYC_TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold capitalize ${tab === t ? "border-ink bg-ink text-white" : "border-line bg-white text-inkmuted hover:text-ink"}`}>
            {t.replace("_", " ")}
          </button>
        ))}
      </div>
      <div className="mt-6 space-y-4">
        {rows.length === 0 && <div className="card px-5 py-16 text-center text-sm text-inkmuted">No {tab.replace("_", " ")} submissions.</div>}
        {rows.map((k) => (
          <div key={k.user_id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold">{k.legal_name || "—"}</span>
                  <span className={`pill ${KYC_ST[k.status]}`}>{k.status.replace("_", " ")}</span>
                </div>
                <div className="mt-1 text-sm text-inkmuted">
                  {k.creator?.display_name || "Creator"}{k.creator?.username && ` · @${k.creator.username}`}
                  {k.submitted_at && ` · ${new Date(k.submitted_at).toLocaleString("en-IN")}`}
                </div>
                <div className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  <div>PAN: <b>{k.pan || "—"}</b></div>
                  <div>GST: <b>{k.gst || "—"}</b></div>
                  <div>Bank: <b>{k.bank_holder || "—"}</b></div>
                  <div>A/C: <b>{k.bank_account || "—"}</b> · IFSC {k.ifsc || "—"}</div>
                </div>
                {k.doc_url && <a href={k.doc_url} target="_blank" className="mt-2 inline-block text-sm font-semibold text-brand">View document ↗</a>}
              </div>
            </div>
            {["under_review"].includes(k.status) && (
              <div className="mt-4 border-t border-line pt-4">
                <input className="input" placeholder="Note (shown to creator if rejected)"
                  value={notes[k.user_id] ?? k.admin_note ?? ""} onChange={(e) => setNotes({ ...notes, [k.user_id]: e.target.value })} />
                <div className="mt-3 flex gap-2">
                  <button onClick={() => review(k.user_id, "verified")} disabled={busyId === k.user_id} className="btn-brand">Approve</button>
                  <button onClick={() => review(k.user_id, "rejected")} disabled={busyId === k.user_id} className="btn-ghost text-danger">Reject</button>
                </div>
              </div>
            )}
            {k.status === "rejected" && k.admin_note && <div className="mt-3 border-t border-line pt-3 text-sm text-inkmuted">Note: {k.admin_note}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
