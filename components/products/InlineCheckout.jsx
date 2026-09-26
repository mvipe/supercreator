"use client";
import { useState } from "react";
import { apiFetch, supabase } from "@/lib/supabase";
import { inr } from "@/lib/courseModel";
import { INDIAN_STATES } from "@/lib/india";

// =============================================================
// InlineCheckout — the checkout form embedded straight into a product's buy
// card (book / payment page), exactly like the course sales page.
//
// Before this, books and payment pages showed only a price and a single
// "Buy & download" button that popped a separate CheckoutModal. Courses, by
// contrast, put the email / phone / GSTIN / state fields right in the card.
// This component gives products that same in-card form and runs the identical
// guest → Razorpay → guest-verify flow the modal used, so nothing about the
// payment path changes — only where the fields live.
//
// It renders in two modes:
//   live     — real fields, real payment
//   preview  — same fields, but inert (used in the studio preview pane)
// =============================================================

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

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

export default function InlineCheckout({
  productType,
  productId,
  title,
  accent = "#2E6EF7",
  price = {},            // { isFree, isPwyw, min, label }
  buttonLabel = "Get it now",
  meta = {},
  user = null,
  mode = "live",
  allowCoupon = true,
  onSuccess
}) {
  const preview = mode === "preview";
  const guest = !user;

  const [form, setForm] = useState({
    email: user?.email || "",
    phone: user?.user_metadata?.phone || "",
    state: "",
    gstin: "",
    pwyw: Math.max(price?.min || 99, 99)
  });
  const setF = (patch) => setForm((f) => ({ ...f, ...patch }));

  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState(null);       // { base, final, applied }
  const [couponMsg, setCouponMsg] = useState("");
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function applyCoupon() {
    if (!coupon.trim() || preview) return;
    setChecking(true); setCouponMsg("");
    try {
      const res = await apiFetch("/api/checkout/quote", {
        productType, productId, coupon: coupon.trim().toUpperCase(),
        pwywAmount: price?.isPwyw ? Number(form.pwyw) : null
      });
      if (res.couponError) { setQuote(null); setCouponMsg(res.couponError); }
      else if (res.applied) { setQuote(res); setCouponMsg(`Coupon applied — you save ${inr(res.base - res.final)}!`); }
      else { setQuote(null); setCouponMsg("This code doesn't apply here."); }
    } catch (e) { setCouponMsg(e.message); }
    finally { setChecking(false); }
  }

  /** Sign a guest in on-screen with the magic-link token from the server. */
  async function signInGuest(tokenHash) {
    if (!tokenHash) return;
    try { await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" }); } catch { /* non-fatal */ }
  }

  async function pay(e) {
    e.preventDefault();
    if (preview) return;
    setErr("");

    if (guest) {
      if (!isEmail(form.email)) { setErr("Enter a valid email address."); return; }
      if (!String(form.phone).trim()) { setErr("Enter your phone number."); return; }
      if (!form.state) { setErr("Please select your state."); return; }
    }
    if (price?.isPwyw && Number(form.pwyw) < (price.min || 1)) {
      setErr(`Enter at least ${inr(price.min || 1)}.`); return;
    }

    setBusy(true);
    try {
      const couponCode = allowCoupon ? (coupon.trim().toUpperCase() || null) : null;
      const pwywAmount = price?.isPwyw ? Number(form.pwyw) : null;

      // --- GUEST PATH (no account needed) --------------------------------
      if (guest) {
        const res = await apiFetch("/api/checkout/guest-order", {
          productType, productId,
          email: form.email.trim(), phone: form.phone.trim(), state: form.state, gstin: form.gstin,
          coupon: couponCode, pwywAmount
        });
        if (res.free) { await signInGuest(res.tokenHash); onSuccess?.(); return; }
        const ok = await loadRazorpay();
        if (!ok) throw new Error("Could not load Razorpay. Check your connection.");
        const rzp = new window.Razorpay({
          key: res.keyId, order_id: res.orderId, amount: res.amount, currency: "INR",
          name: title, description: "SuperCreators checkout",
          prefill: { email: form.email.trim(), contact: form.phone.trim() },
          theme: { color: accent },
          handler: async (resp) => {
            try { const v = await apiFetch("/api/checkout/guest-verify", resp); await signInGuest(v.tokenHash); onSuccess?.(); }
            catch (ex) { setErr(ex.message); setBusy(false); }
          },
          modal: { ondismiss: () => setBusy(false) }
        });
        rzp.on("payment.failed", (r) => { setErr(r.error?.description || "Payment failed. Please try again."); setBusy(false); });
        rzp.open();
        return;
      }

      // --- AUTHED PATH ---------------------------------------------------
      const res = await apiFetch("/api/checkout/order", {
        productType, productId, meta,
        coupon: couponCode, pwywAmount,
        answers: [
          { label: "Email", value: form.email || user?.email || "" },
          { label: "Phone", value: form.phone || user?.user_metadata?.phone || "" },
          ...(form.state ? [{ label: "State", value: form.state }] : []),
          ...(form.gstin ? [{ label: "GSTIN", value: form.gstin }] : [])
        ]
      });
      if (res.free) { onSuccess?.(); return; }
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load Razorpay. Check your connection.");
      const rzp = new window.Razorpay({
        key: res.keyId, order_id: res.orderId, amount: res.amount, currency: "INR",
        name: title, description: "SuperCreators checkout",
        prefill: { email: form.email || user?.email || "", contact: form.phone || user?.user_metadata?.phone || "" },
        theme: { color: accent },
        handler: async (resp) => {
          try { await apiFetch("/api/checkout/verify", resp); onSuccess?.(); }
          catch (ex) { setErr(ex.message); setBusy(false); }
        },
        modal: { ondismiss: () => setBusy(false) }
      });
      rzp.on("payment.failed", (r) => { setErr(r.error?.description || "Payment failed. Please try again."); setBusy(false); });
      rzp.open();
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }

  const priceLabel = quote?.applied
    ? inr(quote.final)
    : price?.isPwyw ? inr(form.pwyw) : (price?.label || "");
  const cta = price?.isFree ? buttonLabel : `${buttonLabel} · ${priceLabel}`;

  return (
    <form onSubmit={pay} className="space-y-3">
      {!price?.isFree && (
        <p className="text-xs text-inkmuted">Access to this purchase will be sent to this email</p>
      )}

      <input
        className="input" type="email" required={!preview} placeholder="Email address"
        value={form.email} onChange={(e) => setF({ email: e.target.value })} disabled={preview}
      />

      <div className="flex items-stretch overflow-hidden rounded-[10px] border border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
        <span className="flex items-center bg-paper px-3 text-sm text-inkmuted">+91</span>
        <input
          className="flex-1 px-3 py-2.5 text-sm outline-none disabled:bg-transparent" type="tel" required={!preview}
          placeholder="Phone number" value={form.phone} onChange={(e) => setF({ phone: e.target.value })} disabled={preview}
        />
      </div>

      <input
        className="input" type="text" placeholder="GSTIN (optional)"
        value={form.gstin} onChange={(e) => setF({ gstin: e.target.value })} disabled={preview}
      />

      <div className="relative">
        <select
          className="input cursor-pointer appearance-none pr-10" required={!preview}
          value={form.state} onChange={(e) => setF({ state: e.target.value })} disabled={preview}
        >
          <option value="">Select State</option>
          {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inkmuted"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {price?.isPwyw && (
        <input
          className="input" type="number" min={price.min || 99} placeholder="Amount you'd like to pay"
          value={form.pwyw} onChange={(e) => setF({ pwyw: e.target.value })} disabled={preview}
        />
      )}

      {allowCoupon && !price?.isFree && (
        <div>
          <div className="flex gap-2">
            <input className="input uppercase" placeholder="Discount code"
              value={coupon}
              onChange={(e) => { setCoupon(e.target.value); setQuote(null); setCouponMsg(""); }}
              disabled={preview} />
            <button type="button" onClick={applyCoupon} disabled={preview || checking || !coupon.trim()}
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

      <button
        type="submit" disabled={busy || preview}
        className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: accent, cursor: preview ? "default" : "pointer" }}
      >
        {busy ? "Processing…" : (<><span>{cta}</span><span>→</span></>)}
      </button>

      <p className="text-center text-[11px] text-inkmuted">Secure payment via Razorpay{guest ? " · no account needed" : ""}</p>
    </form>
  );
}
