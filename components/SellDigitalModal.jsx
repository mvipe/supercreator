"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { PRODUCT_DEFAULTS } from "@/lib/products";

// =============================================================
// SellDigitalModal — "What do you want to sell?"
//
// Opens from the home page's "Sell Digital Products" card. Three routes:
//
//   Digital Products      one file / e-book → the Book builder
//   List Multiple Products a storefront-style page → the creator's store
//   Existing Product      attach something already published to a new page
//
// "Existing Product" is only enabled once the creator actually HAS a
// published product — an always-clickable tile that leads to an empty list
// is worse than a disabled one that explains itself.
// =============================================================

const IconFile = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
    <path d="M12 11v5m0 0-2.2-2.2M12 16l2.2-2.2" />
  </svg>
);
const IconRows = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="5" width="18" height="6" rx="2" /><rect x="3" y="13" width="18" height="6" rx="2" />
  </svg>
);
const IconSwap = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
  </svg>
);

export default function SellDigitalModal({ open, onClose }) {
  const r = useRouter();
  const { user, ownerId } = useAuth();
  const [busy, setBusy] = useState(null);       // which tile is working
  const [existing, setExisting] = useState(null); // null = still counting
  const [err, setErr] = useState("");

  // Escape to close + body scroll lock.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  // How many published things could be re-used on a new page?
  useEffect(() => {
    if (!open || !ownerId) return;
    let alive = true;
    (async () => {
      const [{ data: products }, { data: courses }] = await Promise.all([
        supabase.from("mp_products").select("id, type, title, slug").eq("owner_id", ownerId).eq("status", "published"),
        supabase.from("mp_courses").select("id, title, slug").eq("owner_id", ownerId).eq("status", "published")
      ]);
      if (!alive) return;
      setExisting([
        ...(courses || []).map((c) => ({ ...c, type: "course" })),
        ...(products || [])
      ]);
    })();
    return () => { alive = false; };
  }, [open, ownerId]);

  /** Create a fresh digital-file product and drop the creator into its editor. */
  async function createDigital() {
    if (!ownerId) return;
    setBusy("digital"); setErr("");
    try {
      const d = PRODUCT_DEFAULTS.book;
      const { data, error } = await supabase.from("mp_products")
        .insert({ owner_id: ownerId, type: "book", title: d.title, status: "draft", data: d.data })
        .select("id").single();
      if (error) throw error;
      onClose();
      r.push(`/studio/book/${data.id}`);
    } catch (e) {
      setErr(e.message); setBusy(null);
    }
  }

  const go = (href) => { onClose(); r.push(href); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto overscroll-contain p-4 pt-12 sm:items-center sm:pt-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          <motion.div
            role="dialog" aria-modal="true" aria-label="What do you want to sell?"
            className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="font-display text-lg font-bold">What do you want to sell?</h2>
              <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-inkmuted hover:bg-paper hover:text-ink">✕</button>
            </div>

            <div className="space-y-3 p-5 sm:p-6">
              <Tile
                tint="#E3F7EC" color="#0E9F6E" icon={<IconFile className="h-6 w-6" />}
                title="Digital Products" desc="Sell images, videos, music, docs, and more."
                busy={busy === "digital"} onClick={createDigital}
              />
              <Tile
                tint="#E5EFFF" color="#2E6EF7" icon={<IconRows className="h-6 w-6" />}
                title="List Multiple Products" desc="Offer an e-commerce style experience"
                onClick={() => go("/dashboard/store")}
              />
              <Tile
                tint="#FCE7F0" color="#D9498B" icon={<IconSwap className="h-6 w-6" />}
                title="Existing Product"
                desc={existing === null
                  ? "Checking what you've already published…"
                  : existing.length
                    ? `Give access to one of your ${existing.length} published product${existing.length === 1 ? "" : "s"}.`
                    : "Publish a product first — then you can reuse it here."}
                disabled={!existing?.length}
                onClick={() => {
                  // Land on the hub for whatever they already sell most of.
                  const first = existing[0];
                  go(first.type === "course"
                    ? `/dashboard/courses`
                    : `/studio/${first.type}/${first.id}`);
                }}
              />
              {err && <p className="text-sm text-danger">{err}</p>}
              <p className="pt-1 text-center text-xs text-inkmuted">
                Looking for courses, events or payment links?{" "}
                <button onClick={() => go("/dashboard/courses")} className="font-semibold text-brand hover:underline">See all product types</button>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Tile({ tint, color, icon, title, desc, onClick, disabled, busy }) {
  return (
    <button
      type="button"
      onClick={disabled || busy ? undefined : onClick}
      disabled={disabled || busy}
      className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${
        disabled
          ? "cursor-not-allowed border-line bg-paper/50 opacity-60"
          : "border-line hover:-translate-y-px hover:border-brand/50 hover:shadow-sm"
      }`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: tint, color }}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-bold leading-snug">{busy ? "Creating…" : title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-inkmuted">{desc}</span>
      </span>
    </button>
  );
}
