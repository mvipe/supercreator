"use client";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

// =============================================================
// Public-page branding.
//
//   <MadeWithBadge />   floating bottom-left pill  — store pages
//   <BuiltWithLink />   quiet top-right link       — product/checkout pages
//   <BrandMark />       the lockup on its own
// =============================================================

/** The bolt + "SuperCreators" lockup. */
export function BrandMark({ size = "sm", light = false }) {
  const text = size === "lg" ? "text-base" : "text-[13px]";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex items-center justify-center rounded-md"
        style={{
          width: size === "lg" ? 22 : 18,
          height: size === "lg" ? 22 : 18,
          background: "linear-gradient(135deg,#2E6EF7,#7C3AED)"
        }}
      >
        <svg width={size === "lg" ? 13 : 11} height={size === "lg" ? 13 : 11} viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
          <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" />
        </svg>
      </span>
      <span className={`${text} leading-none ${light ? "text-white" : "text-ink"}`}>
        <span className="font-medium opacity-80">{BRAND.namePrefix}</span>
        <span className="font-extrabold">{BRAND.nameSuffix}</span>
      </span>
    </span>
  );
}

/**
 * Floating "Made with SuperCreators" pill, bottom-left of a store.
 * Fixed + high z-index so themed backgrounds can't swallow it, and
 * pointer-events only on the pill itself.
 */
export function MadeWithBadge({ href = BRAND.url }) {
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-40">
      <Link
        href={href}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/95 py-1.5 pl-3 pr-3.5 text-[13px] shadow-lg backdrop-blur-sm transition-transform hover:scale-[1.03]"
      >
        <span className="text-inkmuted">Made with</span>
        <BrandMark />
      </Link>
    </div>
  );
}

/** Understated "Built with ♥ on SuperCreators" — product & checkout pages. */
export function BuiltWithLink({ light = true, className = "" }) {
  return (
    <Link
      href={BRAND.url}
      className={`inline-flex items-center gap-1.5 text-[13px] transition-opacity hover:opacity-100 ${light ? "text-white/75" : "text-inkmuted"} ${className}`}
    >
      <span>Built with</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 21s-7.5-4.7-9.3-9A5.3 5.3 0 0 1 12 6.5 5.3 5.3 0 0 1 21.3 12c-1.8 4.3-9.3 9-9.3 9Z" />
      </svg>
      <span>on</span>
      <span className="font-semibold">
        {BRAND.namePrefix}<span className="font-extrabold">{BRAND.nameSuffix}</span>
      </span>
    </Link>
  );
}

/** Creator chip for the top-left of a product page (avatar + name). */
export function CreatorChip({ name, avatar, light = true }) {
  if (!name && !avatar) return null;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 backdrop-blur-sm ${light ? "bg-white/12 text-white" : "bg-black/5 text-ink"}`}>
      <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/20">
        {avatar
          ? <img src={avatar} alt="" className="h-full w-full object-cover" />
          : <span className="flex h-full w-full items-center justify-center text-xs font-bold">{(name || "?")[0]?.toUpperCase()}</span>}
      </span>
      <span className="max-w-[180px] truncate text-sm font-semibold">{name}</span>
    </span>
  );
}