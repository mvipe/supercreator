"use client";
import { useAuth } from "@/components/AuthProvider";
import { useState, useEffect, useCallback } from "react";
import { fetchMe, getPlanDetails } from "@/lib/plan";
import { supabase } from "@/lib/supabase";
import SubscriptionModal from "@/components/SubscriptionModal";
import { downloadInvoice, invoiceNumber } from "@/lib/invoice";

const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function BillingSettings() {
  const { user } = useAuth();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [seller, setSeller] = useState({});
  const [planDetails, setPlanDetails] = useState({ proPlanPriceDisplay: "₹4.99" });
  const [showUpgrade, setShowUpgrade] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [meData, planDetailsData, orders1, orders2, prof] = await Promise.all([
        fetchMe(),
        getPlanDetails(),
        supabase.from("mp_orders").select("*").eq("buyer_id", user.id).eq("status", "paid").order("created_at", { ascending: false }),
        supabase.from("mp_sub_orders").select("*").eq("user_id", user.id).eq("status", "paid").order("created_at", { ascending: false }),
        supabase.from("mp_profiles").select("full_name, display_name, business_name, email, phone_number").eq("user_id", user.id).maybeSingle()
      ]);

      setMe(meData);
      setPlanDetails(planDetailsData);
      setSeller({
        name: prof.data?.full_name || prof.data?.display_name || "",
        business: prof.data?.business_name || "",
        email: prof.data?.email || "",
        phone: prof.data?.phone_number || ""
      });

      const allOrders = [
        ...(orders1.data || []).map((o) => ({ ...o, type: "purchase" })),
        ...(orders2.data || []).map((o) => ({ ...o, type: "subscription", product_type: "subscription" }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setOrders(allOrders);
    } catch (error) {
      console.error("Billing loading error:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Razorpay hands control back through a popup; re-check the plan when the
  // tab regains focus so an upgrade never *looks* like it didn't stick.
  useEffect(() => {
    if (!user) return;
    const onFocus = () => fetchMe().then(setMe).catch(() => {});
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [user]);

  function getInvoice(order) {
    const isSub = order.type === "subscription";
    downloadInvoice({
      payment: {
        id: order.id,
        created_at: order.created_at,
        product_name: isSub ? "SuperCreators Pro — 30 days" : (order.product_type || "Purchase"),
        product_type_label: isSub ? "Subscription" : order.product_type,
        amount: order.amount,
        gross_amount: order.amount,
        creator_amount: order.amount,
        razorpay_payment_id: order.razorpay_payment_id,
        razorpay_order_id: order.razorpay_order_id,
        buyer_name: seller.name || "Customer",
        buyer_phone: seller.phone,
        buyer_email: seller.email,
        status: "paid",
        notes: isSub ? "Subscription payment for SuperCreators Pro." : undefined
      },
      // For your own billing, SuperCreators is the seller and you're the buyer.
      seller: { business: "SuperCreators", name: "SuperCreators", email: "support@SuperCreators.app" }
    });
  }

  if (loading) return <div className="text-sm text-inkmuted">Loading…</div>;

  const isPro = !!me?.isPro;
  const expires = me?.planExpiresAt;
  const daysLeft = expires ? Math.ceil((new Date(expires) - new Date()) / 86400000) : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Your SuperCreators subscription</h2>
        <button onClick={load} className="btn-ghost text-xs">Refresh</button>
      </div>

      <div className="rounded-lg border border-line p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-inkmuted">You're on</div>
            <div className="mt-2 font-display text-2xl font-bold">
              {isPro ? "Pro plan" : "Free plan (Starter)"}
            </div>
            {isPro && expires && (
              <div className="mt-1 text-sm text-inkmuted">
                Renews / expires on <b className="text-ink">{fmtDate(expires)}</b>
                {daysLeft != null && daysLeft >= 0 && ` · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
              </div>
            )}
            {/* A lapsed Pro still reads plan="pro" in the DB — say so plainly. */}
            {!isPro && me?.plan === "pro" && expires && (
              <div className="mt-1 text-sm text-danger">Your Pro plan expired on {fmtDate(expires)}.</div>
            )}
          </div>
          {isPro && <span className="pill bg-teal-soft text-teal">Active</span>}
        </div>

        {!isPro && (
          <button onClick={() => setShowUpgrade(true)} className="btn btn-brand mt-4">
            Upgrade to Pro — {planDetails.proPlanPriceDisplay}/month
          </button>
        )}
        {isPro && (
          <button onClick={() => setShowUpgrade(true)} className="btn-ghost mt-4">
            Extend by 30 days — {planDetails.proPlanPriceDisplay}
          </button>
        )}
      </div>

      <div>
        <h3 className="font-display text-lg font-bold">Billing history</h3>
        {orders.length === 0 ? (
          <p className="mt-2 text-sm text-inkmuted">No billing history yet</p>
        ) : (
          <div className="mt-4 space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="flex items-start justify-between gap-4 rounded-lg border border-line p-4">
                <div className="min-w-0">
                  <div className="font-medium capitalize">{order.type === "subscription" ? "SuperCreators Pro" : (order.product_type || order.type)}</div>
                  <div className="mt-1 truncate text-sm text-inkmuted">
                    {invoiceNumber(order)} · {order.razorpay_payment_id || order.id.slice(0, 8)}
                  </div>
                  <div className="text-sm text-inkmuted">₹{((order.amount || 0) / 100).toFixed(2)}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-medium text-teal">✓ Paid</div>
                  <div className="mt-1 text-xs text-inkmuted">{fmtDate(order.created_at)}</div>
                  <button
                    onClick={() => getInvoice(order)}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-[8px] border border-line px-2.5 py-1.5 text-xs font-semibold text-inkmuted transition-colors hover:border-brand hover:text-brand">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Invoice
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUpgrade && (
        <SubscriptionModal
          onClose={() => setShowUpgrade(false)}
          onSuccess={() => { setShowUpgrade(false); load(); }}
        />
      )}
    </div>
  );
}
