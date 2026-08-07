"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { inr } from "@/lib/courseModel";
import { SocialIcon, socialLabel } from "@/components/BrandIcons";

/* =============================================================
   CreatorWebsite — a hand-crafted marketing site rendered from a
   creator's real profile + published products. Light/dark aware,
   themed to the brand colour, layered aurora + grid + noise bg.
   ============================================================= */

/* ---- tiny inline icon set (no emojis) ---- */
const S = (p) => <svg viewBox="0 0 24 24" width={p.size || 22} height={p.size || 22} fill="none" stroke="currentColor" strokeWidth={p.sw || 1.7} strokeLinecap="round" strokeLinejoin="round" style={p.style}>{p.children}</svg>;
const IC = {
  route: <S><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h6a4 4 0 0 0 4-4V9" /></S>,
  zap: <S><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></S>,
  device: <S><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></S>,
  play: <S><circle cx="12" cy="12" r="9" /><path d="M10 9l5 3-5 3V9Z" fill="currentColor" stroke="none" /></S>,
  notes: <S><path d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M8 11h8M8 15h5" /></S>,
  award: <S><circle cx="12" cy="9" r="6" /><path d="M9 14l-1.5 8L12 19l4.5 3L15 14" /></S>,
  userPlus: <S><circle cx="9" cy="8" r="4" /><path d="M3 20a6 6 0 0 1 12 0M18 8v6M15 11h6" /></S>,
  target: <S><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /></S>,
  book: <S><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Z" /><path d="M8 3v16" /></S>,
  trophy: <S><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" /><path d="M5 5H3v2a3 3 0 0 0 3 3M19 5h2v2a3 3 0 0 1-3 3M9 15v3h6v-3M8 21h8" /></S>,
  sun: <S><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></S>,
  moon: <S><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" /></S>,
  check: <S sw={2.4}><path d="M20 6 9 17l-5-5" /></S>,
  arrow: <S><path d="M5 12h14M13 6l6 6-6 6" /></S>,
  spark: <S><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" /></S>
};

const FEATURES = [
  { icon: IC.route, color: "#6366F1", title: "Structured learning path", desc: "A clear roadmap from fundamentals to mastery — no guesswork, no overwhelm." },
  { icon: IC.zap, color: "#EC4899", title: "Practice & assessments", desc: "Cement every topic with quizzes, tests and real exam-style questions." },
  { icon: IC.device, color: "#10B981", title: "Learn anywhere", desc: "Phone, tablet or desktop — progress syncs and picks up where you left off." },
  { icon: IC.play, color: "#F59E0B", title: "Expert-led lessons", desc: "Taught by people who do the work, distilled into lessons that actually land." },
  { icon: IC.notes, color: "#06B6D4", title: "Notes & resources", desc: "Downloadable notes and material that make revision genuinely effortless." },
  { icon: IC.award, color: "#8B5CF6", title: "Proof of progress", desc: "Track completion and earn credentials that reflect real, tested skill." }
];
const STEPS = [
  { icon: IC.userPlus, title: "Join the platform", desc: "Create your free account in seconds and step into a focused space." },
  { icon: IC.target, title: "Pick your path", desc: "Choose the course that maps to your goal and start with momentum." },
  { icon: IC.book, title: "Immerse & learn", desc: "Dive into lessons crafted for depth, not just surface coverage." },
  { icon: IC.trophy, title: "Prove your mastery", desc: "Finish, get certified, and carry credentials that mean something." }
];
const NAV = [["home", "Home"], ["courses", "Courses"], ["features", "About"], ["connect", "Contact"]];

const rise = { hidden: { opacity: 0, y: 26 }, show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] } }) };

