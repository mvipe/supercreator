"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase, apiFetch } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import CompleteProfileModal from "@/components/CompleteProfileModal";
import CreateProductModal from "@/components/CreateProductModal";
import NotificationCenter from "@/components/NotificationCenter";
import { fetchMe } from "@/lib/plan";
import { inr } from "@/lib/courseModel";
import { BRAND } from "@/lib/brand";

/* ---------------- helpers ---------------- */

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }).replace(/ /g, " ");

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@supercreators.in";

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
  const [showCreate, setShowCreate] = useState(false);

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
          <div className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-center shadow-sm sm:w-auto sm:rounded-full sm:py-1.5 sm:pl-1.5 sm:pr-5 sm:text-left">
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
          <QuickAction onClick={() => setShowCreate(true)} label="Create your store" tint="#F1F3F7" fg="#3D4453"><IconPlus className="h-5 w-5" /></QuickAction>
          <QuickAction href="/dashboard/store" label="Edit your profile" tint="#EAF1FE" fg="#2E6EF7"><IconGlobe className="h-5 w-5" /></QuickAction>
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
          <span className="text-[15px] font-semibold">Learn how to grow and sell with {BRAND.name}</span>
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

        <BugReport />
      </div>

      {showProfile && (
        <CompleteProfileModal onClose={() => setShowProfile(false)} onSaved={() => { setShowProfile(false); refresh(); }} />
      )}

      <CreateProductModal open={showCreate} onClose={() => setShowCreate(false)} />
    </main>
  );
}

/* ---------------- pieces ---------------- */

function QuickAction({ href, onClick, label, children, tint, fg }) {
  const inner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: tint, color: fg }}>
        {children}
      </span>
      <span className="text-[15px] font-bold">{label}</span>
    </>
  );
  const cls = "flex w-full items-center gap-3 rounded-2xl border border-line bg-white px-4 py-4 text-left shadow-sm transition-shadow hover:shadow-md";
  return onClick
    ? <button onClick={onClick} className={cls}>{inner}</button>
    : <Link href={href} className={cls}>{inner}</Link>;
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
  // Phones: text block first, full-width button under it. sm+: one row.
  const btn = "w-full shrink-0 rounded-full bg-ink px-5 py-2.5 text-center text-sm font-bold text-white hover:opacity-90 sm:w-auto";
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#F6E7B8] bg-[#FEF9E7] p-4 sm:flex-row sm:items-center sm:gap-4 sm:rounded-2xl sm:p-5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="text-2xl leading-none">⚠️</span>
        <div className="min-w-0">
          <div className="font-display text-[15px] font-bold">{title}</div>
          <p className="mt-0.5 text-sm text-inkmuted">{body}</p>
        </div>
      </div>
      {href ? <Link href={href} className={btn}>{cta}</Link> : <button onClick={onClick} className={btn}>{cta}</button>}
    </div>
  );
}

/**
 * Only lists things this app actually ships. `bullets` power the detail panel
 * below the carousel, so every card explains itself before you commit.
 */
