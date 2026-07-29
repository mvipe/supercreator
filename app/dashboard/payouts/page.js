"use client";
import { useEffect, useState } from "react";
import { supabase, apiFetch } from "@/lib/supabase";
import { inr } from "@/lib/courseModel";
import { Field } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";
import { heroSurface, SHEEN } from "@/lib/texture";

const STATUS_STYLE = {
  requested: "bg-brand-soft text-brand",
  approved: "bg-brand-soft text-brand",
  processing: "bg-[#FEF3C7] text-[#92600A]",
  paid: "bg-teal-soft text-teal",
  rejected: "bg-red-50 text-danger"
};

export default function Payouts() {
  const { user, ownerId } = useAuth();
  const [available, setAvailable] = useState(0);   // paise
  const [rows, setRows] = useState([]);
  const [kyc, setKyc] = useState("not_started");
  const [method, setMethod] = useState({ type: "upi", upi: "", account: "", ifsc: "", holder: "" });
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    const [{ data: bal }, { data: prof }, { data: pay }] = await Promise.all([
      supabase.rpc("mp_available_balance"),
      supabase.from("mp_profiles").select("payout_method, kyc_status").eq("user_id", ownerId).maybeSingle(),
      supabase.from("mp_payouts").select("*").eq("creator_id", ownerId).order("requested_at", { ascending: false })
    ]);
    setAvailable(Number(bal || 0));
    setRows(pay || []);
    setKyc(prof?.kyc_status || "not_started");
    if (prof?.payout_method?.type) setMethod((m) => ({ ...m, ...prof.payout_method }));
  }
  useEffect(() => { if (user) load(); }, [user]);

  const verified = kyc === "verified";
  const hasOpen = rows.some((r) => ["requested", "approved", "processing"].includes(r.status));

  async function request() {
    setBusy(true); setErr(""); setMsg("");
    try {
      const payload = {
        amount: Number(amount),
        note: note.trim() || null,
        method: method.type === "upi"
          ? { type: "upi", upi: method.upi.trim() }
          : { type: "bank", account: method.account.trim(), ifsc: method.ifsc.trim().toUpperCase(), holder: method.holder.trim() }
      };
      await apiFetch("/api/payouts/request", payload);
      setMsg("Payout requested! We'll process it shortly.");
      setAmount(""); setNote("");
      await load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <main>
      <section className="relative overflow-hidden px-8 pb-12 pt-8 text-white" style={heroSurface()}>
        <div className="pointer-events-none absolute inset-0" style={SHEEN} />
        <div className="relative">
          <h1 className="font-display text-4xl font-bold drop-shadow-sm">Payouts</h1>
          <p className="mt-1 text-sm text-white/75">Withdraw your earnings to UPI or bank.</p>
          <div className="mt-8 max-w-sm rounded-card bg-white p-5 text-ink shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-inkmuted">Available to withdraw</div>
            <div className="mt-1 font-display text-4xl font-bold">{inr(available / 100)}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 px-8 py-8 lg:grid-cols-[1fr_1.2fr]">
        {/* Request form */}
        <div className="card h-max p-6">
          <h2 className="font-display text-lg font-bold">Request a payout</h2>
          {!verified ? (
            <div className="mt-3 rounded-[8px] bg-[#FEF3C7] p-4 text-sm text-[#92600A]">
              {kyc === "under_review"
                ? "Your KYC is under review. You'll be able to request payouts once it's verified."
                : kyc === "rejected"
                  ? "Your KYC was rejected. Please correct and resubmit it to enable payouts."
                  : "Complete your KYC verification to enable payouts."}
              <a href="/dashboard/payments" className="mt-2 block font-bold underline">Go to KYC verification →</a>
            </div>
          ) : hasOpen ? (
            <p className="mt-3 rounded-[8px] bg-paper p-4 text-sm text-inkmuted">
              You have a payout in progress. You can request another once it's paid or rejected.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <Field label="Amount (₹)" hint={`Min ₹100 · up to ${inr(available / 100)}`}>
                <input className="input" type="number" min="100" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
              </Field>
              <div className="flex gap-2">
                {["upi", "bank"].map((t) => (
                  <button key={t} onClick={() => setMethod({ ...method, type: t })}
                    className={`flex-1 rounded-[8px] border px-3 py-2 text-sm font-semibold capitalize ${method.type === t ? "border-brand bg-brand-soft text-brand" : "border-line text-inkmuted"}`}>
                    {t === "upi" ? "UPI" : "Bank transfer"}
                  </button>
                ))}
              </div>
              {method.type === "upi" ? (
                <Field label="UPI ID"><input className="input" placeholder="name@bank" value={method.upi} onChange={(e) => setMethod({ ...method, upi: e.target.value })} /></Field>
              ) : (
                <>
                  <Field label="Account holder name"><input className="input" value={method.holder} onChange={(e) => setMethod({ ...method, holder: e.target.value })} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Account number"><input className="input" value={method.account} onChange={(e) => setMethod({ ...method, account: e.target.value })} /></Field>
                    <Field label="IFSC"><input className="input uppercase" value={method.ifsc} onChange={(e) => setMethod({ ...method, ifsc: e.target.value })} /></Field>
                  </div>
                </>
              )}
              <Field label="Note (optional)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything we should know" /></Field>
              {err && <p className="text-sm text-danger">{err}</p>}
              {msg && <p className="text-sm font-semibold text-teal">{msg}</p>}
              <button onClick={request} disabled={busy || available < 10000} className="btn-brand w-full">
                {busy ? "Requesting…" : "Request payout"}
              </button>
              {available < 10000 && <p className="text-center text-xs text-inkmuted">You need at least ₹100 available to request a payout.</p>}
            </div>
          )}
        </div>

        {/* History */}
        <div className="card">
          <div className="grid grid-cols-12 gap-4 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-inkmuted">
            <div className="col-span-3">Requested</div><div className="col-span-2">Amount</div>
            <div className="col-span-3">Method</div><div className="col-span-2">Status</div><div className="col-span-2">Reference</div>
          </div>
          {rows.length === 0 && <div className="px-5 py-16 text-center text-sm text-inkmuted">No payouts yet. Request your first one on the left.</div>}
          {rows.map((r) => (
            <div key={r.id} className="grid grid-cols-12 items-center gap-4 border-b border-line px-5 py-3.5 text-sm last:border-0">
              <div className="col-span-3">{new Date(r.requested_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
              <div className="col-span-2 font-semibold">{inr(r.amount / 100)}</div>
              <div className="col-span-3 truncate text-inkmuted">{r.method?.type === "upi" ? r.method.upi : `A/C ••${String(r.method?.account || "").slice(-4)}`}</div>
              <div className="col-span-2"><span className={`pill ${STATUS_STYLE[r.status]}`}>{r.status}</span></div>
              <div className="col-span-2 truncate text-inkmuted">{r.reference || "—"}</div>
              {r.admin_note && <div className="col-span-12 -mt-1 text-xs text-inkmuted">Note: {r.admin_note}</div>}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}