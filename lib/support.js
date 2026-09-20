// =============================================================
// SuperCreators — how people reach support.
//
// ONE place for the support number and email. The floating WhatsApp button,
// the Contact page and anything added later all read from here, so the number
// can never be changed in one spot and left stale in another.
//
// Deliberately a plain module (no "use client"): a Server Component can't
// read a value out of a client module — it only gets an opaque client
// reference — so the constants have to live outside SupportButton.jsx.
// =============================================================

/** International format, no "+" — this is what wa.me expects. */
export const SUPPORT_PHONE = "919028356526";

/** Human-readable form shown on the page. */
export const SUPPORT_PHONE_DISPLAY = "+91 90283 56526";

/** Ready-made links. */
export const SUPPORT_TEL_HREF = `tel:+${SUPPORT_PHONE}`;
export const supportWhatsAppHref = (message = "Hi SuperCreators team, I need help with my account.") =>
  `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(message)}`;

export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@supercreators.in";