const CREATOR_CARDS = [
  {
    id: "books",
    title: "Sell Digital Products",
    desc: "Sell videos, photos, documents and more in seconds.",
    href: "/dashboard/books",
    bullets: [
      ["Upload once, sell forever", "PDFs, guides, presets and templates delivered instantly after payment."],
      ["No storage headaches", "Files are hosted for you and only unlocked for people who paid."],
      ["Set any price", "Charge a fixed price, offer a discount, or let buyers pay what they want."]
    ]
  },
  {
    id: "bookings",
    title: "Offer 1:1 sessions",
    desc: "Launch personal coaching in a fraction of minutes.",
    href: "/dashboard/bookings",
    highlight: true,
    bullets: [
      ["Create custom schedules", "Add multiple schedules for sessions — one for weekdays and one for weekends."],
      ["Set your own slots", "Pick durations and buffers so bookings never land back-to-back."],
      ["Personalise it your way", "Customise the booking page in the style and colours of your choice."]
    ]
  },
  {
    id: "courses",
    title: "Launch a course",
    desc: "Create full-length courses with lots of customisation.",
    href: "/dashboard/courses",
    bullets: [
      ["Modules, lessons and quizzes", "Structure a full curriculum with video, notes, quizzes and assignments."],
      ["Protected content", "Videos stream from private storage with the learner's number watermarked on top."],
      ["Free previews that convert", "Open up a lesson or two so buyers can try before they pay."]
    ]
  },
  {
    id: "events",
    title: "Host an event",
    desc: "Sell tickets to workshops and webinars.",
    href: "/dashboard/events",
    bullets: [
      ["Ticketed workshops", "Set capacity, collect details and take payment in one flow."],
      ["Live classes inside courses", "Schedule sessions your learners can join from their sidebar."],
      ["Automatic confirmations", "Buyers get their access details the moment they pay."]
    ]
  },
  {
    id: "locked",
    title: "Lock premium content",
    desc: "Put your best work behind a paywall.",
    href: "/dashboard/locked",
    bullets: [
      ["One link, one paywall", "Share anywhere; only paying members get through."],
      ["Any format", "Long writing, links, downloads or a private video."],
      ["Time-limited access", "Give lifetime access, or expire it after a set period."]
    ]
  },
  {
    id: "pages",
    title: "Take any payment",
    desc: "Share a link and get paid for anything.",
    href: "/dashboard/pages",
    bullets: [
      ["Custom payment pages", "Ask for exactly the details you need at checkout."],
      ["Flexible pricing", "Fixed, free, or pay-what-you-want."],
      ["Works everywhere", "Drop the link in a bio, a DM, or an invoice."]
    ]
  }
];

