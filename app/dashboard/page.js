"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { supabase, apiFetch } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import CompleteProfileModal from "@/components/CompleteProfileModal";
import NotificationCenter from "@/components/NotificationCenter";
import { fetchMe } from "@/lib/plan";
import { inr } from "@/lib/courseModel";
import { BRAND } from "@/lib/brand";

/* ---------------- helpers ---------------- */

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@supercreators.in";

const RANGE_OPTIONS = [
  { id: "7d", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "all", label: "All Time" }
];

function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ---------------- icons ---------------- */

const IconStore = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 8.5 5.5 4h13L20 8.5" /><path d="M4 8.5v10.5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8.5" />
    <path d="M4 8.5h16M9 20v-6h6v6" />
  </svg>
);
const IconProfile = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
  </svg>
);
const IconGift = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="4" y="9" width="16" height="11" rx="1.5" /><path d="M4 13h16M12 9v11" />
    <path d="M12 9C9 9 7.5 7.8 7.5 6.2 7.5 5 8.4 4 9.6 4 11.4 4 12 6.5 12 9Z" />
    <path d="M12 9c3 0 4.5-1.2 4.5-2.8C16.5 5 15.6 4 14.4 4 12.6 4 12 6.5 12 9Z" />
  </svg>
);
const IconCalendar = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" />
  </svg>
);
const IconChevron = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m7 10 5 5 5-5" /></svg>
);
const IconArrow = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
const IconTrend = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="m4 17 6-6 4 4 6-8" /><path d="M15 7h5v5" />
  </svg>
);
const IconBag = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M5 8h14l1 12H4L5 8Z" /><path d="M8 8V6a4 4 0 0 1 8 0v2" />
  </svg>
);
const IconDiamond = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m12 3 7 5-7 13L5 8l7-5Zm-7 5h14M9 5l3 3 3-3" /></svg>
);
const IconSpark = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2.5 13.6 9 20 10.6 13.6 12.2 12 18.7 10.4 12.2 4 10.6 10.4 9 12 2.5Z" /></svg>
);
const IconPlay = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
);
const IconCap = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" {...p}>
    <path d="m12 4 9 5-9 5-9-5 9-5Z" /><path d="M7 11.5V16c0 1.4 2.5 2.5 5 2.5s5-1.1 5-2.5v-4.5" />
  </svg>
);
const IconCoin = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v9M9.5 9.8c0-1.3 1.1-2.1 2.5-2.1s2.5.8 2.5 1.9c0 2.6-5 1.3-5 3.9 0 1.1 1.1 1.9 2.5 1.9s2.5-.8 2.5-2.1" />
  </svg>
);
const IconBriefcase = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="7.5" width="18" height="12" rx="2" /><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5M3 12.5h18" />
  </svg>
);
const IconDollar = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 3v18M16 7.5c0-1.4-1.6-2.5-4-2.5s-4 1.1-4 2.7c0 3.6 8 1.8 8 5.4 0 1.6-1.8 2.7-4 2.7s-4-1.1-4-2.5" />
  </svg>
);

/* ---------------- page ---------------- */

