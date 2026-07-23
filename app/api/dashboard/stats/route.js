"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase, apiFetch } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import CompleteProfileModal from "@/components/CompleteProfileModal";
import NotificationCenter from "@/components/NotificationCenter";
import { fetchMe } from "@/lib/plan";
import { inr } from "@/lib/courseModel";

/* ---------------- helpers ---------------- */

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }).replace(/ /g, " ");

const rangeLabel = (from, to) => `${fmtDate(from)} - ${fmtDate(to)}`;

// Subtle blueprint grid behind the page, like the reference.
const GRID_BG = {
  backgroundColor: "#F4F6FA",
  backgroundImage:
    "linear-gradient(rgba(46,110,247,0.055) 1px, transparent 1px)," +
    "linear-gradient(90deg, rgba(46,110,247,0.055) 1px, transparent 1px)",
  backgroundSize: "44px 44px, 44px 44px"
};

/* ---------------- icons ---------------- */

const IconPlus = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconGlobe = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
    <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
  </svg>
);
const IconRupee = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" {...p}>
    <path d="M7 5h10M7 9h10M14.5 9c0 3-2.5 4.5-6 4.5h-1.5L14 19" />
  </svg>
);
const IconCap = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" {...p}>
    <path d="M12 4 2 9l10 5 10-5-10-5Z" /><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5" />
  </svg>
);
const IconSpark = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2.5 13.6 9 20 10.6 13.6 12.2 12 18.7 10.4 12.2 4 10.6 10.4 9 12 2.5Z" />
  </svg>
);
const IconArrow = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/* ---------------- page ---------------- */

