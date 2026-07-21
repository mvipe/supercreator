"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { inr } from "@/lib/courseModel";
import { useAuth } from "@/components/AuthProvider";
import CheckoutModal from "@/components/CheckoutModal";
import VisitTracker from "@/components/VisitTracker";
import { TYPE_META } from "@/lib/products";

export default function PublicProductPage({ type, View }) {
  const { slug } = useParams();
  const r = useRouter();
  const path = usePathname();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [state, setState] = useState("loading");
  const [checkout, setCheckout] = useState(false);
  const [owned, setOwned] = useState(false);
  const [justPaid, setJustPaid] = useState(false);

  useEffect(() => {
    supabase.from("mp_products").select("*").eq("slug", slug).eq("type", type).eq("status", "published").maybeSingle()
      .then(({ data }) => {
        if (!data) { setState("missing"); return; }
        setProduct(data); setState("ready");
        supabase.rpc("mp_increment_views", { p_table: "product", p_id: data.id }).then(() => {});
      });
  }, [slug, type]);

  useEffect(() => {
    if (!user || !product || type === "payment") return;
    supabase.from("mp_purchases").select("id").eq("product_type", type).eq("product_id", product.id).eq("buyer_id", user.id).maybeSingle()
      .then(({ data }) => setOwned(!!data));
  }, [user, product, type]);

  if (state === "loading") return <div className="flex min-h-screen items-center justify-center text-inkmuted">Loading…</div>;
  if (state === "missing") return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="font-display text-2xl font-bold">This page isn't live</h1>
      <p className="text-sm text-inkmuted">The link may be wrong, or it hasn't been published yet.</p>
    </div>
  );

  const d = product.data || {};

  function onBuy() {
    if (!user) { r.push(`/login?next=${path}`); return; }
    if (owned && type !== "payment") return;
    setCheckout(true);
  }

  const priceInfo =
    type === "event" ? { isFree: d.priceMode === "free", label: inr(d.price) } :
    type === "locked" ? { label: inr(d.price) } :
    type === "book" ? { isPwyw: d.priceMode === "pwyw", min: d.minPrice, label: inr(d.price) } :
    { isPwyw: d.priceMode === "pwyw", min: d.minPrice, label: inr(d.price) };

  const unlocked = type === "locked" && owned;
  const showEventAccess = type === "event" && owned;

  return (
    <>
      <VisitTracker ownerId={product.owner_id} path={`${TYPE_META[type].publicPath}/${product.slug}`}
        source={type} buyerPhone={user?.user_metadata?.phone} />
      {(owned || justPaid) && type !== "payment" && type !== "book" && (
        <div className="sticky top-0 z-40 bg-teal px-4 py-2 text-center text-sm font-semibold text-white">
          {type === "event"
            ? <>You're registered! {d.mode === "online" && d.joinLink ? <a href={d.joinLink} target="_blank" className="underline">Join link →</a> : d.mode === "offline" ? `Venue: ${d.venue}` : "Details below."}</>
            : "Unlocked — this content is yours."}
        </div>
      )}
      {(owned || justPaid) && type === "book" && (
        <div className="sticky top-0 z-40 bg-teal px-4 py-2 text-center text-sm font-semibold text-white">Purchased — download your book below.</div>
      )}
      {justPaid && type === "payment" && (
        <div className="sticky top-0 z-40 bg-teal px-4 py-2 text-center text-sm font-semibold text-white">Payment received. Thank you!</div>
      )}
      <View product={product} mode="live" onBuy={onBuy} unlocked={unlocked} owned={owned} registered={showEventAccess} />
      {checkout && user && (
        <CheckoutModal productType={type} productId={product.id} title={product.title} accent={d.accent}
          price={priceInfo} user={user}
          onClose={() => setCheckout(false)}
          onSuccess={() => { setCheckout(false); setOwned(true); setJustPaid(true); window.scrollTo(0, 0); }} />
      )}
    </>
  );
}