export default function GettingStarted() {
  const { user, ownerId } = useAuth();
  const [name, setName] = useState("");
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [range, setRange] = useState("7d");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileDone, setProfileDone] = useState(true);
  const [bannerOpen, setBannerOpen] = useState(true);
  const rangeRef = useRef(null);

  const loadPlan = useCallback(async () => setMe(await fetchMe()), []);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data: prof } = await supabase
      .from("mp_profiles").select("full_name, display_name, business_name, profile_complete")
      .eq("user_id", ownerId).maybeSingle();
    setName(prof?.business_name || prof?.full_name || prof?.display_name || "");
    setProfileDone(!!prof?.profile_complete);
    loadPlan();
  }, [user, ownerId, loadPlan]);

  useEffect(() => { refresh(); }, [refresh]);

  // Stats are refetched whenever the range filter changes.
  useEffect(() => {
    if (!user) return;
    setStats(null);
    apiFetch(`/api/dashboard/stats?range=${range}`, undefined, "GET").then(setStats).catch(() => {});
  }, [user, range]);

  // Close the range dropdown on an outside click.
  useEffect(() => {
    if (!rangeOpen) return;
    const onDocClick = (e) => { if (rangeRef.current && !rangeRef.current.contains(e.target)) setRangeOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [rangeOpen]);

  // Razorpay hands back through a popup, so re-check the plan on focus.
  useEffect(() => {
    if (!user) return;
    const onFocus = () => loadPlan();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, loadPlan]);

  const isPro = !!me?.isPro;
  const activeRangeLabel = RANGE_OPTIONS.find((r) => r.id === range)?.label || "This Week";

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* decorative aurora — matches the reference dashboard's textured backdrop */}
      <div className="pointer-events-none absolute right-[-140px] top-3 h-[540px] w-[680px] rotate-[23deg] opacity-70"
        style={{ background: "repeating-radial-gradient(ellipse at 60% 58%, transparent 0 17px, #8a72ff30 18px 19px, transparent 20px 28px)" }} />

      <div className="relative mx-auto max-w-[1210px] px-5 pb-14 pt-6 sm:px-8">

        {/* ---------- topbar: plan banner + notifications ---------- */}
        <div className="flex items-center justify-between gap-4">
          {bannerOpen && me !== null ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-full bg-white px-5 py-2.5 text-sm shadow-[0_5px_16px_#223c7a14]">
              <span className={`inline-flex items-center gap-1.5 font-bold ${isPro ? "text-[#6c4cf1]" : "text-[#0E7B57]"}`}>
                <IconSpark className="h-3.5 w-3.5" /> {isPro ? "Pro Plan" : "Free Plan"}
              </span>
              <span className="hidden text-[#6c7390] sm:inline">
                {isPro
                  ? `All features unlocked${me?.planExpiresAt ? ` until ${fmtDate(me.planExpiresAt)}` : ""}.`
                  : "Unlock unlimited access to all features and get paid."}
              </span>
              <Link href="/dashboard/settings/billing" className="font-semibold text-[#6c4cf1] underline underline-offset-2">
                {isPro ? "Manage Plan" : "Upgrade now"}
              </Link>
            </div>
          ) : <span />}
          <div className="shrink-0 rounded-[13px] bg-white p-0.5 shadow-[0_6px_15px_#20336618]">
            <span className="[&_button]:!text-[#0e1530] [&_button:hover]:!bg-[#f5f5fb]">
              <NotificationCenter />
            </span>
          </div>
        </div>

        {/* ---------- greeting + quick actions ---------- */}
        <section className="mt-7 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-[280px]">
            <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-[#11162c] sm:text-[29px]">
              {greetingWord()},<br />{name || "there"}! <span>👋</span>
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[#67718e]">
              Everything you need to grow, scale<br className="hidden sm:block" /> and succeed — all in one place.
            </p>
          </div>
          <div className="grid w-full gap-4 sm:grid-cols-3 lg:max-w-[655px]">
            <ActionCard href="/dashboard/store" tone="purple" title="Create Store" text="Set up your online store"><IconStore className="h-6 w-6" /></ActionCard>
            <ActionCard href="/dashboard/settings/profile" tone="blue" title="Edit Profile" text="Manage your profile"><IconProfile className="h-6 w-6" /></ActionCard>
            <ActionCard href="/dashboard/refer" tone="green" title="Refer & Earn" text="Invite & earn rewards"><IconGift className="h-6 w-6" /></ActionCard>
          </div>
        </section>

        {/* ---------- overview ---------- */}
        <section className="relative mt-7 overflow-visible rounded-[14px] bg-[linear-gradient(110deg,#0b1834,#07173d_65%,#102b69)] px-6 py-5 text-white shadow-[0_13px_21px_#0e20451f]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{activeRangeLabel} Overview</h2>
            <div className="relative" ref={rangeRef}>
              <button onClick={() => setRangeOpen((v) => !v)}
                className="flex items-center gap-2 rounded-[9px] bg-[#243664] px-3.5 py-2.5 text-xs hover:bg-[#2c4079]">
                <IconCalendar className="h-4 w-4" /> {activeRangeLabel}
                <IconChevron className={`ml-2 h-3.5 w-3.5 transition-transform ${rangeOpen ? "rotate-180" : ""}`} />
              </button>
              {rangeOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-40 overflow-hidden rounded-[10px] border border-white/10 bg-[#0f1d40] shadow-xl">
                  {RANGE_OPTIONS.map((o) => (
                    <button key={o.id} onClick={() => { setRange(o.id); setRangeOpen(false); }}
                      className={`block w-full px-4 py-2.5 text-left text-xs font-medium ${o.id === range ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            <Kpi tone="purple" icon={<IconTrend className="h-8 w-8" />} label="Store Visits" value={stats ? String(stats.visits.value) : null} change={stats?.visits.change} changeLabel={stats?.rangeLabel} />
            <Kpi tone="blue" icon={<IconBag className="h-8 w-8" />} label="Sales" value={stats ? String(stats.sales.value) : null} change={stats?.sales.change} changeLabel={stats?.rangeLabel} />
            <Kpi tone="green" icon={<IconDiamond className="h-8 w-8" />} label="Total Revenue" value={stats ? inr(stats.revenue.value) : null} change={stats?.revenue.change} changeLabel={stats?.rangeLabel} last />
          </div>
        </section>

        {/* ---------- action needed ---------- */}
        {!profileDone && (
          <Alert title="Complete your profile to start selling"
            body="Add your name, business name and email so buyers know who they're paying."
            cta="Complete profile" onClick={() => setShowProfile(true)} />
        )}
        {profileDone && stats?.unpublished > 0 && (
          <Alert title={`Uh oh…you have ${stats.unpublished} unpublished product${stats.unpublished === 1 ? "" : "s"}!`}
            body="Publish them to make them live on your store and start earning."
            cta="Start Earning" href="/dashboard/courses" />
        )}

        {/* ---------- lower grid ---------- */}
        <section className="mt-6 grid gap-5 2xl:grid-cols-[minmax(0,1fr)_304px]">
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-[#f0f1f7] bg-white p-6 shadow-[0_7px_18px_#2537690d]">
              <h2 className="text-lg font-bold tracking-tight text-[#11162c]">How Top Creators are using {BRAND.name}</h2>
              <div className="mt-2 h-[3px] w-6 bg-[#7d55f5]" />
              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
                <FeatureCard tone="purple" href="/dashboard/books" art={<ArtProducts />} title="Sell Digital Products" desc="Sell videos, photos, documents and more in seconds." />
                <FeatureCard tone="blue" href="/dashboard/bookings" art={<ArtSessions />} title="Offer 1:1 Sessions" desc="Launch personal coaching in a fraction of minutes." />
                <FeatureCard tone="green" href="/dashboard/courses" art={<ArtCourse />} title="Launch a Course" desc="Create full-length courses with lots of customisation." />
              </div>
              <p className="mt-4 text-xs text-[#8992ad]">
                Also: <Link href="/dashboard/events" className="font-semibold text-[#754cf0] hover:underline">Host an event</Link>
                {" · "}<Link href="/dashboard/locked" className="font-semibold text-[#754cf0] hover:underline">Lock content</Link>
                {" · "}<Link href="/dashboard/pages" className="font-semibold text-[#754cf0] hover:underline">Take any payment</Link>
              </p>
            </div>

            <div className="rounded-2xl border border-[#f0f1f7] bg-white p-5 shadow-[0_7px_18px_#2537690d]">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-[#11162c]">Offer 1:1 Sessions</h3>
                <Link href="/dashboard/bookings" className="flex items-center gap-2 text-xs font-semibold text-[#754cf0]">
                  View All <IconArrow className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniStat tone="purple" icon={<IconCoin className="h-4 w-4" />} label="Total Sessions" value={stats ? String(stats.sessions.total) : "—"} />
                <MiniStat tone="blue" icon={<IconBriefcase className="h-4 w-4" />} label="Session Hours" value={stats ? `${stats.sessions.hours}h` : "—"} />
                <MiniStat tone="orange" icon={<IconDollar className="h-4 w-4" />} label="Earnings" value={stats ? inr(stats.sessions.earnings) : "—"} />
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-5">
            <section className="relative overflow-hidden rounded-[15px] bg-[radial-gradient(circle_at_64%_92%,#8466ff_1%,transparent_21%),linear-gradient(152deg,#6a42dc,#332281_73%)] px-6 py-7 text-white shadow-[0_13px_22px_#3e24983b]">
              <h2 className="text-[17px] font-bold">Level up your business <span className="ml-1">↗</span></h2>
              <p className="mt-3 text-[13px] leading-relaxed text-white/85">
                Unlock advanced tools,<br />beautiful themes and<br /><b>premium support.</b>
              </p>
              <Link href="/dashboard/settings/billing"
                className="mt-5 inline-flex items-center gap-3.5 rounded-[22px] bg-white px-4 py-2.5 text-[11px] font-semibold text-[#43338f]">
                {isPro ? "Manage Plan" : "Explore Pro Features"} <IconArrow className="h-3.5 w-3.5" />
              </Link>
              <div className="pointer-events-none absolute bottom-9 right-10 text-6xl text-[#c1aeff]" style={{ textShadow: "0 0 18px #fff" }}>◆</div>
            </section>

            <section className="rounded-2xl border border-[#f0f1f7] bg-white p-5 shadow-[0_7px_18px_#2537690d]">
              <h3 className="text-[13px] font-bold text-[#11162c]">Recent Activity</h3>
              <div className="mt-3 space-y-3">
                {!stats ? (
                  <p className="pt-3 text-xs text-[#8b94ad]">Loading…</p>
                ) : stats.recentActivity.length === 0 ? (
                  <p className="border-t border-[#edf0f6] pt-3 text-xs text-[#8b94ad]">No orders yet — once you make a sale, it'll show up here.</p>
                ) : stats.recentActivity.map((a, i) => (
                  <Link key={i} href={a.href || "/dashboard/payments"}
                    className="flex items-start gap-2.5 border-t border-[#edf0f6] pt-3 first:border-0 first:pt-0 hover:opacity-80">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e1f8ef] text-[#0db77a]">
                      <IconBag className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1 text-[11px]">
                      <b className="block truncate text-[#11162c]">{a.title}</b>
                      <small className="mt-1 block truncate text-[#8b94ad]">{a.subtitle}</small>
                    </div>
                    <time className="shrink-0 text-[10px] text-[#8b94ad]">{timeAgo(a.createdAt)}</time>
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <BugReport />
      </div>

      {showProfile && (
        <CompleteProfileModal onClose={() => setShowProfile(false)} onSaved={() => { setShowProfile(false); refresh(); }} />
      )}
    </main>
  );
}

/* ---------------- pieces ---------------- */

const TONE = {
  purple: { chip: "bg-[#ede5ff] text-[#7d4beb]", arrow: "bg-[#322778]", kpi: "bg-[linear-gradient(135deg,#7740d9,#9d67f5)]", card: "bg-[linear-gradient(135deg,#faf7ff,#f6f3ff)]" },
  blue: { chip: "bg-[#e8f0ff] text-[#246ff0]", arrow: "bg-[#2874ef]", kpi: "bg-[linear-gradient(135deg,#1e65e1,#5497ff)]", card: "bg-[linear-gradient(135deg,#f2f7ff,#f5f9ff)]" },
  green: { chip: "bg-[#e1f7ee] text-[#0ab879]", arrow: "bg-[#10b879]", kpi: "bg-[linear-gradient(135deg,#08a56d,#3bdaae)]", card: "bg-[linear-gradient(135deg,#effbf6,#f4fcf8)]" }
};

function ActionCard({ href, title, text, tone, children }) {
  const t = TONE[tone];
  return (
    <Link href={href} className="group relative rounded-[20px] border border-[#f0f1f7] bg-white p-5 shadow-[0_9px_17px_#2935590d] transition-shadow hover:shadow-md">
      <span className={`flex h-[55px] w-[55px] items-center justify-center rounded-[19px] ${t.chip}`}>{children}</span>
      <h3 className="mt-4 text-sm font-bold tracking-tight text-[#11162c]">{title}</h3>
      <p className="mt-1 text-xs text-[#69728e]">{text}</p>
      <span className={`absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-white ${t.arrow}`}>
        <IconArrow className="h-4 w-4" />
      </span>
    </Link>
  );
}

function Kpi({ icon, label, value, change, changeLabel, tone, last }) {
  const t = TONE[tone];
  const loading = value === null || value === undefined;
  const showChange = !loading && change !== null && change !== undefined;
  const up = (change ?? 0) >= 0;
  return (
    <div className={`flex items-center gap-5 ${last ? "" : "sm:border-r sm:border-white/15"} pb-4 sm:pb-0`}>
      <span className={`flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-[22px] text-white ${t.kpi}`}>{icon}</span>
      <div>
        <span className="block text-xs text-white/85">{label}</span>
        <strong className="mt-1.5 block whitespace-nowrap text-2xl font-bold">
          {loading ? "—" : value} {showChange && <em className={`text-xs font-semibold not-italic ${up ? "text-[#39d999]" : "text-[#ff8a8a]"}`}>{up ? "↑" : "↓"} {Math.abs(change)}%</em>}
        </strong>
        <small className="block text-xs text-white/70">{loading ? " " : (changeLabel || "")}</small>
      </div>
    </div>
  );
}

/** Layered "phone + card" illustrations, styled after the reference mockups. */
function ArtProducts() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 rotate-[-6deg] rounded-[18px] bg-[linear-gradient(150deg,#caa9ff,#6c3ff0)] shadow-lg" />
      <div className="absolute left-1/2 top-1/2 w-[78%] -translate-x-1/2 -translate-y-1/2 rotate-[4deg] rounded-[12px] bg-white p-1.5 shadow-md">
        <div className="flex h-9 items-center justify-center rounded-[8px] bg-[#f2edff]">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7d4beb] text-white"><IconPlay className="h-2.5 w-2.5" /></span>
        </div>
        <div className="mt-1.5 h-1 w-3/4 rounded bg-[#e7e3f4]" />
        <div className="mt-1 h-1 w-1/2 rounded bg-[#e7e3f4]" />
      </div>
    </div>
  );
}
function ArtSessions() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 rotate-[6deg] rounded-[18px] bg-[linear-gradient(150deg,#a9c9ff,#2f6cf0)] shadow-lg" />
      <div className="absolute left-1/2 top-1/2 w-[78%] -translate-x-1/2 -translate-y-1/2 -rotate-[4deg] rounded-[12px] bg-white p-2 text-center shadow-md">
        <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#e8f0ff] text-[#246ff0]"><IconProfile className="h-4 w-4" /></span>
        <div className="mx-auto mt-1.5 h-1 w-full rounded bg-[#e5edfb]" />
        <div className="mx-auto mt-1 h-1 w-2/3 rounded bg-[#e5edfb]" />
      </div>
    </div>
  );
}
function ArtCourse() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 rounded-[18px] bg-[linear-gradient(150deg,#9ce8c4,#0f9f62)] shadow-lg" />
      <div className="absolute left-1/2 top-[36%] -translate-x-1/2 -translate-y-1/2 text-white"><IconCap className="h-8 w-8" /></div>
      <div className="absolute bottom-1.5 left-1/2 w-[78%] -translate-x-1/2 rounded-[10px] bg-white p-1.5 shadow-md">
        <div className="h-1 w-full rounded bg-[#dff5ea]" />
        <div className="mt-1 h-1 w-2/3 rounded bg-[#dff5ea]" />
      </div>
    </div>
  );
}

function FeatureCard({ tone, href, art, title, desc }) {
  const t = TONE[tone];
  return (
    <Link href={href} className={`relative flex min-h-[168px] items-stretch gap-3 rounded-2xl p-4 ${t.card}`}>
      <div className="w-[72px] shrink-0">{art}</div>
      <div className="flex min-w-0 flex-1 flex-col justify-center pr-3">
        <h4 className="text-xs font-bold leading-snug text-[#11162c]">{title}</h4>
        <p className="mt-2 text-xs leading-relaxed text-[#4b5776]">{desc}</p>
      </div>
      <span className={`absolute bottom-3 right-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${t.arrow}`}>
        <IconArrow className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

function MiniStat({ tone, icon, label, value }) {
  const dot = tone === "orange" ? "bg-[#fff1df] text-[#ef922e]" : tone === "blue" ? "bg-[#e8f0ff] text-[#246ff0]" : "bg-[#eee7ff] text-[#7d4beb]";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#e5e9f5] p-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${dot}`}>{icon}</span>
      <p className="text-[10px] text-[#7c86a2]">{label}<b className="mt-1 block text-sm text-[#151b31]">{value}</b></p>
    </div>
  );
}

function Alert({ title, body, cta, href, onClick }) {
  const btn = "w-full shrink-0 rounded-full bg-ink px-5 py-2.5 text-center text-sm font-bold text-white hover:opacity-90 sm:w-auto";
  return (
    <div className="mt-5 flex flex-col gap-3 rounded-xl border border-[#F6E7B8] bg-[#FEF9E7] p-4 sm:flex-row sm:items-center sm:gap-4 sm:rounded-2xl sm:p-5">
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

/** Feedback goes straight to the creator's own channel. */
function BugReport() {
  return (
    <section className="mt-5 flex flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4 sm:rounded-2xl sm:p-5">
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

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
