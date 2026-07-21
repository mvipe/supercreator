"use client";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { getPlanDetails } from "@/lib/plan";
import { heroSurface } from "@/lib/texture";

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

export default function SubscriptionModal({ onClose, onSuccess, onFree }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("");
  const [planDetails, setPlanDetails] = useState({
    freePlanCommission: 30,
    proPlanCommission: 10,
    proPlanPriceRupees: 4.99,
    proPlanPriceDisplay: "₹4.99",
  });

  useEffect(() => {
    let mounted = true;
    async function loadDetails() {
      try {
        const details = await getPlanDetails();
        if (mounted) setPlanDetails(details);
      } catch (error) {
        console.error("Failed to load plan details:", error);
      }
    }
    loadDetails();
    return () => { mounted = false; };
  }, []);

  /**
   * Verify with retries. The payment is already captured by the time this
   * runs, so a flaky network must not strand the user on the free plan —
   * back off and try again before surfacing anything.
   */
  async function verifyWithRetry(resp, attempts = 4) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      try {
        return await apiFetch("/api/subscription/verify", resp);
      } catch (ex) {
        lastErr = ex;
        // A rejected signature is final — don't hammer it.
        if (/verification failed/i.test(ex.message)) throw ex;
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
      }
    }
    throw lastErr;
  }

  async function upgrade() {
    setBusy(true); setErr("");
    try {
      const details = await getPlanDetails();
      setPlanDetails(details);
      const res = await apiFetch("/api/subscription/order", {});
      if (res.alreadyPro) {
        onSuccess?.();
        return;
      }
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load Razorpay. Check your connection.");
      const rzp = new window.Razorpay({
        key: res.keyId,
        order_id: res.orderId,
        amount: res.amount,
        currency: "INR",
        name: "SuperCreators Pro",
        description: `${details.proPlanPriceDisplay} — unlock all features`,
        prefill: { contact: user?.user_metadata?.phone || "" },
        theme: { color: "#2E6EF7" },
        handler: async (resp) => {
          setStatus("Confirming your payment…");
          try {
            await verifyWithRetry(resp);
            setStatus("");
            onSuccess?.();
          } catch (ex) {
            setStatus("");
            // Money is taken but the plan didn't land. Give them the payment
            // ID and tell them a refresh will pick it up — /api/me reconciles
            // paid-but-ungranted orders on its own.
            setErr(
              `${ex.message} Your payment (${resp.razorpay_payment_id}) went through — ` +
              `refresh this page in a moment and your Pro plan should appear. ` +
              `If it doesn't, contact support with that payment ID.`
            );
            setBusy(false);
          }
        },
        modal: { ondismiss: () => { setBusy(false); setStatus(""); } },
      });
      rzp.on("payment.failed", (r) => { setErr(r.error?.description || "Payment failed."); setBusy(false); setStatus(""); });
      rzp.open();
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
      setStatus("");
    }
  }

  const publishFree = () => {
    onFree?.();
  };

  const freePlanEarnings = 100 - planDetails.freePlanCommission;
  const proPlanEarnings = 100 - planDetails.proPlanCommission;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-2xl overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative overflow-hidden px-6 pb-5 pt-7 text-white" style={heroSurface()}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-white/70">Publish options</div>
              <div className="mt-1 font-display text-3xl font-bold">Choose your creator plan</div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-white/70 hover:bg-white/10" aria-label="Close">✕</button>
          </div>
          <p className="mt-2 text-sm text-white/80">Pick free publishing with higher commission, or upgrade to Pro for lower fees and extra tools.</p>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="rounded-3xl border border-line p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-ink">Free plan</div>
                <div className="text-xs text-inkmuted">Publish now with commission-based earnings</div>
              </div>
              <span className="rounded-full bg-brand/10 px-3 py-1 text-[11px] font-semibold text-brand">Free</span>
            </div>
            <div className="space-y-3 text-sm text-inkmuted">
              <div className="flex items-center justify-between">
                <span>Commission rate</span>
                <span className="font-semibold">{planDetails.freePlanCommission}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>You keep</span>
                <span className="font-semibold">{freePlanEarnings}%</span>
              </div>
              <div className="text-xs text-inkmuted">No monthly fee. Platform takes a share from each sale.</div>
              <div className="text-xs text-inkmuted">Great if you want to publish immediately and start earning today.</div>
            </div>
            <button onClick={publishFree} disabled={busy} className="btn btn-outline mt-6 w-full py-3">
              Publish as Free
            </button>
          </div>

          <div className="rounded-3xl border border-line p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-ink">Pro plan</div>
                <div className="text-xs text-inkmuted">Lower commission + advanced creator tools</div>
              </div>
              <span className="rounded-full bg-teal-soft px-3 py-1 text-[11px] font-semibold text-teal">{planDetails.proPlanPriceDisplay}/mo</span>
            </div>
            <div className="space-y-3 text-sm text-inkmuted">
              <div className="flex items-center justify-between">
                <span>Commission rate</span>
                <span className="font-semibold">{planDetails.proPlanCommission}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>You keep</span>
                <span className="font-semibold">{proPlanEarnings}%</span>
              </div>
              <div className="text-xs text-inkmuted">Lower fee per sale and access to premium features.</div>
              <div className="text-xs text-inkmuted">Best if you want more control, payouts and growth tools.</div>
            </div>
            <button onClick={upgrade} disabled={busy} className="btn-brand mt-6 w-full py-3">
              {busy ? (status || "Processing…") : `Upgrade to Pro — ${planDetails.proPlanPriceDisplay}`}
            </button>
          </div>
        </div>
        {err && <div className="border-t border-line px-6 py-4 text-sm text-danger">{err}</div>}
      </div>
    </div>
  );
}