function TopCreators() {
  const [i, setI] = useState(0);
  const [sel, setSel] = useState(1); // "Offer 1:1 sessions" opens by default
  const [shown, setShown] = useState(3); // mobile list: 3 at a time
  const perView = 3;
  const max = Math.max(0, CREATOR_CARDS.length - perView);
  const active = CREATOR_CARDS[sel];

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <h2 className="border-b border-line p-5 font-display text-lg font-bold">
        Here&rsquo;s how Top Creators are using {BRAND.name}
      </h2>

      {/* Phones: a simple vertical list (3-across squeezes to one word per
          line). Starts at 3 cards; "Show more" reveals the next 3 so the list
          doesn't dominate the page. sm+: the sliding carousel. */}
      <div className="space-y-2.5 p-4 sm:hidden">
        {CREATOR_CARDS.slice(0, shown).map((c, idx) => (
          <button key={c.id} onClick={() => setSel(idx)}
            className={`block w-full rounded-xl border p-4 text-left transition-colors ${
              idx === sel ? "border-[#B6E7C9] bg-[#F6FCF8]" : "border-line"
            }`}>
            <div className="font-display text-[15px] font-bold leading-snug">{c.title}</div>
            <p className="mt-1 text-sm leading-snug text-inkmuted">{c.desc}</p>
          </button>
        ))}
        {shown < CREATOR_CARDS.length && (
          <button onClick={() => setShown((n) => Math.min(n + 3, CREATOR_CARDS.length))}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-sm font-bold text-brand">
            Show more <IconArrow className="h-3.5 w-3.5 rotate-90" />
          </button>
        )}
      </div>

      {/* carousel (sm and up) */}
      <div className="relative hidden p-5 sm:block">
        <div className="overflow-hidden">
          <div className="flex gap-3 transition-transform duration-300"
            style={{ transform: `translateX(calc(-${i} * (33.333% + 0.5rem)))` }}>
            {CREATOR_CARDS.map((c, idx) => (
              <button key={c.id} onClick={() => setSel(idx)}
                className={`w-[calc(33.333%-0.5rem)] shrink-0 rounded-xl border p-4 text-left transition-colors ${
                  idx === sel ? "border-[#B6E7C9] bg-[#F6FCF8]" : "border-line hover:border-brand/40"
                }`}>
                <div className="font-display text-[15px] font-bold leading-snug">{c.title}</div>
                <p className="mt-1.5 text-sm leading-snug text-inkmuted">{c.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {i > 0 && (
          <button onClick={() => setI((v) => Math.max(0, v - 1))} aria-label="Previous"
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-inkmuted shadow-md hover:text-ink">
            <IconArrow className="h-4 w-4 rotate-180" />
          </button>
        )}
        {i < max && (
          <button onClick={() => setI((v) => Math.min(max, v + 1))} aria-label="Next"
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-inkmuted shadow-md hover:text-ink">
            <IconArrow className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* detail panel for whichever card is selected */}
      <div className="grid gap-6 border-t border-line p-5 md:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <h3 className="font-display text-2xl font-bold">{active.title}</h3>
          <ul className="mt-5 space-y-4">
            {active.bullets.map(([head, body]) => (
              <li key={head} className="flex gap-3">
                <IconSpark className="mt-1 h-3.5 w-3.5 shrink-0 text-inkmuted" />
                <div>
                  <div className="text-[15px] font-bold">{head}</div>
                  <p className="mt-0.5 text-sm leading-snug text-inkmuted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link href={active.href} className="mt-6 inline-flex rounded-full bg-ink px-6 py-3 text-sm font-bold text-white hover:opacity-90">
            Start now
          </Link>
        </div>
        <FeatureArt card={active} />
      </div>
    </section>
  );
}

/**
 * Small illustrative mock of whatever card is selected. Drawn in markup rather
 * than shipped as an image, so it always matches the live theme and costs
 * nothing to load.
 */
function FeatureArt({ card }) {
  return (
    <div className="hidden rounded-2xl bg-[#F6FCF8] p-4 md:block">
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        <div className="bg-[#16281C] px-3 py-4 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-white/25" />
          <div className="mt-2 text-[11px] font-bold text-white">Your name</div>
          <div className="mt-1 inline-block rounded-full bg-white/15 px-2 py-0.5 text-[9px] text-white/90">
            {card.id === "bookings" ? "₹699/session" : card.id === "courses" ? "Course" : "₹149"}
          </div>
        </div>

        {card.id === "bookings" ? (
          <div className="p-2">
            <div className="flex gap-1">
              {["SUN", "MON", "TUE", "WED"].map((d, n) => (
                <div key={d} className={`flex-1 rounded border p-1 text-center ${n === 0 ? "border-[#B6E7C9] bg-[#F6FCF8]" : "border-line"}`}>
                  <div className="text-[7px] text-inkmuted">{d}</div>
                  <div className="text-[9px] font-bold">{24 + n} Mar</div>
                  <div className="text-[6px] text-teal">{12 - n} slots</div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[8px] font-semibold text-inkmuted">Available time slots</div>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {["02:00", "02:30", "03:00", "03:30", "04:00", "04:30"].map((t, n) => (
                <div key={t} className={`rounded border py-1 text-center text-[8px] ${n === 0 ? "border-[#B6E7C9] bg-[#F6FCF8] font-bold" : "border-line text-inkmuted"}`}>
                  {t} PM
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 p-2">
            {[0, 1, 2].map((n) => (
              <div key={n} className="flex items-center gap-2 rounded border border-line p-1.5">
                <div className="h-6 w-9 shrink-0 rounded bg-paper" />
                <div className="min-w-0 flex-1">
                  <div className="h-1.5 w-3/4 rounded bg-paper" />
                  <div className="mt-1 h-1.5 w-1/2 rounded bg-paper" />
                </div>
                <span className="shrink-0 text-[9px] text-inkmuted">→</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Feedback goes straight to the creator's own channel. */
function BugReport() {
  return (
    // Phones: icon+text block on top, full-width Report button under it
    // (same pattern as the yellow Alert). sm+: one row.
    <section className="mt-4 flex flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4 sm:rounded-2xl sm:p-5">
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-2xl sm:h-14 sm:w-20 sm:text-3xl">❓</span>
        <div className="min-w-0">
          <div className="font-display text-[15px] font-bold">Bug Report or Feature Request</div>
          <p className="mt-0.5 text-sm text-inkmuted">
            Let us know what can make your {BRAND.name} experience even better.
          </p>
        </div>
      </div>
      <a
        href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${BRAND.name} — bug report / feature request`)}`}
        className="w-full shrink-0 rounded-full border border-line px-6 py-2.5 text-center text-sm font-bold hover:border-ink sm:w-auto"
      >
        Report
      </a>
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