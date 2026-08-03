"use client";
/**
 * SuperCreators — landing page
 * ---------------------------------------------------------------
 * Requires: npm i framer-motion
 * Uses next/font/google (Fraunces + Inter + Lexend).
 *
 * CHANGES IN THIS VERSION:
 *  - Footer replaced with the shared <SiteFooter /> from
 *    @/components/LegalLayout, which links to /terms, /privacy,
 *    /contact and /disclaimer.
 * ---------------------------------------------------------------
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Fraunces, Inter, Lexend } from "next/font/google";
import {
  motion,
  AnimatePresence,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { SiteFooter } from "@/components/LegalLayout";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});
const lexend = Lexend({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-headline",
});

/* ---------------------------------------------------------------- */
/* Design tokens — blue / white / ink                                */
/* ---------------------------------------------------------------- */
const T = {
  ink: "#0B1220",
  inkmuted: "#5B6478",
  paper: "#FFFFFF",
  paper2: "#F4F7FF",
  line: "#E1E7F5",
  brand: "#2A5DF0",
  brandDeep: "#12379B",
  brandTint: "#E7EEFF",
};

const ease = [0.16, 1, 0.3, 1];

/* ---------------------------------------------------------------- */
/* Small utilities                                                   */
/* ---------------------------------------------------------------- */
function Reveal({ children, delay = 0, y = 22, className = "" }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Counter({ value, decimals = 0, suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 20, mass: 0.6 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, value, mv]);

  useMotionValueEvent(spring, "change", (latest) => {
    setDisplay(
      latest.toLocaleString("en-IN", {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      })
    );
  });

  return (
    <span ref={ref} className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, mass: 0.2 });
  return (
    <motion.div
      style={{ scaleX, background: T.brand }}
      className="fixed left-0 top-0 z-[60] h-[3px] w-full origin-left"
    />
  );
}

/* ---------------------------------------------------------------- */
/* Hero signature: animated checkout receipt                         */
/* ---------------------------------------------------------------- */
function ReceiptMockup() {
  const reduce = useReducedMotion();
  const items = [
    "Module 1 · Getting started",
    "Module 2 · Core technique",
    "Module 3 · Advanced workflow",
    "Certificate of completion",
  ];
  const total = 2499;

  return (
    <motion.div
      initial={{ opacity: 0, y: 36, rotate: reduce ? 0 : -2 }}
      animate={{ opacity: 1, y: 0, rotate: reduce ? 0 : -2 }}
      transition={{ duration: 0.8, ease }}
      className="relative mx-auto w-full max-w-sm select-none"
    >
      <div
        className="relative overflow-hidden rounded-b-[22px] bg-white"
        style={{ boxShadow: "0 30px 60px -18px rgba(11,18,32,0.28)" }}
      >
        {/* perforated top edge */}
        <div className="flex justify-between px-2 pt-1">
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              className="-mt-2 h-4 w-4 rounded-full"
              style={{ background: T.paper2 }}
            />
          ))}
        </div>

        <div
          className="px-7 pb-8 pt-4"
          style={{ fontFamily: "var(--font-body)" }}
        >
          <div className="text-center">
            <div
              className="text-lg font-bold"
              style={{ fontFamily: "var(--font-headline)", color: T.ink }}
            >
              SuperCreators
            </div>
            <div className="mt-1 text-[11px] tracking-[0.2em]" style={{ color: T.inkmuted }}>
              COURSE CHECKOUT
            </div>
          </div>

          <div
            className="mt-5 space-y-2.5 border-t border-dashed pt-4 text-sm"
            style={{ borderColor: T.line }}
          >
            {items.map((label, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: reduce ? 0 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reduce ? 0 : 0.5 + i * 0.16, duration: 0.4, ease }}
                className="flex items-center justify-between"
              >
                <span style={{ color: T.ink, opacity: 0.85 }}>{label}</span>
                <span style={{ color: T.brand }}>✓</span>
              </motion.div>
            ))}
          </div>

          <div
            className="mt-4 flex items-baseline justify-between border-t border-dashed pt-4"
            style={{ borderColor: T.line }}
          >
            <span className="text-xs tracking-[0.15em]" style={{ color: T.inkmuted }}>
              TOTAL
            </span>
            <span
              className="tabular-nums text-2xl font-semibold"
              style={{ fontFamily: "var(--font-display)", color: T.ink }}
            >
              ₹<Counter value={total} />
            </span>
          </div>
          <div className="mt-2 text-[11px]" style={{ color: T.inkmuted }}>
            via UPI · Razorpay secure checkout
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: reduce ? 0 : -25 }}
          animate={{ opacity: 1, scale: 1, rotate: -12 }}
          transition={{ delay: reduce ? 0 : 1.7, duration: 0.5, ease: "backOut" }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border-[3px] px-4 py-2 text-sm font-bold tracking-widest"
          style={{ borderColor: T.brand, color: T.brand, fontFamily: "var(--font-display)" }}
        >
          PAID
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------------------------- */
/* Headline with staggered word reveal                               */
/* ---------------------------------------------------------------- */
function Headline() {
  const reduce = useReducedMotion();
  const rows = [
    { words: ["Your", "knowledge."] },
    { words: ["Your", "course."] },
    { words: ["Your", "price."], brandLast: true },
  ];

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.09, delayChildren: reduce ? 0 : 0.1 } },
  };
  const word = {
    hidden: { opacity: 0, y: reduce ? 0 : 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
  };

  return (
    <motion.h1
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-3xl text-5xl font-bold leading-[1.05] md:text-6xl"
      style={{ fontFamily: "var(--font-headline)", fontWeight: 700, color: T.ink }}
    >
      {rows.map((row, ri) => (
        <span key={ri} className="block">
          {row.words.map((w, wi) => {
            const isLast = row.brandLast && wi === row.words.length - 1;
            return (
              <motion.span
                key={w}
                variants={word}
                className="mr-3 inline-block"
                style={isLast ? { color: T.brand } : undefined}
              >
                {w}
              </motion.span>
            );
          })}
        </span>
      ))}
    </motion.h1>
  );
}

