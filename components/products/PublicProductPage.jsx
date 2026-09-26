"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { inr } from "@/lib/courseModel";
import { useAuth } from "@/components/AuthProvider";
import CheckoutModal from "@/components/CheckoutModal";
import VisitTracker from "@/components/VisitTracker";
import { TYPE_META, productPrice } from "@/lib/products";

// A browser-local record that "this device already paid for this product".
// It's what stops a mobile buyer being asked to pay again after a refresh
// while the Razorpay redirect is still settling, and it makes the download
// appear immediately on mobile (where the in-page owned re-check can lag).
const paidKey = (type, id) => `sc_paid:${type}:${id}`;
function readPaid(type, id) {
  try { return localStorage.getItem(paidKey(type, id)) === "1"; } catch { return false; }
}
function writePaid(type, id) {
  try { localStorage.setItem(paidKey(type, id), "1"); } catch { /* private mode — non-fatal */ }
}

export default function PublicProductPage({ type, View }) {
  const { slug } = useParams();
  const r = useRouter();
  const path = usePathname();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [creator, setCreator] = useState(null);
  const [state, setState] = useState("loading");
  const [checkout, setCheckout] = useState(false);
  const [owned, setOwned] = useState(false);
  const [justPaid, setJustPaid] = useState(false);

  useEffect(() => {
    supabase.from("mp_products").select("*").eq("slug", slug).eq("type", type).eq("status", "published").maybeSingle()
      .then(async ({ data }) => {
        if (!data) { setState("missing"); return; }
        setProduct(data); setState("ready");
        supabase.rpc("mp_increment_views", { p_table: "product", p_id: data.id }).then(() => {});

        // Restore a purchase this device already made, so a refresh keeps the
        // download visible and never re-charges (the mobile bug).
        if (readPaid(type, data.id)) {
          if (type !== "payment") setOwned(true);
          setJustPaid(true);
        }

        // Whose page is this? Drives the clickable creator chip in the header.
        const { data: prof } = await supabase.from("mp_profiles")
          .select("display_name, full_name, business_name, avatar_url, username")
          .eq("user_id", data.owner_id).maybeSingle();
        if (prof) {
          setCreator({
            name: prof.business_name || prof.display_name || prof.full_name || (prof.username ? `@${prof.username}` : ""),
            avatar: prof.avatar_url,
            username: prof.username
          });
        }
      });
  }, [slug, type]);

  useEffect(() => {
    if (!user || !product || type === "payment") return;
    supabase.from("mp_purchases").select("id").eq("product_type", type).eq("product_id", product.id).eq("buyer_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setOwned(true); });
  }, [user, product, type]);

  if (state === "loading") return <div className="flex min-h-screen items-center justify-center text-inkmuted">Loading…</div>;
  if (state === "missing") return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="font-display text-2xl font-bold">This page isn't live</h1>
      <p className="text-sm text-inkmuted">The link may be wrong, or it hasn't been published yet.</p>
    </div>
  );

  const d = product.data || {};

  // Event & locked still use the modal; book & payment render the form inline.
  function onBuy() {
    if (owned && type !== "payment") return;
    setCheckout(true);
  }

  // Called by the inline checkout (book/payment) on a successful payment.
  function onPaid() {
    writePaid(type, product.id);
    if (type !== "payment") setOwned(true);
    setJustPaid(true);
    window.scrollTo(0, 0);
  }

  const eff = productPrice(type, d);
  const priceInfo =
    type === "event" ? { isFree: d.priceMode === "free", label: inr(eff) } :
    type === "locked" ? { label: inr(eff) } :
    { isPwyw: d.priceMode === "pwyw", min: d.minPrice, label: inr(eff) };

  const unlocked = type === "locked" && owned;
  const showEventAccess = type === "event" && owned;
  const paid = justPaid || owned; // payment pages: show delivered files once paid

  return (
    <>
      <VisitTracker ownerId={product.owner_id} path={`${TYPE_META[type].publicPath}/${product.slug}`}
        source={type} buyerPhone={user?.user_metadata?.phone} />
      {(owned || justPaid) && type !== "payment" && type !== "book" && (
        <div className="sticky top-0 z-40 bg-teal px-4 py-2 text-center text-sm font-semibold text-white">
          {type === "event"
            ? <>You're registered! {d.mode === "online" && d.joinLink ? <a href={d.joinLink} target="_blank" className="underline">Join link &rarr;</a> : d.mode === "offline" ? `Venue: ${d.venue}` : "Details below."}</>
            : "Unlocked &mdash; this content is yours."}
        </div>
      )}
      {(owned || justPaid) && type === "book" && (
        <div className="sticky top-0 z-40 bg-teal px-4 py-2 text-center text-sm font-semibold text-white">Purchased &mdash; download your book below.</div>
      )}
      {justPaid && type === "payment" && (
        <div className="sticky top-0 z-40 bg-teal px-4 py-2 text-center text-sm font-semibold text-white">
          {d.successMessage || "Payment received. Thank you!"}
        </div>
      )}
      {/* Book & payment: the form is inline (user + onPaid). Event & locked keep
          the modal, opened by onBuy. */}
      <View product={product} mode="live" onBuy={onBuy} unlocked={unlocked} owned={owned}
        registered={showEventAccess} creator={creator}
        user={user} onPaid={onPaid} paid={paid} />
      {checkout && (
        <CheckoutModal productType={type} productId={product.id} title={product.title} accent={d.accent}
          price={priceInfo} user={user} allowCoupon={!priceInfo.isFree}
          onClose={() => setCheckout(false)}
          onSuccess={() => { setCheckout(false); writePaid(type, product.id); setOwned(true); setJustPaid(true); window.scrollTo(0, 0); }} />
      )}
    </>
  );
}
