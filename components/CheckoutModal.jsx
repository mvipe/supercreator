"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/supabase";
import { inr } from "@/lib/courseModel";

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const DEFAULT_QUESTIONS = [
  { id: "q_name", label: "What's your name?", type: "text", required: true },
  { id: "q_phone", label: "Add your phone number", type: "phone", required: true }
];

/**
 * Generic checkout for any product.
 * price: { isFree, isPwyw, min, label } — display only; server recomputes.
 */
export default function CheckoutModal({ productType, productId, title, accent = "#2E6EF7", questions, price, allowCoupon = false, meta = {}, user, onClose, onSuccess }) {
  const qs = questions?.length ? questions : DEFAULT_QUESTIONS;
  const [answers, setAnswers] = useState(() =>
    Object.fromEntries(qs.map((q) => [q.id, q.type === "phone" ? (user.user_metadata?.phone || "") : ""])));
  const [coupon, setCoupon] = useState("");
  const [pwyw, setPwyw] = useState(Math.max(price?.min || 99, 99));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState(null);       // { base, final, applied }
  const [couponMsg, setCouponMsg] = useState("");
  const [checking, setChecking] = useState(false);

  async function applyCoupon() {
    if (!coupon.trim()) return;
    setChecking(true); setCouponMsg("");
    try {
      const res = await apiFetch("/api/checkout/quote", {
        productType, productId, coupon: coupon.trim().toUpperCase(),
        pwywAmount: price?.isPwyw ? Number(pwyw) : null
      });
      if (res.couponError) { setQuote(null); setCouponMsg(res.couponError); }
      else if (res.applied) { setQuote(res); setCouponMsg(`Coupon applied — you save ${inr((res.base - res.final))}!`); }
      else { setQuote(null); setCouponMsg("This code doesn't apply here."); }
    } catch (e) { setCouponMsg(e.message); }
    finally { setChecking(false); }
  }

  const effectiveLabel = quote?.applied
    ? inr(quote.final)
    : price?.isPwyw ? inr(pwyw) : price?.label || "";
  const payLabel = price?.isFree ? "Continue for free" : `Pay ${effectiveLabel}`;

  async function pay(e) {
    e.preventDefault();
    setErr("");
    for (const q of qs) {
      if (q.required && !String(answers[q.id] || "").trim()) { setErr(`Please answer: ${q.label}`); return; }
    }
    setBusy(true);
    try {
      const res = await apiFetch("/api/checkout/order", {
        productType, productId, meta,
        coupon: allowCoupon ? (coupon.trim().toUpperCase() || null) : null,
        pwywAmount: price?.isPwyw ? Number(pwyw) : null,
        answers: qs.map((q) => ({ label: q.label, value: answers[q.id] || "" }))
      });
      if (res.free) { onSuccess(); return; }
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load Razorpay. Check your connection.");
      const rzp = new window.Razorpay({
        key: res.keyId, order_id: res.orderId, amount: res.amount, currency: "INR",
        name: title, description: "SuperCreators checkout",
        prefill: { contact: user.user_metadata?.phone || "" },
        theme: { color: accent },
        handler: async (resp) => {
          try { await apiFetch("/api/checkout/verify", resp); onSuccess(); }
          catch (ex) { setErr(ex.message); setBusy(false); }
        },
        modal: { ondismiss: () => setBusy(false) }
      });
      rzp.on("payment.failed", (r) => { setErr(r.error?.description || "Payment failed. Please try again."); setBusy(false); });
      rzp.open();
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">{title}</h2>
            <p className="text-sm text-inkmuted">Signed in as +{user.user_metadata?.phone}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-inkmuted hover:bg-paper" aria-label="Close">✕</button>
        </div>
        <form onSubmit={pay} className="mt-5 space-y-4">
          {qs.map((q) => (
            <div key={q.id}>
              <label className="label">{q.label} {q.required && <span className="req">*</span>}</label>
              <input className="input" type={q.type === "email" ? "email" : q.type === "phone" ? "tel" : "text"}
                value={answers[q.id]} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
            </div>
          ))}
          {price?.isPwyw && (
            <div>
              <label className="label">Pay what you want (min {inr(price.min || 99)})</label>
              <input className="input" type="number" min={price.min || 99} value={pwyw} onChange={(e) => setPwyw(e.target.value)} />
            </div>
          )}
          {allowCoupon && !price?.isFree && (
            <div>
              <label className="label">Coupon code</label>
              <div className="flex gap-2">
                <input className="input uppercase" placeholder="Optional"
                  value={coupon}
                  onChange={(e) => { setCoupon(e.target.value); setQuote(null); setCouponMsg(""); }} />
                <button type="button" onClick={applyCoupon} disabled={checking || !coupon.trim()}
                  className="btn-ghost shrink-0">{checking ? "…" : "Apply"}</button>
              </div>
              {couponMsg && <p className={`mt-1.5 text-sm ${quote?.applied ? "font-semibold text-teal" : "text-danger"}`}>{couponMsg}</p>}
            </div>
          )}
          {quote?.applied && (
            <div className="rounded-[8px] bg-paper p-3 text-sm">
              <div className="flex justify-between text-inkmuted"><span>Original</span><span className="line-through">{inr(quote.base)}</span></div>
              <div className="mt-0.5 flex justify-between font-semibold"><span>You pay</span><span>{inr(quote.final)}</span></div>
            </div>
          )}
          {err && <p className="text-sm text-danger">{err}</p>}
          <button className="w-full rounded-[10px] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: accent }} disabled={busy}>
            {busy ? "Processing…" : payLabel}
          </button>
          <p className="text-center text-[11px] text-inkmuted">Payments are processed securely by Razorpay.</p>
        </form>
      </div>
    </div>
  );
}

