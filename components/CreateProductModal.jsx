"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// =============================================================
// CreateProductModal — the picker that opens from "Create a product".
//
// Only lists product types this app actually ships (no "Recurring
// Membership" — we don't have it). Each tile routes to the real builder.
// Animated in with framer-motion: backdrop fades, card springs up.
// =============================================================

const PRODUCTS = [
  {
    id: "book",
    title: "Sell Digital Files",
    desc: "Sell e-books, PDFs, images, videos and more.",
    href: "/dashboard/books",
    emoji: "📁",
    tint: "#FFF1E0"
  },
  {
    id: "booking",
    title: "Offer 1-on-1 Session",
    desc: "Set up a new 1-on-1 session for your audience.",
    href: "/dashboard/bookings",
    emoji: "🚀",
    tint: "#F1E9FF"
  },
  {
    id: "course",
    title: "Sell a course",
    desc: "Sell access to your video collection or online classes.",
    href: "/dashboard/courses",
    emoji: "🏅",
    tint: "#FFF7DC"
  },
  {
    id: "event",
    title: "Host Event or Webinar",
    desc: "Sell live event tickets, coaching appointments, or classes.",
    href: "/dashboard/events",
    emoji: "📅",
    tint: "#FFE9E9"
  },
  {
    id: "locked",
    title: "Locked Content",
    desc: "Lock any file for a price. Visitors unlock to access.",
    href: "/dashboard/locked",
    emoji: "🔒",
    tint: "#FDE7EC"
  },
  {
    id: "payment",
    title: "Take any Payment",
    desc: "Share a link and get paid for anything, your way.",
    href: "/dashboard/pages",
    emoji: "💳",
    tint: "#E7F1FF"
  }
];

export default function CreateProductModal({ open, onClose }) {
  const router = useRouter();

  // Close on Escape, and lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const go = (href) => { onClose(); router.push(href); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

          <motion.div
            role="dialog" aria-modal="true" aria-label="Create a product"
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* close button floats top-right, like the reference */}
            <button
              onClick={onClose} aria-label="Close"
              className="absolute -top-2 right-3 z-10 flex h-8 w-8 -translate-y-full items-center justify-center rounded-full bg-white text-inkmuted shadow-md hover:text-ink sm:right-4"
            >
              ✕
            </button>

            <div className="p-6 sm:p-7">
              <h2 className="font-display text-xl font-bold">Create a product</h2>
              <p className="mt-0.5 text-sm text-inkmuted">Make money by selling products and services</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {PRODUCTS.map((p, i) => (
                  <motion.button
                    key={p.id}
                    onClick={() => go(p.href)}
                    className="flex items-start gap-4 rounded-xl border border-line p-4 text-left transition-colors hover:border-brand/50 hover:bg-paper/60"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.035, duration: 0.2 }}
                  >
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                      style={{ background: p.tint }}
                    >
                      {p.emoji}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold leading-snug">{p.title}</span>
                      <span className="mt-0.5 block text-sm leading-snug text-inkmuted">{p.desc}</span>
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}