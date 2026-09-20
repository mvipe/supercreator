"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, supabase } from "@/lib/supabase";
import { inr, ytEmbed, videoThumb, uploadImage } from "@/lib/courseModel";
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
  const [staff, setStaff] = useState(false); // super admins + sub-admins

  useEffect(() => { if (!loading && !user) r.replace("/login"); }, [loading, user, r]);
  useEffect(() => {
    if (!user) return;
    apiFetch("/api/me", undefined, "GET").then((me) => { setSuperAdmin(!!me.superAdmin); setStaff(!!me.staff); }).catch(() => {});
  }, [user]);

  if (loading || state === "loading" && section === "payouts") {
    // initial gate happens inside PayoutsPanel; keep a light frame here
  }
  if (loading) return <div className="flex min-h-screen items-center justify-center text-inkmuted">Loading…</div>;

  return (
    <main className="min-h-screen bg-paper">
      <header className="flex flex-wrap items-center gap-3 bg-[#101114] px-4 py-4 text-white sm:px-8 sm:py-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold">A</span>
        <div className="min-w-0">
          <div className="font-display text-base font-bold leading-tight sm:text-lg">SuperCreators Admin</div>
          <div className="hidden text-xs text-white/50 sm:block">Manage payouts, tutorials & notifications</div>
        </div>
        <a href="/dashboard" className="order-2 ml-auto shrink-0 text-sm font-semibold text-white/70 hover:text-white sm:order-last">
          Exit <span className="hidden sm:inline">to dashboard</span> →
        </a>
        {/* Tabs: their own full-width, horizontally-scrollable row on mobile;
            inline next to the title on desktop. */}
        <nav className="order-3 -mx-4 flex w-full gap-1 overflow-x-auto px-4 pb-0.5 sm:order-none sm:mx-0 sm:ml-6 sm:w-auto sm:overflow-visible sm:px-0">
          {[["payouts", "Payouts"], ["tutorials", "Tutorials"], ...(staff ? [["creators", "Creators"], ["leaderboard", "Leaderboard"], ["kyc", "KYC"], ["notifications", "Notifications"]] : [])].map(([id, label]) => (
            <button key={id} onClick={() => setSection(id)}
              className={`shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors sm:px-4 ${section === id ? "bg-white/10 text-white" : "text-white/55 hover:text-white"}`}>
              {label}
            </button>
          ))}
          {staff && (
            <a href="/admin/settings" className="shrink-0 whitespace-nowrap rounded-lg border border-white/15 px-3.5 py-2 text-sm font-semibold text-white/70 transition-colors hover:border-white/30 hover:text-white sm:ml-2 sm:px-4">
              Settings
            </a>
          )}
        </nav>
      </header>

      {section === "payouts" ? <PayoutsPanel setDenied={() => setState("denied")} denied={state === "denied"} />
        : section === "creators" ? <CreatorsPanel canManageAdmins={superAdmin} />
        : section === "leaderboard" ? <LeaderboardPanel />
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
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    try {
      const { tutorials } = await apiFetch("/api/admin/tutorials", undefined, "GET");
      setRows(tutorials); setReady(true);
    } catch (e) { setDenied(); }
  }
  useEffect(() => { if (user) load(); }, [user]);

  const blank = { title: "", description: "", video_url: "", cover_image: "", category: "Essentials", position: rows.length, published: true };

  async function save() {
    setBusy(true); setErr("");
    try {
      const res = await apiFetch("/api/admin/tutorials", editing, "POST");
      if (res?.warning) alert(res.warning);
      setEditing(null); await load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  /** Upload a cover image for the Learn grid to Supabase storage. */
  async function onCover(files) {
    if (!files?.[0]) return;
    setUploading(true); setErr("");
    try {
      const url = await uploadImage(user.id, files[0]);
      setEditing((e) => ({ ...e, cover_image: url }));
    } catch (e) { setErr(e.message); }
    finally { setUploading(false); }
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
            <div className="col-span-5 flex min-w-0 items-center gap-3">
              <div className="h-10 w-16 shrink-0 overflow-hidden rounded-md border border-line bg-paper">
                {(t.cover_image || videoThumb(t.video_url)) && <img src={t.cover_image || videoThumb(t.video_url)} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0"><div className="truncate font-semibold">{t.title}</div><div className="truncate text-xs text-inkmuted">{t.video_url}</div></div>
            </div>
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

              {/* Cover art for the Learn grid. Blank falls back to the video's
                  own thumbnail, so this is optional. */}
              <div>
                <label className="label">Cover image <span className="font-normal text-inkmuted">— optional, 16:9</span></label>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-line bg-paper">
                    {(editing.cover_image || videoThumb(editing.video_url)) && (
                      <img src={editing.cover_image || videoThumb(editing.video_url)} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <label className="btn-ghost w-full cursor-pointer">
                      {uploading ? "Uploading…" : editing.cover_image ? "Replace image" : "Upload image"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => onCover(e.target.files)} />
                    </label>
                    <input className="input" placeholder="…or paste an image URL" value={editing.cover_image || ""}
                      onChange={(e) => setEditing({ ...editing, cover_image: e.target.value })} />
                  </div>
                  {editing.cover_image && (
                    <button onClick={() => setEditing({ ...editing, cover_image: "" })} className="shrink-0 text-xs font-semibold text-danger">Remove</button>
                  )}
                </div>
                <p className="mt-1 text-xs text-inkmuted">Left blank, the video's own thumbnail is used.</p>
              </div>
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
function CreatorsPanel({ canManageAdmins = false }) {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);
  const [err, setErr] = useState("");
  const [warning, setWarning] = useState("");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [detail, setDetail] = useState(null);       // { creator, totals, courses, products }
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState("");
  const [stores, setStores] = useState(null);       // { total, withProducts, list[] }
  const [showStores, setShowStores] = useState(false);

  async function openDetail(c) {
    setDetail({ creator: { name: c.full_name || c.display_name || c.username || "Creator", username: c.username, email: c.email } });
    setDetailLoading(true); setDetailErr("");
    try {
      const res = await apiFetch(`/api/admin/creators/${c.user_id}`, undefined, "GET");
      setDetail(res);
    } catch (e) { setDetailErr(e.message); }
    finally { setDetailLoading(false); }
  }

  async function load() {
    setErr(""); setWarning("");
    try {
      const res = await apiFetch("/api/admin/creators", undefined, "GET");
      setRows(res.creators || []);
      setStores(res.stores || null);
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

  // Manually grant / revoke free Pro access (comp — no payment taken).
  async function togglePro(c) {
    const grant = !c.isPro;
    if (!confirm(`${grant ? "Give free Pro access to" : "Revoke Pro from"} ${c.display_name || c.full_name || c.username || "this creator"}?`)) return;
    setBusyId(c.user_id);
    try { await apiFetch("/api/admin/creators", { userId: c.user_id, pro: grant }, "PATCH"); await load(); }
    catch (e) { alert(e.message); }
    finally { setBusyId(null); }
  }

  // Promote / demote a sub-admin (super admin only). Grants full admin access.
  async function toggleSubadmin(c) {
    const make = !c.is_admin;
    if (!confirm(`${make ? "Make sub-admin (full admin access + free Pro)" : "Remove sub-admin access from"} ${c.display_name || c.full_name || c.username || "this creator"}?`)) return;
    setBusyId(c.user_id);
    try { await apiFetch("/api/admin/creators", { userId: c.user_id, subadmin: make }, "PATCH"); await load(); }
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Creators <span className="text-inkmuted">({rows.length})</span></h2>
          <p className="mt-0.5 text-sm text-inkmuted">Block or unblock any creator. Blocked creators can't sell or withdraw.</p>
        </div>
        <div className="flex items-center gap-2">
          <input className="input max-w-xs" placeholder="Search name, @user, email, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button onClick={load} className="btn-ghost shrink-0">Refresh</button>
        </div>
      </div>

      {/* Stores roll-up — how many creators actually have a live storefront,
          with every store name clickable straight through to the public page. */}
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <Stat label="Creators" value={rows.length} />
        <Stat label="Stores created" value={stores?.total ?? "—"} />
        <Stat label="Stores with products" value={stores?.withProducts ?? "—"} />
        <button onClick={() => setShowStores(true)} disabled={!stores?.total}
          className="rounded-xl border border-line bg-white px-4 py-3 text-left transition-colors hover:border-brand disabled:opacity-50">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-inkmuted">All stores</div>
          <div className="mt-1 font-display text-xl font-bold text-brand">View list →</div>
        </button>
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
        <div className="grid min-w-[1040px] grid-cols-12 gap-4 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-inkmuted">
          <div className="col-span-3">Creator</div><div className="col-span-2">Store</div><div className="col-span-2">Contact</div>
          <div className="col-span-2 text-right">Revenue</div><div className="col-span-1 text-center">Status</div><div className="col-span-2 text-right">Action</div>
        </div>
        {list.length === 0 && (
          <div className="px-5 py-16 text-center text-sm text-inkmuted">
            {rows.length === 0 ? "No creators found. If you expect creators here, run supabase/fix-pack.sql — profile rows may be missing." : "No creators match that search."}
          </div>
        )}
        {list.map((c) => (
          <div key={c.user_id} className="grid min-w-[1040px] grid-cols-12 items-center gap-4 border-b border-line px-5 py-3.5 text-sm last:border-0">
            <div className="col-span-3 min-w-0">
              <button onClick={() => openDetail(c)} className="flex items-center gap-2 truncate text-left font-semibold text-brand hover:underline" title="View stats">
                {c.full_name || c.display_name || "—"}
                {c.is_super_admin && <span className="pill bg-brand-soft text-brand">super</span>}
                {c.is_admin && !c.is_super_admin && <span className="pill bg-brand-soft text-brand">sub-admin</span>}
                {c.isPro && <span className="pill bg-teal-soft text-teal">pro</span>}
              </button>
              <div className="truncate text-xs text-inkmuted">
                {c.created_at ? `joined ${new Date(c.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : "—"}
              </div>
            </div>

            {/* The store the creator built — name links straight to the live page. */}
            <div className="col-span-2 min-w-0">
              {c.store ? (
                <>
                  <a href={c.store.url} target="_blank" rel="noopener noreferrer"
                    className="block truncate font-semibold text-brand hover:underline" title={`Open ${c.store.url}`}>
                    {c.store.name} ↗
                  </a>
                  <div className="truncate text-xs text-inkmuted">
                    @{c.store.username} · {c.store.liveProducts} live
                    {c.store.draftProducts ? ` · ${c.store.draftProducts} draft` : ""}
                  </div>
                </>
              ) : (
                <span className="text-xs text-inkmuted">No store yet</span>
              )}
            </div>

            <div className="col-span-2 min-w-0 text-inkmuted">
              <div className="truncate">{c.email || "—"}</div>
              {c.phone_number && <div className="truncate text-xs">+{String(c.phone_number).replace(/^\+/, "")}</div>}
            </div>
            <div className="col-span-2 text-right">
              <div className="font-semibold">{inr(c.revenue)}</div>
              <div className="text-[11px] text-inkmuted">{c.sales || 0} sales · net of fee</div>
            </div>
            <div className="col-span-1 text-center"><span className={`pill ${c.blocked ? "bg-red-50 text-danger" : "bg-teal-soft text-teal"}`}>{c.blocked ? "Blocked" : "Active"}</span></div>
            <div className="col-span-2 text-right">
              {c.is_super_admin
                ? <span className="text-xs text-inkmuted">—</span>
                : <div className="flex flex-wrap items-center justify-end gap-2">
                    {canManageAdmins && (
                      <button onClick={() => toggleSubadmin(c)} disabled={busyId === c.user_id}
                        className={`btn-ghost text-xs ${c.is_admin ? "text-brand" : "text-inkmuted"}`} title="Grant or revoke full admin (sub-admin) access">
                        {busyId === c.user_id ? "…" : c.is_admin ? "Remove sub-admin" : "Make sub-admin"}
                      </button>
                    )}
                    <button onClick={() => togglePro(c)} disabled={busyId === c.user_id}
                      className={`btn-ghost text-xs ${c.isPro ? "text-teal" : "text-brand"}`} title="Give or revoke free Pro access">
                      {busyId === c.user_id ? "…" : c.isPro ? "Revoke Pro" : "Give Pro"}
                    </button>
                    <button onClick={() => toggleBlock(c)} disabled={busyId === c.user_id}
                      className={c.blocked ? "btn-ghost" : "btn-ghost text-danger"}>{c.blocked ? "Unblock" : "Block"}</button>
                  </div>}
            </div>
          </div>
        ))}
      </div>

      {/* Every store, one click from the public page */}
      {showStores && stores && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowStores(false)}>
          <div className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl font-bold">Stores <span className="text-inkmuted">({stores.total})</span></h3>
                <p className="mt-0.5 text-sm text-inkmuted">{stores.withProducts} have at least one live product.</p>
              </div>
              <button onClick={() => setShowStores(false)} className="rounded-lg p-1 text-inkmuted hover:bg-paper" aria-label="Close">✕</button>
            </div>
            <div className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line">
              {stores.list.map((s) => (
                <div key={s.userId} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-semibold text-brand hover:underline">
                    {s.name} <span className="font-normal text-inkmuted">/u/{s.username}</span> ↗
                  </a>
                  <span className="shrink-0 text-xs text-inkmuted">{s.liveProducts} live{s.draftProducts ? ` · ${s.draftProducts} draft` : ""}</span>
                  <span className="w-24 shrink-0 text-right font-semibold">{inr(s.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Per-creator stats */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetail(null)}>
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <h3 className="font-display text-xl font-bold">{detail.creator?.name}</h3>
                <div className="truncate text-sm text-inkmuted">
                  {detail.creator?.username ? `@${detail.creator.username}` : "no store"}
                  {detail.creator?.email ? ` · ${detail.creator.email}` : ""}
                  {detail.creator?.phone ? ` · +${String(detail.creator.phone).replace(/^\+/, "")}` : ""}
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="shrink-0 rounded-lg p-1 text-inkmuted hover:bg-paper" aria-label="Close">✕</button>
            </div>

            {detailLoading ? (
              <div className="py-14 text-center text-sm text-inkmuted">Loading stats…</div>
            ) : detailErr ? (
              <div className="mt-4 rounded-[8px] bg-red-50 p-3 text-sm text-danger">{detailErr}</div>
            ) : detail.totals ? (
              <>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Courses" value={detail.totals.courses} />
                  <Stat label="Products" value={detail.totals.products} />
                  <Stat label="Total sales" value={detail.totals.totalSales} />
                  <Stat label="Revenue" value={inr(detail.totals.totalRevenue)} />
                </div>

                <div className="mt-6">
                  <div className="text-sm font-bold">Courses ({detail.courses.length})</div>
                  {detail.courses.length === 0 ? (
                    <p className="mt-1 text-sm text-inkmuted">No courses yet.</p>
                  ) : (
                    <div className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line">
                      {detail.courses.map((c) => (
                        <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                          <span className="min-w-0 flex-1 truncate">
                            <span className="font-medium">{c.title}</span>
                            <span className="ml-2 text-xs text-inkmuted">{c.lessons} lessons · {c.status}</span>
                          </span>
                          <span className="shrink-0 text-xs text-inkmuted">{c.sales} sales</span>
                          <span className="w-24 shrink-0 text-right font-semibold">{inr(c.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {detail.products.length > 0 && (
                  <div className="mt-6">
                    <div className="text-sm font-bold">Other products ({detail.products.length})</div>
                    <div className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line">
                      {detail.products.map((p) => (
                        <div key={`${p.type}-${p.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                          <span className="min-w-0 flex-1 truncate">
                            <span className="font-medium">{p.title}</span>
                            <span className="ml-2 rounded bg-paper px-1.5 py-0.5 text-[10px] uppercase text-inkmuted">{p.type}</span>
                          </span>
                          <span className="shrink-0 text-xs text-inkmuted">{p.sales} sales</span>
                          <span className="w-24 shrink-0 text-right font-semibold">{inr(p.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.totals.bookingSales > 0 && (
                  <p className="mt-4 text-sm text-inkmuted">Bookings: {detail.totals.bookingSales} · {inr(detail.totals.bookingRevenue)}</p>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-paper px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-inkmuted">{label}</div>
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
    </div>
  );
}

/* ---------------- EARNINGS LEADERBOARD (super admin) ---------------- */
const isoDay = (d) => new Date(d).toISOString().slice(0, 10);
const TOP_OPTIONS = [["10", "Top 10"], ["15", "Top 15"], ["100", "Top 100"], ["custom", "Custom"]];
const RANGE_OPTIONS = [
  ["today", "Today"], ["yesterday", "Yesterday"], ["7d", "Last 7 days"],
  ["month", "Last month"], ["year", "Last year"], ["custom", "Custom"]
];

// How often the board re-pulls on its own. The board used to be a one-shot
// fetch: leave the tab open and the ranking silently went stale.
const AUTO_OPTIONS = [
  ["0", "Off"],
  ["300", "Every 5 min"],
  ["3600", "Every hour"],
  ["43200", "Every 12 hours"],
  ["86400", "Every 24 hours"]
];

function LeaderboardPanel() {
  const [range, setRange] = useState("today");
  const [topSel, setTopSel] = useState("10");
  const [customTop, setCustomTop] = useState(25);
  const [from, setFrom] = useState(isoDay(Date.now() - 6 * 86400000));
  const [to, setTo] = useState(isoDay(Date.now()));
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [auto, setAuto] = useState("43200");   // default: refresh every 12h
  const [updatedAt, setUpdatedAt] = useState(null);

  const limit = topSel === "custom" ? Math.max(1, Number(customTop) || 10) : Number(topSel);

  /** Fetch the board. `quiet` leaves the current rows on screen meanwhile. */
  const fetchBoard = useCallback(async (quiet = false) => {
    let q = `/api/admin/leaderboard?range=${range}&limit=${limit}&t=${Date.now()}`;
    if (range === "custom") { if (!from || !to) return; q += `&from=${from}&to=${to}`; }
    if (!quiet) setLoading(true);
    setErr("");
    try {
      const d = await apiFetch(q, undefined, "GET");
      setRows(d.rows || []);
      setTotal(d.totalEarnings || 0);
      setUpdatedAt(new Date().toISOString());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [range, limit, from, to]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  // Auto-refresh on the chosen cadence, and immediately when the tab regains
  // focus (so a board left open overnight is current the moment it's looked at).
  useEffect(() => {
    const seconds = Number(auto);
    const onFocus = () => fetchBoard(true);
    window.addEventListener("focus", onFocus);
    if (!seconds) return () => window.removeEventListener("focus", onFocus);
    const t = setInterval(() => fetchBoard(true), seconds * 1000);
    return () => { clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, [auto, fetchBoard]);

  // A sale anywhere on the platform moves the ranking — react to it live.
  useEffect(() => {
    if (auto === "0") return;
    const channel = supabase
      .channel("leaderboard-sales")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mp_purchases" }, () => fetchBoard(true))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mp_bookings" }, () => fetchBoard(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [auto, fetchBoard]);

  const medal = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`);

  return (
    <section className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Earnings leaderboard</h2>
          <p className="mt-0.5 text-sm text-inkmuted">
            Top-earning creators for the selected period — net of the platform fee.
          </p>
          <p className="mt-1 flex items-center gap-2 text-xs text-inkmuted">
            <span className={`inline-flex h-2 w-2 rounded-full ${auto === "0" ? "bg-inkmuted" : "bg-teal"}`} />
            {updatedAt
              ? `Updated ${new Date(updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
              : "Loading…"}
            {auto !== "0" && ` · auto-refresh ${(AUTO_OPTIONS.find(([v]) => v === auto)?.[1] || "").toLowerCase()}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* How often the board re-pulls by itself. */}
          <select className="input h-10 py-0" value={auto} onChange={(e) => setAuto(e.target.value)} title="Auto-refresh">
            {AUTO_OPTIONS.map(([v, l]) => <option key={v} value={v}>{`Auto: ${l}`}</option>)}
          </select>
          <button onClick={() => fetchBoard(true)} className="btn-ghost h-10 py-0 text-xs">Refresh now</button>
          <select className="input h-10 py-0" value={topSel} onChange={(e) => setTopSel(e.target.value)}>
            {TOP_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {topSel === "custom" && (
            <input className="input h-10 w-24 py-0" type="number" min="1" value={customTop}
              onChange={(e) => setCustomTop(e.target.value)} placeholder="N" />
          )}
          <select className="input h-10 py-0" value={range} onChange={(e) => setRange(e.target.value)}>
            {RANGE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {range === "custom" && (
            <div className="flex items-center gap-1.5 text-xs text-inkmuted">
              <input type="date" className="input h-10 py-0" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
              <span>→</span>
              <input type="date" className="input h-10 py-0" value={to} min={from || undefined} max={isoDay(Date.now())} onChange={(e) => setTo(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {err && <div className="mt-4 rounded-[8px] border border-danger/30 bg-red-50 p-4 text-sm text-danger"><b>Couldn't load leaderboard.</b> {err}</div>}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
        <Stat label="Creators" value={rows.length} />
        <Stat label="Total earnings" value={inr(total)} />
      </div>

      <div className={`card mt-6 overflow-x-auto transition-opacity ${loading ? "opacity-50" : ""}`}>
        <div className="grid min-w-[540px] grid-cols-12 gap-4 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-inkmuted">
          <div className="col-span-2">Rank</div><div className="col-span-6">Creator</div>
          <div className="col-span-2 text-right">Sales</div><div className="col-span-2 text-right">Earnings</div>
        </div>
        {rows.length === 0 && !loading && (
          <div className="px-5 py-16 text-center text-sm text-inkmuted">No earnings in this period.</div>
        )}
        {rows.map((r, i) => (
          <div key={r.userId} className="grid min-w-[540px] grid-cols-12 items-center gap-4 border-b border-line px-5 py-3 text-sm last:border-0">
            <div className="col-span-2 font-display text-base font-bold">{medal(i)}</div>
            <div className="col-span-6 min-w-0">
              <div className="truncate font-semibold">{r.name}</div>
              {r.username && <div className="truncate text-xs text-inkmuted">@{r.username}</div>}
            </div>
            <div className="col-span-2 text-right tabular-nums">{r.sales}</div>
            <div className="col-span-2 text-right font-semibold tabular-nums">{inr(r.earnings)}</div>
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