function rgba(hex, a) {
  const h = (hex || "#6366F1").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const NOISE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function CreatorWebsite({ data, items = [], testimonials = [] }) {
  const { name, bio, avatar, accent, socials, links, username } = data;
  const [dark, setDark] = useState(true);
  const [menu, setMenu] = useState(false);
  const socialList = Object.entries(socials || {}).filter(([, v]) => v);

  const t = useMemo(() => (dark ? {
    bg: "#0A0A12", text: "#F4F5FB", muted: "rgba(244,245,251,0.58)",
    panel: "rgba(255,255,255,0.035)", panelSolid: "#12121d", border: "rgba(255,255,255,0.09)",
    nav: "rgba(10,10,18,0.72)", grid: "rgba(255,255,255,0.04)", chip: rgba(accent, 0.16)
  } : {
    bg: "#F6F7FB", text: "#0E1020", muted: "rgba(14,16,32,0.6)",
    panel: "#FFFFFF", panelSolid: "#FFFFFF", border: "rgba(14,16,32,0.09)",
    nav: "rgba(246,247,251,0.82)", grid: "rgba(14,16,32,0.045)", chip: rgba(accent, 0.12)
  }), [dark, accent]);

  const scrollTo = (id) => { setMenu(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: t.bg, color: t.text }}>
      {/* ---------- layered background ---------- */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* grid */}
        <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(${t.grid} 1px, transparent 1px), linear-gradient(90deg, ${t.grid} 1px, transparent 1px)`, backgroundSize: "48px 48px", maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)" }} />
        {/* aurora blobs */}
        <motion.div animate={{ x: [0, 40, 0], y: [0, -24, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-32 -top-24 h-[34rem] w-[34rem] rounded-full blur-[110px]" style={{ background: rgba(accent, dark ? 0.4 : 0.22) }} />
        <motion.div animate={{ x: [0, -30, 0], y: [0, 30, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-[-8rem] top-24 h-[30rem] w-[30rem] rounded-full blur-[120px]" style={{ background: rgba("#a855f7", dark ? 0.28 : 0.16) }} />
        <motion.div animate={{ x: [0, 24, 0], y: [0, -18, 0] }} transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 left-1/3 h-[28rem] w-[28rem] rounded-full blur-[120px]" style={{ background: rgba("#22d3ee", dark ? 0.14 : 0.1) }} />
        {/* noise */}
        <div className="absolute inset-0 opacity-[0.5]" style={{ backgroundImage: NOISE, mixBlendMode: dark ? "overlay" : "multiply", opacity: dark ? 0.06 : 0.035 }} />
      </div>

      <div className="relative z-10">
        {/* ---------------- NAV ---------------- */}
        <header className="sticky top-0 z-50 border-b backdrop-blur-xl" style={{ borderColor: t.border, background: t.nav }}>
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
            <button onClick={() => scrollTo("home")} className="flex items-center gap-2.5">
              {avatar
                ? <img src={avatar} alt="" className="h-9 w-9 rounded-lg object-cover ring-1" style={{ boxShadow: `0 0 0 1px ${t.border}` }} />
                : <span className="grid h-9 w-9 place-items-center rounded-lg text-sm font-bold text-white" style={{ background: accent }}>{name[0]}</span>}
              <span className="font-display text-[17px] font-bold tracking-tight">{name}</span>
            </button>
            <nav className="hidden items-center gap-8 md:flex">
              {NAV.map(([id, label]) => (
                <button key={id} onClick={() => scrollTo(id)} className="text-sm font-medium transition-opacity hover:opacity-100" style={{ color: t.muted }}>{label}</button>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <button onClick={() => setDark((v) => !v)} aria-label="Toggle theme"
                className="grid h-9 w-9 place-items-center rounded-lg border transition-colors" style={{ borderColor: t.border, color: t.text }}>
                {dark ? IC.sun : IC.moon}
              </button>
              <Link href="/login" className="hidden rounded-lg px-5 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 sm:block"
                style={{ background: accent, boxShadow: `0 8px 24px ${rgba(accent, 0.35)}` }}>Login</Link>
              <button onClick={() => setMenu((v) => !v)} className="grid h-9 w-9 place-items-center rounded-lg border md:hidden" style={{ borderColor: t.border }} aria-label="Menu">
                {menu ? IC.arrow : <S><path d="M4 6h16M4 12h16M4 18h16" /></S>}
              </button>
            </div>
          </div>
          {menu && (
            <div className="border-t px-4 py-3 md:hidden" style={{ borderColor: t.border }}>
              {NAV.map(([id, label]) => (
                <button key={id} onClick={() => scrollTo(id)} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium" style={{ color: t.muted }}>{label}</button>
              ))}
              <Link href="/login" className="mt-2 block rounded-lg px-3 py-2.5 text-center text-sm font-semibold text-white" style={{ background: accent }}>Login</Link>
            </div>
          )}
        </header>

        {/* ---------------- HERO ---------------- */}
        <section id="home" className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.2fr_0.8fr] md:py-24 lg:gap-12">
          <motion.div initial="hidden" animate="show" variants={rise}>
            <span className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold" style={{ borderColor: t.border, background: t.chip, color: t.text }}>
              <span className="grid place-items-center" style={{ color: accent }}>{IC.spark}</span> Online learning, reimagined
            </span>
            <h1 className="mt-5 font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-6xl">
              Studying online is{" "}
              <span className="relative whitespace-nowrap">
                <span style={{ background: `linear-gradient(120deg, ${accent}, #a855f7)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>now effortless</span>
                <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 200 10" preserveAspectRatio="none"><path d="M2 7C50 2 150 2 198 6" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" /></svg>
              </span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed sm:text-lg" style={{ color: t.muted }}>
              {bio || `${name} teaches in a more interactive, effective way — structured lessons, real practice, anytime and anywhere.`}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button onClick={() => scrollTo("courses")} className="group inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
                style={{ background: accent, boxShadow: `0 14px 36px ${rgba(accent, 0.4)}` }}>Explore courses <span className="transition-transform group-hover:translate-x-0.5">{IC.arrow}</span></button>
              <Link href={`/${username}`} className="rounded-lg border px-6 py-3.5 text-sm font-semibold transition-colors" style={{ borderColor: t.border, background: t.panel, color: t.text }}>Visit store</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
              <Stat value={`${items.length}`} label="Courses" t={t} />
              <Stat value="12k+" label="Learners" t={t} />
              <Stat value="4.9" label="Avg rating" t={t} accent={accent} />
            </div>
          </motion.div>

          {/* bigger portrait on laptop */}
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-xs md:max-w-[18rem] lg:max-w-[22rem]">
            <div className="absolute -inset-6 rounded-[2rem] blur-2xl" style={{ background: rgba(accent, 0.28) }} />
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border" style={{ borderColor: t.border, background: t.panel }}>
              {avatar
                ? <img src={avatar} alt={name} className="h-full w-full object-cover" />
                : <div className="grid h-full w-full place-items-center font-display text-8xl font-bold" style={{ background: t.chip, color: accent }}>{name[0]}</div>}
              <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 55%, ${rgba("#000", dark ? 0.5 : 0.28)})` }} />
            </motion.div>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-4 -left-4 flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-xl backdrop-blur" style={{ borderColor: t.border, background: dark ? "rgba(10,10,18,0.85)" : "rgba(255,255,255,0.9)" }}>
              <span className="grid h-8 w-8 place-items-center rounded-full text-white" style={{ background: accent }}>{IC.check}</span>
              <div><div className="text-[11px]" style={{ color: t.muted }}>Verified creator</div><div className="text-sm font-bold">{name}</div></div>
            </motion.div>
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-3 top-8 rounded-xl border px-3.5 py-2.5 shadow-xl backdrop-blur" style={{ borderColor: t.border, background: dark ? "rgba(10,10,18,0.85)" : "rgba(255,255,255,0.9)" }}>
              <div className="text-lg font-extrabold" style={{ color: accent }}>{items.length}+</div>
              <div className="text-[11px]" style={{ color: t.muted }}>Live courses</div>
            </motion.div>
          </motion.div>
        </section>

        {/* ---------------- COURSES ---------------- */}
        <Section id="courses" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <Head t={t} accent={accent} kicker="Featured" title="Popular courses" sub="The most sought-after courses — start your journey today." />
          {items.length === 0 ? (
            <p className="text-center" style={{ color: t.muted }}>New courses are coming soon.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it, i) => {
                const off = it.mrp > it.price && it.price > 0 ? Math.round(((it.mrp - it.price) / it.mrp) * 100) : 0;
                return (
                  <motion.div key={`${it.type}-${it.id}`} custom={i} variants={rise}
                    className="group flex flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-1"
                    style={{ borderColor: t.border, background: t.panel, boxShadow: dark ? "none" : "0 1px 2px rgba(14,16,32,0.04)" }}>
                    <div className="relative aspect-[16/9] overflow-hidden" style={{ background: t.chip }}>
                      {it.img
                        ? <img src={it.img} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]" />
                        : <div className="grid h-full w-full place-items-center" style={{ color: accent }}>{IC.book}</div>}
                      <span className="absolute left-3 top-3 rounded-md px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: "rgba(0,0,0,0.5)" }}>{it.kind === "course" ? "Course" : it.type}</span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="line-clamp-2 font-display text-lg font-bold leading-snug">{it.title}</h3>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(it.tags || []).map((x) => <span key={x} className="rounded px-2 py-0.5 text-[11px] font-medium" style={{ background: t.chip, color: t.muted }}>{x}</span>)}
                      </div>
                      <div className="mt-auto pt-4">
                        <div className="flex items-end justify-between">
                          <div className="flex items-baseline gap-2">
                            {it.price === 0
                              ? <span className="text-xl font-extrabold" style={{ color: accent }}>Free</span>
                              : <><span className="text-2xl font-extrabold">{inr(it.price)}</span>{off > 0 && <span className="text-sm line-through" style={{ color: t.muted }}>{inr(it.mrp)}</span>}</>}
                          </div>
                          {off > 0 && <span className="rounded-md px-2 py-0.5 text-xs font-bold" style={{ background: rgba("#10b981", 0.16), color: "#10b981" }}>Save {off}%</span>}
                        </div>
                        <Link href={it.href} className="mt-4 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90" style={{ background: accent }}>Enroll now {IC.arrow}</Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ---------------- FEATURES ---------------- */}
        <Section id="features" className="border-y" style={{ borderColor: t.border, background: t.panel }}>
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
            <Head t={t} accent={accent} kicker="Why choose us" title="Built for how you actually learn" sub="Tools that make studying smarter, faster and more rewarding." />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <motion.div key={f.title} custom={i} variants={rise}
                  className="relative overflow-hidden rounded-xl border p-6 transition-transform hover:-translate-y-1"
                  style={{ borderColor: rgba(f.color, dark ? 0.28 : 0.22), background: rgba(f.color, dark ? 0.11 : 0.07) }}>
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl" style={{ background: rgba(f.color, 0.28) }} />
                  <div className="relative grid h-11 w-11 place-items-center rounded-lg text-white" style={{ background: `linear-gradient(135deg, ${f.color}, ${rgba(f.color, 0.7)})`, boxShadow: `0 8px 22px ${rgba(f.color, 0.35)}` }}>{f.icon}</div>
                  <h3 className="relative mt-4 font-display text-lg font-bold">{f.title}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed" style={{ color: t.muted }}>{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ---------------- HOW IT WORKS ---------------- */}
        <Section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <Head t={t} accent={accent} kicker="Simple process" title="How it works" sub="Four steps to begin your learning journey." />
          <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-0 right-0 top-7 hidden h-px lg:block" style={{ background: `linear-gradient(90deg, transparent, ${t.border}, transparent)` }} />
            {STEPS.map((s, i) => (
              <motion.div key={s.title} custom={i} variants={rise} className="relative text-center">
                <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-xl" style={{ background: t.bg, border: `1px solid ${t.border}`, color: accent, boxShadow: `0 8px 30px ${rgba(accent, 0.18)}` }}>
                  {s.icon}
                  <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: accent }}>{i + 1}</span>
                </div>
                <h3 className="mt-5 font-display text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: t.muted }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ---------------- TESTIMONIALS ---------------- */}
        {testimonials.length > 0 && (
          <Section className="border-y" style={{ borderColor: t.border, background: t.panel }}>
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
              <Head t={t} accent={accent} kicker="Student stories" title="What learners say" sub="Real words from people who studied with us." />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {testimonials.map((tm, i) => (
                  <motion.figure key={i} custom={i} variants={rise} className="rounded-xl border p-6" style={{ borderColor: t.border, background: t.bg }}>
                    <div className="text-base tracking-tight" style={{ color: accent }}>★★★★★</div>
                    <blockquote className="mt-3 text-sm leading-relaxed">{tm.text}</blockquote>
                    <figcaption className="mt-4 text-sm font-semibold" style={{ color: t.muted }}>— {tm.name}</figcaption>
                  </motion.figure>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* ---------------- CONNECT ---------------- */}
        {socialList.length > 0 && (
          <Section id="connect" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
            <Head t={t} accent={accent} kicker="Community" title={`Stay connected with ${name}`} sub="Follow along for free resources, live updates and exclusive offers." />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {socialList.map(([k, url], i) => (
                <motion.a key={k} custom={i} variants={rise} href={url} target="_blank" rel="noreferrer"
                  className="group rounded-xl border p-6 transition-all hover:-translate-y-1" style={{ borderColor: t.border, background: t.panel }}>
                  <SocialIcon name={k} size={38} className="rounded-lg" />
                  <div className="mt-4 font-display text-lg font-bold">{socialLabel(k)}</div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: accent }}>Follow now {IC.arrow}</div>
                </motion.a>
              ))}
            </div>
          </Section>
        )}

        {/* ---------------- CTA ---------------- */}
        <Section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
          <motion.div variants={rise} className="relative overflow-hidden rounded-2xl border px-6 py-16 text-center text-white sm:px-12"
            style={{ borderColor: "rgba(255,255,255,0.1)", background: `radial-gradient(120% 130% at 0% 0%, ${rgba(accent, 0.9)} 0%, transparent 52%), radial-gradient(120% 130% at 100% 100%, ${rgba("#a855f7", 0.85)} 0%, transparent 52%), #0a0a16` }}>
            {/* soft grid + glow + grain */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)`, backgroundSize: "44px 44px", maskImage: "radial-gradient(ellipse 70% 80% at 50% 50%, #000, transparent)" }} />
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-[36rem] max-w-full -translate-x-1/2 rounded-full blur-3xl" style={{ background: rgba(accent, 0.5) }} />
            <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: NOISE, mixBlendMode: "overlay", opacity: 0.08 }} />
            <span className="relative inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider">Get started</span>
            <h2 className="relative mt-5 font-display text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">Start learning with {name} today</h2>
            <p className="relative mx-auto mt-3 max-w-lg text-white/85">Join thousands of learners and get instant access to expert-led content.</p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <button onClick={() => scrollTo("courses")} className="rounded-lg bg-white px-7 py-3.5 text-sm font-bold text-[#0e1020] hover:opacity-90">Browse courses</button>
              <Link href="/login" className="rounded-lg border border-white/40 px-7 py-3.5 text-sm font-bold hover:bg-white/10">Login / Sign up</Link>
            </div>
          </motion.div>
        </Section>

        {/* ---------------- FOOTER ---------------- */}
        <footer className="border-t" style={{ borderColor: t.border, background: t.panel }}>
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.3fr]">
              <div>
                <div className="flex items-center gap-3">
                  {avatar
                    ? <img src={avatar} alt="" className="h-11 w-11 rounded-lg object-cover" />
                    : <span className="grid h-11 w-11 place-items-center rounded-lg font-bold text-white" style={{ background: accent }}>{name[0]}</span>}
                  <span className="font-display text-xl font-bold">{name}</span>
                </div>
                {bio && <p className="mt-4 max-w-xs text-sm" style={{ color: t.muted }}>{bio}</p>}
                {socialList.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    {socialList.map(([k, url]) => (
                      <a key={k} href={url} target="_blank" rel="noreferrer" aria-label={socialLabel(k)} className="grid h-10 w-10 place-items-center rounded-lg border transition-transform hover:-translate-y-0.5" style={{ borderColor: t.border, background: t.bg }}>
                        <SocialIcon name={k} size={20} className="rounded" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <FooterCol title="Explore" t={t}>
                <button onClick={() => scrollTo("courses")} className="block text-left" style={{ color: t.muted }}>Courses</button>
                <button onClick={() => scrollTo("features")} className="block text-left" style={{ color: t.muted }}>Features</button>
                <button onClick={() => scrollTo("connect")} className="block text-left" style={{ color: t.muted }}>Community</button>
                <Link href={`/${username}`} className="block" style={{ color: t.muted }}>Store</Link>
              </FooterCol>

              <FooterCol title={links.length > 0 ? "Links" : "Account"} t={t}>
                {links.length > 0
                  ? links.slice(0, 5).map((l, i) => <a key={i} href={l.url} target="_blank" rel="noreferrer" className="block" style={{ color: t.muted }}>{l.label || "Link"}</a>)
                  : <>
                      <Link href="/login" className="block" style={{ color: t.muted }}>Login</Link>
                      <Link href="/signup" className="block" style={{ color: t.muted }}>Sign up</Link>
                    </>}
              </FooterCol>

              <div>
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: t.muted }}>Ready to start?</div>
                <p className="mt-3 text-sm" style={{ color: t.muted }}>Create your free account and start learning today.</p>
                <Link href="/login" className="mt-4 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white" style={{ background: accent }}>Get started {IC.arrow}</Link>
              </div>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-6 text-xs" style={{ borderColor: t.border, color: t.muted }}>
              <span>© {new Date().getFullYear()} {name}. All rights reserved.</span>
              <span>Built with <Link href="/" className="font-semibold" style={{ color: t.text }}>SuperCreators</Link></span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Section({ children, className = "", id, style }) {
  return <motion.section id={id} className={className} style={style} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}>{children}</motion.section>;
}
function Head({ t, accent, kicker, title, sub }) {
  return (
    <motion.div variants={rise} className="mb-12 text-center">
      <span className="inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider" style={{ borderColor: t.border, background: t.chip, color: accent }}>{kicker}</span>
      <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl md:text-[2.7rem]">{title}</h2>
      <p className="mx-auto mt-3 max-w-lg" style={{ color: t.muted }}>{sub}</p>
    </motion.div>
  );
}
function Stat({ value, label, t, accent }) {
  return (
    <div>
      <div className="font-display text-2xl font-extrabold sm:text-3xl" style={accent ? { color: accent } : undefined}>{value}</div>
      <div className="text-xs" style={{ color: t.muted }}>{label}</div>
    </div>
  );
}
function FooterCol({ title, t, children }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: t.muted }}>{title}</div>
      <div className="mt-3 space-y-2 text-sm">{children}</div>
    </div>
  );
}
