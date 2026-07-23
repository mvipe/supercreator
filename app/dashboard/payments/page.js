"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase, apiFetch } from "@/lib/supabase";
import { inr, uploadImage } from "@/lib/courseModel";
import { TYPE_META } from "@/lib/products";
import { Field } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";
import { heroSurface, SHEEN } from "@/lib/texture";
import { downloadInvoice, invoiceNumber } from "@/lib/invoice";

const TABS = ["Transactions", "Account"];
const FILTERS = ["all", "course", "event", "locked", "payment", "booking", "book"];
const STATUS_STYLE = { paid: "bg-teal-soft text-teal", refunded: "bg-red-50 text-danger" };

export default function Payments() {
  const [tab, setTab] = useState("Transactions");
  return (
    <main>
      <section className="relative overflow-hidden px-8 pb-10 pt-8 text-white" style={heroSurface()}>
        <div className="pointer-events-none absolute inset-0" style={SHEEN} />
        <div className="pointer-events-none absolute -right-24 -top-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <h1 className="font-display text-4xl font-bold drop-shadow-sm">Payments</h1>
          <p className="mt-1 text-sm text-white/75">Your sales, payout account and verification — all in one place.</p>
          <div className="mt-6 flex gap-2">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-full px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-colors ${tab === t ? "bg-white text-ink" : "bg-white/15 text-white hover:bg-white/25"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>
      {tab === "Transactions" ? <Transactions /> : <Account />}
    </main>
  );
}

/* ---------------- TRANSACTIONS ---------------- */
function Transactions() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [seller, setSeller] = useState({});
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/payments", undefined, "GET")
      .then((res) => { setRows(res.rows || []); setSeller(res.seller || {}); })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [user]);

  /** Build + download a PDF invoice for one transaction. */
  function getInvoice(r) {
    setBusyId(r.id);
    try {
      downloadInvoice({
        payment: { ...r, product_type_label: TYPE_META[r.product_type]?.label || r.product_type },
        seller
      });
    } catch (e) {
      alert(`Could not generate the invoice: ${e.message}`);
    } finally {
      setBusyId(null);
    }
  }

  const list = rows.filter((r) => filter === "all" || r.product_type === filter)
    .filter((r) => {
      const s = q.toLowerCase();
      return !s || (r.buyer_name || "").toLowerCase().includes(s) || (r.buyer_phone || "").includes(s) || (r.product_name || "").toLowerCase().includes(s);
    });

  const totals = useMemo(() => ({
    gross: rows.reduce((a, r) => a + (r.status === "paid" ? r.amount || 0 : 0), 0) / 100,
    count: rows.length
  }), [rows]);

  function exportCsv() {
    const head = ["Invoice no", "Date", "Customer", "Phone", "Product", "Type", "Coupon", "Amount (₹)", "Status"];
    const lines = list.map((r) => [
      invoiceNumber(r), new Date(r.created_at).toLocaleString("en-IN"), r.buyer_name || "", r.buyer_phone || "",
      r.product_name || "", TYPE_META[r.product_type]?.label || r.product_type,
      r.coupon || "", ((r.amount || 0) / 100).toFixed(2), r.status
    ]);
    const csv = [head, ...lines].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "SuperCreators-payments.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="grid max-w-lg gap-4 sm:grid-cols-2">
        <div className="card p-5"><div className="text-xs font-semibold uppercase tracking-wide text-inkmuted">Total earned</div><div className="mt-1 font-display text-3xl font-bold">{inr(totals.gross)}</div></div>
        <div className="card p-5"><div className="text-xs font-semibold uppercase tracking-wide text-inkmuted">Transactions</div><div className="mt-1 font-display text-3xl font-bold">{totals.count}</div></div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold capitalize ${filter === f ? "border-ink bg-ink text-white" : "border-line bg-white text-inkmuted hover:text-ink"}`}>
              {f === "all" ? "All" : TYPE_META[f]?.label || f}
            </button>
          ))}
        </div>
        <input className="input ml-auto max-w-xs" placeholder="Search name, phone, product…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={exportCsv} className="btn-ghost">Export CSV</button>
      </div>
      <div className="card mt-5 overflow-x-auto">
        <div className="grid min-w-[940px] grid-cols-12 gap-4 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-inkmuted">
          <div className="col-span-2">Date</div><div className="col-span-2">Customer</div>
          <div className="col-span-3">Product</div><div className="col-span-1">Type</div>
          <div className="col-span-2 text-right">Amount</div><div className="col-span-1 text-right">Status</div>
          <div className="col-span-1 text-right">Invoice</div>
        </div>
        {loading && <div className="px-5 py-16 text-center text-sm text-inkmuted">Loading…</div>}
        {!loading && list.length === 0 && <div className="px-5 py-16 text-center text-sm text-inkmuted">No payments yet. Your sales will show up here.</div>}
        {list.map((r) => (
          <div key={r.id} className="grid min-w-[940px] grid-cols-12 items-center gap-4 border-b border-line px-5 py-3.5 text-sm last:border-0">
            <div className="col-span-2">
              <div>{new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
              <div className="truncate text-[11px] text-inkmuted">{invoiceNumber(r)}</div>
            </div>
            <div className="col-span-2 min-w-0">
              <div className="truncate font-semibold">{r.buyer_name || "—"}</div>
              <div className="truncate text-xs text-inkmuted">+{r.buyer_phone || "—"}</div>
            </div>
            <div className="col-span-3 min-w-0">
              <div className="truncate">{r.product_name}</div>
              {r.coupon && <div className="truncate text-xs text-inkmuted">Coupon: {r.coupon}</div>}
            </div>
            <div className="col-span-1"><span className="pill bg-brand-soft text-brand">{TYPE_META[r.product_type]?.label || r.product_type}</span></div>
            <div className="col-span-2 text-right font-semibold">{inr((r.amount || 0) / 100)}</div>
            <div className="col-span-1 text-right"><span className={`pill ${STATUS_STYLE[r.status] || "bg-paper text-inkmuted"}`}>{r.status}</span></div>
            <div className="col-span-1 text-right">
              <button
                onClick={() => getInvoice(r)}
                disabled={busyId === r.id}
                title={`Download invoice ${invoiceNumber(r)} (PDF)`}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-line px-2.5 py-1.5 text-xs font-semibold text-inkmuted transition-colors hover:border-brand hover:text-brand disabled:opacity-50">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {busyId === r.id ? "…" : "PDF"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- ACCOUNT (Profile / Payout / KYC) ---------------- */
const ACCT_TABS = ["Profile", "Payout method", "KYC verification"];

function Account() {
  const [sub, setSub] = useState("Profile");
  return (
    <section className="grid gap-8 px-8 py-8 lg:grid-cols-[220px_1fr]">
      <nav className="flex gap-2 lg:flex-col">
        {ACCT_TABS.map((t) => (
          <button key={t} onClick={() => setSub(t)}
            className={`rounded-[10px] px-4 py-2.5 text-left text-sm font-semibold transition-colors ${sub === t ? "bg-ink text-white" : "text-inkmuted hover:bg-paper hover:text-ink"}`}>
            {t}
          </button>
        ))}
      </nav>
      <div className="min-w-0">
        {sub === "Profile" && <ProfilePanel />}
        {sub === "Payout method" && <PayoutPanel />}
        {sub === "KYC verification" && <KycPanel />}
      </div>
    </section>
  );
}

function ProfilePanel() {
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("mp_profiles").select("full_name,business_name,email,profession,display_name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setP(data || {}));
  }, [user]);
  if (!p) return <div className="text-sm text-inkmuted">Loading…</div>;

  async function save() {
    setSaving(true); setMsg("");
    try { await apiFetch("/api/profile/update", { full_name: p.full_name, business_name: p.business_name, email: p.email, profession: p.profession }); setMsg("Saved ✓"); }
    catch (e) { setMsg(e.message); }
    finally { setSaving(false); }
  }
  return (
    <div className="card max-w-xl space-y-5 p-6">
      <h2 className="font-display text-lg font-bold">Your profile</h2>
      <Field label="Full name" required><input className="input" value={p.full_name || ""} onChange={(e) => setP({ ...p, full_name: e.target.value })} /></Field>
      <Field label="Coaching / business name"><input className="input" value={p.business_name || ""} onChange={(e) => setP({ ...p, business_name: e.target.value })} /></Field>
      <Field label="Email"><input className="input" type="email" value={p.email || ""} onChange={(e) => setP({ ...p, email: e.target.value })} /></Field>
      <Field label="Profession"><input className="input" value={p.profession || ""} onChange={(e) => setP({ ...p, profession: e.target.value })} /></Field>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-brand">{saving ? "Saving…" : "Save profile"}</button>
        {msg && <span className={`text-sm font-semibold ${msg.includes("✓") ? "text-teal" : "text-danger"}`}>{msg}</span>}
      </div>
    </div>
  );
}

function PayoutPanel() {
  const { user } = useAuth();
  const [m, setM] = useState(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("mp_profiles").select("payout_method").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setM(data?.payout_method?.type ? data.payout_method : { type: "upi", upi: "", account: "", ifsc: "", holder: "" }));
  }, [user]);
  if (!m) return <div className="text-sm text-inkmuted">Loading…</div>;

  async function save() {
    setSaving(true); setMsg("");
    const payload = m.type === "upi" ? { type: "upi", upi: m.upi } : { type: "bank", account: m.account, ifsc: (m.ifsc || "").toUpperCase(), holder: m.holder };
    const { error } = await supabase.from("mp_profiles").update({ payout_method: payload }).eq("user_id", user.id);
    setSaving(false); setMsg(error ? error.message : "Saved ✓");
  }
  return (
    <div className="card max-w-xl space-y-5 p-6">
      <h2 className="font-display text-lg font-bold">Payout method</h2>
      <p className="text-sm text-inkmuted">Where we send your earnings when you request a payout.</p>
      <div className="flex gap-2">
        {["upi", "bank"].map((t) => (
          <button key={t} onClick={() => setM({ ...m, type: t })}
            className={`flex-1 rounded-[8px] border px-3 py-2 text-sm font-semibold ${m.type === t ? "border-brand bg-brand-soft text-brand" : "border-line text-inkmuted"}`}>
            {t === "upi" ? "UPI" : "Bank transfer"}
          </button>
        ))}
      </div>
      {m.type === "upi" ? (
        <Field label="UPI ID"><input className="input" placeholder="name@bank" value={m.upi || ""} onChange={(e) => setM({ ...m, upi: e.target.value })} /></Field>
      ) : (
        <>
          <Field label="Account holder name"><input className="input" value={m.holder || ""} onChange={(e) => setM({ ...m, holder: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Account number"><input className="input" value={m.account || ""} onChange={(e) => setM({ ...m, account: e.target.value })} /></Field>
            <Field label="IFSC"><input className="input uppercase" value={m.ifsc || ""} onChange={(e) => setM({ ...m, ifsc: e.target.value })} /></Field>
          </div>
        </>
      )}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-brand">{saving ? "Saving…" : "Save payout method"}</button>
        {msg && <span className={`text-sm font-semibold ${msg.includes("✓") ? "text-teal" : "text-danger"}`}>{msg}</span>}
      </div>
    </div>
  );
}

const KYC_BADGE = {
  not_started: { label: "Not started", cls: "bg-paper text-inkmuted" },
  under_review: { label: "Under review", cls: "bg-[#FEF3C7] text-[#92600A]" },
  verified: { label: "Verified", cls: "bg-teal-soft text-teal" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-danger" }
};

function KycPanel() {
  const { user } = useAuth();
  const [k, setK] = useState(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/kyc", undefined, "GET").then((res) => setK(res.kyc || { status: "not_started" })).catch(() => setK({ status: "not_started" }));
  }, [user]);
  if (!k) return <div className="text-sm text-inkmuted">Loading…</div>;

  const badge = KYC_BADGE[k.status] || KYC_BADGE.not_started;
  const locked = k.status === "under_review" || k.status === "verified";
  const set = (p) => setK({ ...k, ...p });

  async function onDoc(files) {
    if (!files?.[0]) return;
    setUploading(true);
    try { set({ doc_url: await uploadImage(user.id, files[0]) }); } catch (e) { setMsg(e.message); }
    finally { setUploading(false); }
  }
  async function submit() {
    setSaving(true); setMsg("");
    try {
      const res = await apiFetch("/api/kyc", {
        legal_name: k.legal_name, pan: k.pan, gst: k.gst,
        bank_account: k.bank_account, ifsc: k.ifsc, bank_holder: k.bank_holder, doc_url: k.doc_url
      });
      setK({ ...k, status: res.status }); setMsg("Submitted for review ✓");
    } catch (e) { setMsg(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="card max-w-xl space-y-5 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">KYC verification</h2>
        <span className={`pill ${badge.cls}`}>{badge.label}</span>
      </div>
      {k.status === "verified" && <p className="rounded-[8px] bg-teal-soft p-3 text-sm text-teal">Your account is verified. You're all set to receive payouts.</p>}
      {k.status === "under_review" && <p className="rounded-[8px] bg-[#FEF3C7] p-3 text-sm text-[#92600A]">Your documents are under review. We'll update this once verified.</p>}
      {k.status === "rejected" && <p className="rounded-[8px] bg-red-50 p-3 text-sm text-danger">Rejected{k.admin_note ? `: ${k.admin_note}` : "."} Please correct and resubmit.</p>}

      <Field label="Legal name (as per PAN)" required><input className="input" disabled={locked} value={k.legal_name || ""} onChange={(e) => set({ legal_name: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="PAN" required><input className="input uppercase" disabled={locked} placeholder="ABCDE1234F" value={k.pan || ""} onChange={(e) => set({ pan: e.target.value })} /></Field>
        <Field label="GST (optional)"><input className="input uppercase" disabled={locked} value={k.gst || ""} onChange={(e) => set({ gst: e.target.value })} /></Field>
      </div>
      <Field label="Bank account holder"><input className="input" disabled={locked} value={k.bank_holder || ""} onChange={(e) => set({ bank_holder: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bank account number" required><input className="input" disabled={locked} value={k.bank_account || ""} onChange={(e) => set({ bank_account: e.target.value })} /></Field>
        <Field label="IFSC" required><input className="input uppercase" disabled={locked} value={k.ifsc || ""} onChange={(e) => set({ ifsc: e.target.value })} /></Field>
      </div>
      <Field label="ID / PAN document" hint="Upload a clear photo or scan">
        <div className="flex items-center gap-3">
          {k.doc_url && <a href={k.doc_url} target="_blank" className="text-sm font-semibold text-brand">View uploaded ↗</a>}
          {!locked && <label className="btn-ghost cursor-pointer">{uploading ? "Uploading…" : k.doc_url ? "Replace" : "Upload document"}<input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onDoc(e.target.files)} /></label>}
        </div>
      </Field>

      {!locked && (
        <div className="flex items-center gap-3">
          <button onClick={submit} disabled={saving} className="btn-brand">{saving ? "Submitting…" : "Submit for verification"}</button>
          {msg && <span className={`text-sm font-semibold ${msg.includes("✓") ? "text-teal" : "text-danger"}`}>{msg}</span>}
        </div>
      )}
    </div>
  );
}
