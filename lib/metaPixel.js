// Meta (Facebook) Pixel helpers — client only.
//
// Creators paste their Pixel ID in Course → Settings → Tracking. These helpers:
//   • clean whatever they pasted (bare ID, ID with spaces, or the whole Meta
//     snippet) down to the numeric ID — and never inject anything else into
//     the page, so a bad value can't run script on our domain;
//   • load fbevents.js once, init each pixel once, and work across client-side
//     navigation (next/script with a fixed id only ever runs one time);
//   • send events only to THAT creator's pixel (trackSingle), so if a visitor
//     browses two creators' pages in one session, events don't leak across.

const loaded = new Set();

/** Pull a valid Pixel ID out of whatever was pasted. Returns "" if none. */
export function cleanPixelId(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  // Full snippet pasted: fbq('init', '1234567890')
  const m = s.match(/fbq\(\s*['"]init['"]\s*,\s*['"]?(\d{8,20})/);
  if (m) return m[1];
  const digits = s.replace(/[\s-]/g, "");
  if (/^\d{8,20}$/.test(digits)) return digits;
  // Last resort: first long run of digits (e.g. "Pixel ID: 1234…")
  const run = s.match(/\d{12,20}/);
  return run ? run[0] : "";
}

function ensureBase() {
  if (typeof window === "undefined") return false;
  if (window.fbq) return true;
  /* eslint-disable */
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s)
  }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  return true;
}

/** Load + init a pixel (once per ID per tab). Returns the clean ID or "". */
export function initPixel(raw) {
  const id = cleanPixelId(raw);
  if (!id || !ensureBase()) return "";
  if (!loaded.has(id)) {
    window.fbq("init", id);
    loaded.add(id);
  }
  return id;
}

/** Fire a standard event on one pixel only. Safe to call with "" (no-op). */
export function track(id, event, params = {}, eventId) {
  if (!id || typeof window === "undefined" || !window.fbq) return;
  try {
    if (eventId) window.fbq("trackSingle", id, event, params, { eventID: String(eventId) });
    else window.fbq("trackSingle", id, event, params);
  } catch { /* tracking must never break checkout */ }
}

/** Standard course payload Meta uses for catalogue / ROAS reporting. */
export function courseParams(course, value) {
  return {
    content_ids: [String(course.id)],
    content_name: course.title || "",
    content_type: "product",
    content_category: "course",
    value: Math.max(0, Number(value) || 0),
    currency: "INR"
  };
}