export default function GettingStarted() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileDone, setProfileDone] = useState(true);

  const loadPlan = useCallback(async () => setMe(await fetchMe()), []);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data: prof } = await supabase
      .from("mp_profiles").select("full_name, display_name, business_name, profile_complete")
      .eq("user_id", user.id).maybeSingle();
    setName(prof?.business_name || prof?.full_name || prof?.display_name || "");
    setProfileDone(!!prof?.profile_complete);
    loadPlan();
    apiFetch("/api/dashboard/stats", undefined, "GET").then(setStats).catch(() => {});
  }, [user, loadPlan]);

  useEffect(() => { refresh(); }, [refresh]);

  // Razorpay hands back through a popup, so re-check the plan on focus.
  useEffect(() => {
    if (!user) return;
    const onFocus = () => loadPlan();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, loadPlan]);

  const isPro = !!me?.isPro;

  return (
    <main className="min-h-screen" style={GRID_BG}>
      {/* notifications float top-right, outside the centred column */}
      <div className="flex justify-end px-6 pt-4">
        <div className="rounded-full bg-white p-0.5 shadow-sm">
          <span className="[&_button]:!text-ink [&_button:hover]:!bg-paper">
            <NotificationCenter />
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-[740px] px-4 pb-16 pt-2">

        {/* ---------- plan pill ---------- */}
        <div className="flex justify-center">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-line bg-white py-1.5 pl-1.5 pr-5 shadow-sm">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold ${isPro ? "bg-brand/10 text-brand" : "bg-[#D6F5E3] text-[#0E7B57]"}`}>
              <IconSpark className="h-3.5 w-3.5" />
              {me === null ? "Checking your plan…" : isPro ? "You're on Pro Plan" : "You're on Free Plan"}
            </span>
            <span className="text-sm text-inkmuted">
              {isPro
                ? <>All features unlocked{me?.planExpiresAt ? ` until ${fmtDate(me.planExpiresAt)}` : ""}. <Link href="/dashboard/settings/billing" className="font-semibold text-brand underline">Manage plan</Link></>
                : <>Unlock unlimited access to all features and get paid. <Link href="/dashboard/settings/billing" className="font-semibold text-brand underline">Upgrade now</Link></>}
            </span>
          </div>
        </div>

        {/* ---------- greeting ---------- */}
        <h1 className="mt-7 text-center font-display text-[26px] font-bold leading-tight sm:text-[28px]">
          Hello, {name || "there"}!
        </h1>

        {/* ---------- quick actions ---------- */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <QuickAction href="/dashboard/courses" label="Create a product" tint="#F1F3F7" fg="#3D4453"><IconPlus className="h-5 w-5" /></QuickAction>
          <QuickAction href="/dashboard/store" label="Edit your store" tint="#EAF1FE" fg="#2E6EF7"><IconGlobe className="h-5 w-5" /></QuickAction>
          <QuickAction href="/dashboard/refer" label="Refer and Earn" tint="#FFF1E6" fg="#E07B39"><IconRupee className="h-5 w-5" /></QuickAction>
        </div>

        {/* ---------- learn banner ---------- */}
        <Link href="/dashboard/learn"
          className="group mt-4 flex items-center justify-between gap-4 overflow-hidden rounded-2xl px-6 py-5 text-white shadow-sm"
          style={{
            backgroundColor: "#241503",
            backgroundImage:
              "linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)," +
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)," +
              "linear-gradient(100deg, #1A1108 0%, #4A2F12 48%, #8A5A1F 82%, #C08A3E 100%)",
            backgroundSize: "34px 34px, 34px 34px, auto"
          }}>
          <span className="text-[15px] font-semibold">Learn how to grow and sell with SuperCreators</span>
          <span className="flex shrink-0 items-center gap-2 text-sm font-semibold">
            <IconCap className="h-[18px] w-[18px]" /> Go to Learn
          </span>
        </Link>

        {/* ---------- weekly stats ---------- */}
        <section className="mt-4 rounded-2xl border border-line bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold">Here&rsquo;s how you are doing this week</h2>
            <span className="text-sm text-inkmuted">
              {stats ? rangeLabel(stats.range.from, stats.range.to) : "—"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Store visits" value={stats?.visits.value ?? null} change={stats?.visits.change} />
            <Stat label="Sales" value={stats?.sales.value ?? null} change={stats?.sales.change} />
            <Stat label="Total revenue" value={stats ? inr(stats.revenue.value) : null} change={stats?.revenue.change} />
          </div>

          <div className="mt-3 rounded-xl bg-[#F4F5F7] px-4 py-3 text-center text-sm text-inkmuted">
            💡 {tip(stats)}
          </div>
        </section>

        {/* ---------- action needed ---------- */}
        {!profileDone && (
          <Alert
            title="Complete your profile to start selling"
            body="Add your name, business name and email so buyers know who they're paying."
            cta="Complete profile"
            onClick={() => setShowProfile(true)}
          />
        )}
        {profileDone && stats?.unpublished > 0 && (
          <Alert
            title={`Uh oh…you have ${stats.unpublished} unpublished product${stats.unpublished === 1 ? "" : "s"}!`}
            body="Publish them to make them live on your store and start earning."
            cta="Start Earning"
            href="/dashboard/courses"
          />
        )}

        {/* ---------- top creators ---------- */}
        <TopCreators />
      </div>

      {showProfile && (
        <CompleteProfileModal onClose={() => setShowProfile(false)} onSaved={() => { setShowProfile(false); refresh(); }} />
      )}
    </main>
  );
}

/* ---------------- pieces ---------------- */

function QuickAction({ href, label, children, tint, fg }) {
  return (
    <Link href={href}
      className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-4 shadow-sm transition-shadow hover:shadow-md">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: tint, color: fg }}>
        {children}
      </span>
      <span className="text-[15px] font-bold">{label}</span>
    </Link>
  );
}

function Stat({ label, value, change }) {
  const loading = value === null || value === undefined;
  const up = (change ?? 0) >= 0;
  return (
    <div className="rounded-xl border border-line px-4 py-3.5 text-center">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-inkmuted">{label}</div>
      <div className="mt-1 font-display text-[28px] font-bold leading-none">
        {loading ? <span className="text-inkmuted">—</span> : value}
      </div>
      <div className="mt-2 text-xs text-inkmuted">
        {loading ? "\u00A0" : (
          <>
            <span className={up ? "text-teal" : "text-danger"}>{up ? "↑" : "↓"} {Math.abs(change)}%</span>{" "}
            Compared to last week
          </>
        )}
      </div>
    </div>
  );
}

function Alert({ title, body, cta, href, onClick }) {
  const btn = "shrink-0 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white hover:opacity-90";
  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-[#F6E7B8] bg-[#FEF9E7] p-5">
      <span className="text-2xl">⚠️</span>
      <div className="min-w-0 flex-1">
        <div className="font-display text-[15px] font-bold">{title}</div>
        <p className="mt-0.5 text-sm text-inkmuted">{body}</p>
      </div>
      {href ? <Link href={href} className={btn}>{cta}</Link> : <button onClick={onClick} className={btn}>{cta}</button>}
    </div>
  );
}

/** Only lists things this app actually ships. */
const CREATOR_CARDS = [
  { title: "Sell Digital Products", desc: "Sell videos, photos, documents and more in seconds.", href: "/dashboard/books" },
  { title: "Offer 1:1 sessions", desc: "Launch personal coaching in a fraction of minutes.", href: "/dashboard/bookings", highlight: true },
  { title: "Launch a course", desc: "Create full-length courses with lots of customisation.", href: "/dashboard/courses" },
  { title: "Host an event", desc: "Sell tickets to workshops and webinars.", href: "/dashboard/events" },
  { title: "Lock premium content", desc: "Put your best work behind a paywall.", href: "/dashboard/locked" },
  { title: "Take any payment", desc: "Share a link and get paid for anything.", href: "/dashboard/pages" }
];

function TopCreators() {
  const [i, setI] = useState(0);
  const perView = 3;
  const max = Math.max(0, CREATOR_CARDS.length - perView);

  return (
    <section className="mt-4 rounded-2xl border border-line bg-white p-5 shadow-sm">
      <h2 className="font-display text-lg font-bold">Here&rsquo;s how Top Creators are using SuperCreatos</h2>

      <div className="relative mt-4">
        <div className="overflow-hidden">
          <div className="flex gap-3 transition-transform duration-300"
            style={{ transform: `translateX(calc(-${i} * (33.333% + 0.5rem)))` }}>
            {CREATOR_CARDS.map((c) => (
              <Link key={c.title} href={c.href}
                className={`w-[calc(33.333%-0.5rem)] shrink-0 rounded-xl border p-4 transition-colors ${c.highlight ? "border-[#B6E7C9] bg-[#F6FCF8]" : "border-line hover:border-brand/40"}`}>
                <div className="font-display text-[15px] font-bold leading-snug">{c.title}</div>
                <p className="mt-1.5 text-sm leading-snug text-inkmuted">{c.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {i > 0 && (
          <button onClick={() => setI((v) => Math.max(0, v - 1))} aria-label="Previous"
            className="absolute -left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-inkmuted shadow-md hover:text-ink">
            <IconArrow className="h-4 w-4 rotate-180" />
          </button>
        )}
        {i < max && (
          <button onClick={() => setI((v) => Math.min(max, v + 1))} aria-label="Next"
            className="absolute -right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-inkmuted shadow-md hover:text-ink">
            <IconArrow className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
}

/** Real, useful line — no invented "46,601 creators" style stat. */
function tip(stats) {
  if (!stats) return "Loading your week…";
  if (stats.totalProducts === 0) return "Create your first product — it takes about 2 minutes.";
  if (stats.visits.value === 0) return "Share your store link on Instagram to get your first visitors.";
  if (stats.sales.value === 0) return "You're getting visitors but no sales yet — try adding a launch coupon.";
  return `${stats.sales.value} sale${stats.sales.value === 1 ? "" : "s"} this week — keep the momentum going.`;
}