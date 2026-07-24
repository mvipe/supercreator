"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";
import { supabase, apiFetch } from "@/lib/supabase";
import { fromRow } from "@/lib/courseModel";
import { productPrice } from "@/lib/products";
import { useAuth } from "@/components/AuthProvider";
import CoursePublicView from "@/components/CoursePublicView";
import VisitTracker from "@/components/VisitTracker";
import LessonPreview from "@/components/learn/LessonPreview";

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

export default function PublicCoursePage() {
  const { slug } = useParams();
  const r = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | missing
  const [preview, setPreview] = useState(null); // free-preview lesson
  const [owned, setOwned] = useState(false);
  const [creator, setCreator] = useState(null);
  const [addon, setAddon] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("mp_courses").select("*").eq("slug", slug).eq("status", "published").maybeSingle()
      .then(async ({ data }) => {
        if (!data) { setState("missing"); return; }
        const c = fromRow(data);
        setCourse(c);
        setState("ready");
        supabase.rpc("mp_increment_views", { p_table: "course", p_id: data.id }).then(() => {});

        // Whose page is this? Shown as the chip in the header.
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

        // Resolve the optional checkout add-on (one of the creator's own products).
        const a = c.settings?.addon;
        if (a?.id) resolveAddon(a, data.owner_id).then(setAddon);
      });
  }, [slug]);

  async function resolveAddon(a, ownerId) {
    if (a.type === "course") {
      const { data } = await supabase.from("mp_courses").select("id,title,cover_images,pricing")
        .eq("id", a.id).eq("owner_id", ownerId).eq("status", "published").maybeSingle();
      if (!data) return null;
      const pr = data.pricing || {};
      const price = pr.mode === "free" ? 0
        : (pr.discountEnabled && Number(pr.discountPrice) > 0 ? Number(pr.discountPrice) : Number(pr.price) || 0);
      const mrp = pr.discountEnabled && Number(pr.discountPrice) > 0 && Number(pr.price) > price ? Number(pr.price) : 0;
      return { type: "course", id: data.id, title: data.title, price, mrp, img: data.cover_images?.[0] || null };
    }
    const { data } = await supabase.from("mp_products").select("id,type,title,data")
      .eq("id", a.id).eq("owner_id", ownerId).eq("status", "published").maybeSingle();
    if (!data) return null;
    const d = data.data || {};
    const price = productPrice(data.type, d);
    const mrp = Number(d.price) > price ? Number(d.price) : 0;
    return { type: data.type, id: data.id, title: data.title, price, mrp, img: d.coverImages?.[0] || null, subtitle: d.subtitle || "" };
  }

  useEffect(() => {
    if (!user || !course) return;
    supabase.from("mp_purchases").select("id").eq("product_type", "course").eq("product_id", course.id).eq("buyer_id", user.id).maybeSingle()
      .then(({ data }) => setOwned(!!data));
  }, [user, course]);

  if (state === "loading") return <div className="flex min-h-screen items-center justify-center text-inkmuted">Loading…</div>;
  if (state === "missing") return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="font-display text-2xl font-bold">This course isn't live</h1>
      <p className="text-sm text-inkmuted">The link may be wrong, or the creator hasn't published it yet.</p>
    </div>
  );

  const st = course.settings || {};

  /** Sign a guest in on-screen with the magic-link token from the server. */
  async function signInGuest(tokenHash) {
    if (!tokenHash) return;
    try { await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" }); } catch { /* land on login-gated learn page as fallback */ }
  }

  // Inline checkout. `form` is null when the buyer already owns the course
  // (the button just continues to the content).
  async function onBuy(form) {
    if (owned || !form) { r.push(`/learn/${slug}`); return; }
    setError(""); setBusy(true);
    try {
      const isPwyw = course.pricing?.mode === "pwyw";
      const payload = {
        productId: course.id,
        email: form.email, phone: form.phone, state: form.state, gstin: form.gstin,
        addon: !!form.addon,
        pwywAmount: isPwyw ? Number(form.pwyw) : null
      };
      const res = await apiFetch("/api/checkout/guest-order", payload);

      if (res.free) {
        await signInGuest(res.tokenHash);
        r.push(`/learn/${slug}?welcome=1`);
        return;
      }

      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load Razorpay. Check your connection.");
      const rzp = new window.Razorpay({
        key: res.keyId, order_id: res.orderId, amount: res.amount, currency: "INR",
        name: course.title, description: "SuperCreators checkout",
        prefill: { email: form.email, contact: form.phone },
        theme: { color: st.accent || "#2E6EF7" },
        handler: async (resp) => {
          try {
            const v = await apiFetch("/api/checkout/guest-verify", resp);
            await signInGuest(v.tokenHash);
            r.push(`/learn/${slug}?welcome=1`);
          } catch (ex) { setError(ex.message); setBusy(false); }
        },
        modal: { ondismiss: () => setBusy(false) }
      });
      rzp.on("payment.failed", (rr) => { setError(rr.error?.description || "Payment failed. Please try again."); setBusy(false); });
      rzp.open();
    } catch (ex) { setError(ex.message); setBusy(false); }
  }

  return (
    <>
      <VisitTracker ownerId={course.ownerId || course.owner_id} path={`/c/${slug}`} source="course" buyerPhone={user?.user_metadata?.phone} />
      {/* Tracking */}
      {st.gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${st.gaId}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${st.gaId}');`}</Script>
        </>
      )}
      {st.metaPixelId && (
        <Script id="fbp" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${st.metaPixelId}');fbq('track','PageView');`}</Script>
      )}

      {owned && (
        <div className="sticky top-0 z-40 flex items-center justify-center gap-3 bg-teal px-4 py-2 text-sm font-semibold text-white">
          You own this course · <button onClick={() => r.push(`/learn/${slug}`)} className="underline">Continue learning →</button>
        </div>
      )}

      <CoursePublicView
        course={course} creator={creator} mode="live"
        user={user} addon={addon} owned={owned} busy={busy} error={error}
        onBuy={onBuy} onPreviewLesson={setPreview} />

      {preview && (
        <LessonPreview
          lesson={preview}
          courseId={course.id}
          accent={course.settings?.accent || "#2E6EF7"}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
