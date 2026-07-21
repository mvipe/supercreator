"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";
import { supabase } from "@/lib/supabase";
import { fromRow } from "@/lib/courseModel";
import { useAuth } from "@/components/AuthProvider";
import CoursePublicView from "@/components/CoursePublicView";
import CheckoutModal from "@/components/CheckoutModal";
import VisitTracker from "@/components/VisitTracker";
import LessonPreview from "@/components/learn/LessonPreview";

export default function PublicCoursePage() {
  const { slug } = useParams();
  const r = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | missing
  const [checkout, setCheckout] = useState(false);
  const [preview, setPreview] = useState(null); // free-preview lesson
  const [owned, setOwned] = useState(false);
  const [creator, setCreator] = useState(null);

  useEffect(() => {
    supabase.from("mp_courses").select("*").eq("slug", slug).eq("status", "published").maybeSingle()
      .then(async ({ data }) => {
        if (!data) { setState("missing"); return; }
        setCourse(fromRow(data));
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
      });
  }, [slug]);

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

  function onBuy() {
    if (owned) { r.push(`/learn/${slug}`); return; }
    if (!user) { r.push(`/login?next=/c/${slug}`); return; }
    setCheckout(true);
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

      <CoursePublicView course={course} creator={creator} mode="live" onBuy={onBuy} onPreviewLesson={setPreview} />

      {checkout && user && (
        <CheckoutModal
          productType="course" productId={course.id} title={course.title}
          accent={st.accent} questions={st.checkoutQuestions} allowCoupon
          price={{
            isFree: course.pricing?.mode === "free",
            isPwyw: course.pricing?.mode === "pwyw",
            min: course.pricing?.minPrice,
            label: "₹" + Number(course.pricing?.discountEnabled && course.pricing?.discountPrice > 0 ? course.pricing.discountPrice : course.pricing?.price || 0).toLocaleString("en-IN")
          }}
          user={user} onClose={() => setCheckout(false)}
          onSuccess={() => r.push(`/learn/${slug}?welcome=1`)} />
      )}

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