/* ---------------------------------------------------------------- */
/* Stats bar                                                         */
/* ---------------------------------------------------------------- */
function StatsBar() {
  const stats = [
    { value: 12400, suffix: "+", label: "Creators on SuperCreators" },
    { value: 38, suffix: " Cr+", label: "Processed via UPI & cards" },
    { value: 96, suffix: "%", label: "Payouts within 24 hours" },
  ];
  return (
    <div
      className="mx-auto grid max-w-5xl grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0"
      style={{ borderColor: T.line }}
    >
      {stats.map((s, i) => (
        <Reveal key={s.label} delay={i * 0.1} className="px-8 py-6 text-center">
          <div
            className="text-3xl font-semibold tabular-nums md:text-4xl"
            style={{ fontFamily: "var(--font-display)", color: T.ink }}
          >
            <Counter value={s.value} suffix={s.suffix} />
          </div>
          <div className="mt-1.5 text-sm" style={{ color: T.inkmuted }}>
            {s.label}
          </div>
        </Reveal>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* How it works — connected line-item flow                           */
/* ---------------------------------------------------------------- */
function HowItWorks() {
  const steps = [
    ["Build", "Cover, description, benefits, FAQs, testimonials — a full sales page with live preview."],
    ["Price", "Fixed price, pay-what-you-want, or free. Discounts, coupons and limited validity supported."],
    ["Sell", "Razorpay checkout, custom buyer questions, post-purchase automation and completion certificates."],
  ];
  return (
    <div className="relative mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
      <div
        className="absolute left-0 right-0 top-10 hidden h-px md:block"
        style={{ background: `linear-gradient(90deg, transparent, ${T.line}, transparent)` }}
      />
      {steps.map(([t, d], i) => (
        <Reveal key={t} delay={i * 0.12}>
          <div
            className="relative h-full rounded-2xl border bg-white p-6"
            style={{ borderColor: T.line }}
          >
            <div
              className="mb-4 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
              style={{ background: T.brandTint, color: T.brandDeep, fontFamily: "var(--font-display)" }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <div
              className="text-xl font-bold"
              style={{ fontFamily: "var(--font-display)", color: T.ink }}
            >
              {t}
            </div>
            <p className="mt-2 text-sm" style={{ color: T.inkmuted }}>
              {d}
            </p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Interactive payout calculator — second signature moment           */
/* ---------------------------------------------------------------- */
function PricingCalculator() {
  const [price, setPrice] = useState(1999);
  const fee = useMemo(() => Math.round(price * 0.1), [price]);
  const payout = price - fee;
  const pct = Math.round(((price - 199) / (19999 - 199)) * 100);

  return (
    <Reveal className="mx-auto max-w-3xl rounded-3xl border bg-white p-8 md:p-10">
      <div style={{ borderColor: T.line }} />
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs tracking-[0.2em]" style={{ color: T.inkmuted }}>
            SET YOUR PRICE
          </div>
          <div
            className="mt-2 tabular-nums text-4xl font-semibold"
            style={{ fontFamily: "var(--font-display)", color: T.ink }}
          >
            ₹{price.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="text-left md:text-right">
          <div className="text-xs tracking-[0.2em]" style={{ color: T.inkmuted }}>
            YOU KEEP
          </div>
          <motion.div
            key={payout}
            initial={{ opacity: 0.4, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-2 tabular-nums text-4xl font-semibold"
            style={{ fontFamily: "var(--font-display)", color: T.brand }}
          >
            ₹{payout.toLocaleString("en-IN")}
          </motion.div>
        </div>
      </div>

      <div className="relative mt-8">
        <div
          className="h-1.5 w-full rounded-full"
          style={{ background: T.paper2 }}
        >
          <div
            className="h-1.5 rounded-full"
            style={{ width: `${pct}%`, background: T.brand, transition: "width 0.15s ease-out" }}
          />
        </div>
        <input
          type="range"
          min={199}
          max={19999}
          step={100}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="absolute inset-x-0 -top-2.5 h-6 w-full cursor-pointer opacity-0"
          aria-label="Course price"
        />
        <div
          className="pointer-events-none absolute -top-1.5 h-4 w-4 -translate-x-1/2 rounded-full border-2 bg-white"
          style={{ left: `${pct}%`, borderColor: T.brand }}
        />
      </div>

      <div className="mt-3 flex justify-between text-[11px]" style={{ color: T.inkmuted }}>
        <span>₹199</span>
        <span>Platform fee (10%): ₹{fee.toLocaleString("en-IN")}</span>
        <span>₹19,999</span>
      </div>
    </Reveal>
  );
}

/* ---------------------------------------------------------------- */
/* Feature tabs                                                      */
/* ---------------------------------------------------------------- */
const FEATURES = [
  { key: "certificates", label: "Certificates", desc: "Auto-issued on completion, verifiable by a unique ID." },
  { key: "coupons", label: "Coupons", desc: "Percentage or flat discounts, with expiry dates and usage limits." },
  { key: "analytics", label: "Analytics", desc: "Sales, completion rates and drop-off, broken down by lesson." },
  { key: "questions", label: "Buyer questions", desc: "Collect phone, city, or any custom field right at checkout." },
];

function FeaturePanel({ activeKey }) {
  if (activeKey === "certificates") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
        <div
          className="flex h-24 w-24 items-center justify-center rounded-full border-4 text-xs font-bold tracking-widest"
          style={{ borderColor: T.brand, color: T.brand, fontFamily: "var(--font-display)" }}
        >
          VERIFIED
        </div>
        <div className="text-sm" style={{ color: T.inkmuted }}>
          Certificate #MP-93412
        </div>
      </div>
    );
  }
  if (activeKey === "coupons") {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div
          className="relative flex w-56 items-center justify-between rounded-lg border-2 border-dashed px-5 py-4"
          style={{ borderColor: T.brand, background: T.brandTint }}
        >
          <span className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: T.brandDeep }}>
            30% OFF
          </span>
          <span className="text-xs" style={{ color: T.inkmuted }}>
            LAUNCH30
          </span>
        </div>
      </div>
    );
  }
  if (activeKey === "analytics") {
    const bars = [40, 70, 55, 90, 65];
    return (
      <div className="flex h-full items-end justify-center gap-3 p-8">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ duration: 0.5, delay: i * 0.08, ease }}
            className="w-8 rounded-t-md"
            style={{ background: i === 3 ? T.brand : T.brandTint }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8">
      {["Phone number", "City", "How did you hear about us?"].map((f) => (
        <div
          key={f}
          className="w-56 rounded-lg border px-3 py-2 text-xs"
          style={{ borderColor: T.line, color: T.inkmuted }}
        >
          {f}
        </div>
      ))}
    </div>
  );
}

function FeatureTabs() {
  const [active, setActive] = useState(FEATURES[0].key);
  const activeFeature = FEATURES.find((f) => f.key === active);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap justify-center gap-2">
        {FEATURES.map((f) => (
          <button
            key={f.key}
            onClick={() => setActive(f.key)}
            className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: active === f.key ? T.brand : T.paper2,
              color: active === f.key ? "#fff" : T.inkmuted,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid overflow-hidden rounded-3xl border md:grid-cols-2" style={{ borderColor: T.line }}>
        <div className="h-64 md:h-80" style={{ background: T.paper2 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease }}
              className="h-full"
            >
              <FeaturePanel activeKey={active} />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex flex-col justify-center bg-white p-8 md:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <div
                className="text-2xl font-bold"
                style={{ fontFamily: "var(--font-display)", color: T.ink }}
              >
                {activeFeature.label}
              </div>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: T.inkmuted }}>
                {activeFeature.desc}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Testimonial marquee                                               */
/* ---------------------------------------------------------------- */
function TestimonialMarquee() {
  const quotes = [
    ["Riya Sharma", "Design mentor", "Set up my first cohort course in an afternoon — payouts just work."],
    ["Aman Verma", "Fitness coach", "Coupons and certificates alone paid for the switch from spreadsheets."],
    ["Priya Nair", "Music teacher", "Buyer questions at checkout mean I know exactly who's enrolling."],
    ["Karan Mehta", "Finance educator", "Analytics showed me exactly which lesson people dropped off at."],
  ];
  const loop = [...quotes, ...quotes];

  return (
    <div className="overflow-hidden py-2" style={{ maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)" }}>
      <div className="flex w-max gap-5 [animation:mp-marquee_32s_linear_infinite] motion-reduce:[animation:none] hover:[animation-play-state:paused]">
        {loop.map((q, i) => (
          <div
            key={i}
            className="w-72 shrink-0 rounded-2xl border bg-white p-6"
            style={{ borderColor: T.line }}
          >
            <div
              className="mb-3 inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-widest"
              style={{ background: T.brandTint, color: T.brandDeep }}
            >
              VERIFIED CREATOR
            </div>
            <p className="text-sm leading-relaxed" style={{ color: T.ink }}>
              &rdquo;{q[2]}&rdquo;
            </p>
            <div className="mt-4 text-sm font-semibold" style={{ color: T.ink }}>
              {q[0]}
            </div>
            <div className="text-xs" style={{ color: T.inkmuted }}>
              {q[1]}
            </div>
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes mp-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Page                                                               */
/* ---------------------------------------------------------------- */
export default function Home() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) localStorage.setItem("mp_ref", ref);
  }, []);

  const { user, loading } = useAuth();

  return (
    <main
      className={`${fraunces.variable} ${inter.variable} ${lexend.variable} min-h-screen`}
      style={{ background: T.paper, fontFamily: "var(--font-body)" }}
    >
      <ScrollProgress />

      {/* Nav */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-md"
        style={{ borderColor: T.line, background: "rgba(255,255,255,0.75)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="text-xl font-bold" style={{ fontFamily: "var(--font-headline)", color: T.ink }}>
            Super<span style={{ color: T.brand }}>Creators</span>
          </div>
          <Link
            href={user ? "/dashboard" : "/login"}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
            style={{ background: T.ink }}
          >
            {user ? "Dashboard" : "Sign in"}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden px-6 pb-24 pt-16 md:pt-20"
        style={{
          backgroundImage: `radial-gradient(${T.line} 1px, transparent 1px)`,
          backgroundSize: "22px 22px",
          backgroundPosition: "-11px -11px",
        }}
      >
        <div className="mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-2">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-5 inline-block rounded-full border bg-white px-3 py-1 text-xs font-semibold"
              style={{ borderColor: T.line, color: T.inkmuted }}
            >
              Made for Indian creators · UPI &amp; cards via Razorpay
            </motion.p>

            <Headline />

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55, ease }}
              className="mt-5 max-w-xl text-lg"
              style={{ color: T.inkmuted }}
            >
              Build a beautiful course page, add modules and lessons, set your price and start
              selling — with checkout, coupons, certificates and analytics built in.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7, ease }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link
                href={user ? "/dashboard" : "/login"}
                className="rounded-full px-6 py-3 text-base font-semibold text-white transition-transform hover:scale-[1.03]"
                style={{ background: T.brand }}
              >
                Create your course
              </Link>
              <a
                href="#how"
                className="rounded-full border px-6 py-3 text-base font-semibold transition-colors hover:bg-white"
                style={{ borderColor: T.line, color: T.ink }}
              >
                How it works
              </a>
            </motion.div>
          </div>

          <ReceiptMockup />
        </div>
      </section>

      {/* Stats */}
      <section className="border-y px-6 py-4" style={{ borderColor: T.line, background: T.paper2 }}>
        <StatsBar />
      </section>

      {/* How it works */}
      <section id="how" className="px-6 py-24">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <div
            className="text-3xl font-bold md:text-4xl"
            style={{ fontFamily: "var(--font-display)", color: T.ink }}
          >
            From idea to income, in three steps
          </div>
        </Reveal>
        <HowItWorks />
      </section>

      {/* Pricing calculator */}
      <section className="px-6 py-8" style={{ background: T.paper2 }}>
        <div className="py-16">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <div
              className="text-3xl font-bold md:text-4xl"
              style={{ fontFamily: "var(--font-display)", color: T.ink }}
            >
              You set the price. You keep the profit.
            </div>
            <p className="mt-3 text-sm" style={{ color: T.inkmuted }}>
              Drag the slider — see your payout update instantly.
            </p>
          </Reveal>
          <PricingCalculator />
        </div>
      </section>

      {/* Feature tabs */}
      <section className="px-6 py-24">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <div
            className="text-3xl font-bold md:text-4xl"
            style={{ fontFamily: "var(--font-display)", color: T.ink }}
          >
            Everything a course launch needs
          </div>
        </Reveal>
        <FeatureTabs />
      </section>

      {/* Testimonials */}
      <section className="py-20" style={{ background: T.paper2 }}>
        <Reveal className="mx-auto mb-10 max-w-2xl text-center px-6">
          <div
            className="text-3xl font-bold md:text-4xl"
            style={{ fontFamily: "var(--font-display)", color: T.ink }}
          >
            Creators are already selling
          </div>
        </Reveal>
        <TestimonialMarquee />
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24" style={{ background: T.ink }}>
        <Reveal className="mx-auto max-w-2xl text-center">
          <div
            className="text-3xl font-bold text-white md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your course page is ten minutes away.
          </div>
          <Link
            href={user ? "/dashboard" : "/login"}
            className="mt-8 inline-block rounded-full px-8 py-3.5 text-base font-semibold transition-transform hover:scale-[1.03]"
            style={{ background: T.brand, color: "#fff" }}
          >
            {user ? "Go to dashboard" : "Create your course"}
          </Link>
        </Reveal>
      </section>

      {/* Footer — now shared across all pages */}
      <SiteFooter />
    </main>
  );
}