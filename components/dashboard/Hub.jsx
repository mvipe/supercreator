"use client";
import Link from "next/link";
import { inr } from "@/lib/courseModel";
import { heroSurface, SHEEN } from "@/lib/texture";

/** Textured hero with stats — shared by product hub pages. */
export function StatsHero({ title, subtitle, cta, onCta, stats, banner, tone }) {
  return (
    <section className="relative overflow-hidden px-8 pb-14 pt-8 text-white" style={heroSurface(tone)}>
      {banner && (
        <div className="relative z-10 -mx-8 -mt-8 mb-6 bg-[#1E2530] px-8 py-2.5 text-center text-sm text-white/85">{banner}</div>
      )}
      {/* decorative sheen + vignette so the surface has depth, not a flat ramp */}
      <div className="pointer-events-none absolute inset-0" style={SHEEN} />
      <div className="pointer-events-none absolute -right-24 top-6 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-white/5 blur-3xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold drop-shadow-sm">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-white/75">{subtitle}</p>}
        </div>
        {cta && <button onClick={onCta} className="btn bg-white text-ink hover:bg-white/90">+ {cta}</button>}
      </div>
      {stats && (
        <div className="relative mt-8 grid gap-4 sm:grid-cols-3">
          {stats.map(([l, v]) => (
            <div key={l} className="rounded-card bg-white p-5 text-ink shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-inkmuted">{l}</div>
              <div className="mt-1 font-display text-3xl font-bold">{v}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function StatusTabs({ tabs, tab, setTab, counts }) {
  return (
    <div className="flex gap-2">
      {tabs.map((t) => (
        <button key={t} onClick={() => setTab(t)}
          className={`rounded-full border px-4 py-2 text-sm font-semibold capitalize ${tab === t ? "border-ink bg-ink text-white" : "border-line bg-white text-inkmuted hover:text-ink"}`}>
          {t} ({counts[t] || 0})
        </button>
      ))}
    </div>
  );
}

export function RowMenu({ open, onToggle, children }) {
  return (
    <div className="relative text-right">
      <button onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="rounded-lg px-2 py-1 text-inkmuted hover:bg-paper hover:text-ink">⋮</button>
      {open && (
        <div onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-card border border-line bg-white text-left shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

export function priceLabel(p) { return p === 0 ? "Free" : inr(p); }