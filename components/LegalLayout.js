"use client";
/**
 * Shared shell for SuperCreators legal / info pages.
 * Matches the landing page design tokens exactly.
 *
 * Usage:
 *   <LegalLayout title="Terms of Service" updated="23 July 2026" intro="...">
 *     <Section title="1. Something">...</Section>
 *   </LegalLayout>
 */
import Link from "next/link";
import { Fraunces, Inter, Lexend } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";

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

export const T = {
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
/* Reusable content primitives                                       */
/* ---------------------------------------------------------------- */
export function Section({ title, children }) {
  return (
    <section className="mt-10 scroll-mt-28">
      {title && (
        <h2
          className="text-xl font-bold md:text-2xl"
          style={{ fontFamily: "var(--font-display)", color: T.ink }}
        >
          {title}
        </h2>
      )}
      <div
        className="mt-3 space-y-4 text-[15px] leading-relaxed"
        style={{ color: T.inkmuted }}
      >
        {children}
      </div>
    </section>
  );
}

export function Bullets({ items }) {
  return (
    <ul className="space-y-2 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span
            className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: T.brand }}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Callout({ children }) {
  return (
    <div
      className="rounded-2xl border p-5 text-[15px] leading-relaxed"
      style={{
        borderColor: T.line,
        background: T.brandTint,
        color: T.brandDeep,
      }}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Nav                                                               */
/* ---------------------------------------------------------------- */
function Nav() {
  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{ borderColor: T.line, background: "rgba(255,255,255,0.75)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="text-xl font-bold"
          style={{ fontFamily: "var(--font-headline)", color: T.ink }}
        >
          Super<span style={{ color: T.brand }}>Creators</span>
        </Link>
        <Link
          href="/"
          className="rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
          style={{ background: T.ink }}
        >
          Back to home
        </Link>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------- */
/* Footer (shared — same markup as landing page)                     */
/* ---------------------------------------------------------------- */
export function SiteFooter() {
  const links = [
    ["Terms of Service", "/terms"],
    ["Privacy Policy", "/privacy"],
    ["Contact Us", "/contact"],
    ["Disclaimer", "/disclaimer"],
  ];

  return (
    <footer className="border-t px-6 py-10" style={{ borderColor: T.line }}>
      <div
        className="mx-auto flex max-w-6xl flex-col gap-6 text-sm"
        style={{ color: T.inkmuted }}
      >
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Link
            href="/"
            className="font-bold"
            style={{ fontFamily: "var(--font-headline)", color: T.ink }}
          >
            Super<span style={{ color: T.brand }}>Creators</span>
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="transition-colors hover:underline"
                style={{ color: T.inkmuted }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div
          className="border-t pt-6 text-center sm:text-left"
          style={{ borderColor: T.line }}
        >
          © {new Date().getFullYear()} SuperCreators. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

/* ---------------------------------------------------------------- */
/* Layout                                                            */
/* ---------------------------------------------------------------- */
export default function LegalLayout({ title, updated, intro, children }) {
  const reduce = useReducedMotion();

  return (
    <main
      className={`${fraunces.variable} ${inter.variable} ${lexend.variable} min-h-screen`}
      style={{ background: T.paper, fontFamily: "var(--font-body)" }}
    >
      <Nav />

      {/* Header band */}
      <section
        className="relative overflow-hidden border-b px-6 py-16 md:py-20"
        style={{
          borderColor: T.line,
          backgroundImage: `radial-gradient(${T.line} 1px, transparent 1px)`,
          backgroundSize: "22px 22px",
          backgroundPosition: "-11px -11px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.6, ease }}
          className="mx-auto max-w-3xl"
        >
          {updated && (
            <span
              className="mb-5 inline-block rounded-full border bg-white px-3 py-1 text-xs font-semibold"
              style={{ borderColor: T.line, color: T.inkmuted }}
            >
              Last updated · {updated}
            </span>
          )}
          <h1
            className="text-4xl font-bold leading-[1.08] md:text-5xl"
            style={{ fontFamily: "var(--font-headline)", color: T.ink }}
          >
            {title}
          </h1>
          {intro && (
            <p className="mt-5 text-lg" style={{ color: T.inkmuted }}>
              {intro}
            </p>
          )}
        </motion.div>
      </section>

      {/* Body */}
      <motion.article
        initial={{ opacity: 0, y: reduce ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : 0.12, ease }}
        className="mx-auto max-w-3xl px-6 pb-24 pt-4"
      >
        {children}
      </motion.article>

      <SiteFooter />
    </main>
  );
}