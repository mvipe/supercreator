// =============================================================
// SuperCreators — shared surface textures.
//
// Flat two-stop CSS gradients read as "default AI slop" and band badly
// on wide headers. Everything here layers real texture on top:
//   1. fractal-noise film grain (inline SVG, no image requests)
//   2. a fine hairline grid
//   3. off-axis colour blobs so the gradient never looks like a ramp
//
// All values are plain CSS strings — drop them into `style={{ ... }}`.
// =============================================================

/** Inline SVG fractal noise -> data URI. `freq` ~0.6-1.0, `op` 0-1. */
export function noiseUrl({ freq = 0.8, octaves = 4, opacity = 0.5, size = 180 } = {}) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
    `<filter id='n' x='0' y='0' width='100%' height='100%'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${octaves}' stitchTiles='stitch' result='t'/>` +
    `<feColorMatrix type='saturate' values='0'/>` +
    `</filter>` +
    `<rect width='${size}' height='${size}' filter='url(#n)' opacity='${opacity}'/>` +
    `</svg>`;
  // encodeURIComponent leaves ' and () alone, so escape both quote characters
  // ourselves and wrap the url() in single quotes. This keeps the data URI in
  // one piece whether it's assigned via CSSOM, serialised by React into a
  // style="..." attribute, or written into raw HTML.
  const enc = encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
  return `url('data:image/svg+xml,${enc}')`;
}

/** Cached defaults so we don't rebuild the same data URI on every render. */
export const GRAIN = noiseUrl({ freq: 0.85, octaves: 4, opacity: 0.5 });
export const GRAIN_SOFT = noiseUrl({ freq: 0.7, octaves: 3, opacity: 0.35, size: 220 });

/** Fine hairline grid, tuned for dark surfaces. */
export function gridLayer(color = "rgba(255,255,255,0.05)", step = 26) {
  return {
    image: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
    size: `${step}px ${step}px, ${step}px ${step}px`
  };
}

/**
 * The dashboard hero surface (Payments, Courses, Events, Books, …).
 * A mesh of off-centre radial blobs + grain + grid instead of one
 * straight linear ramp.
 */
export function heroSurface({ base = "#4F46E5", tint = "#2E6EF7", accent = "#7C3AED", warm = "#EC4899" } = {}) {
  const grid = gridLayer("rgba(255,255,255,0.05)", 28);
  return {
    backgroundColor: base,
    backgroundImage: [
      // grain sits on top and only lightly perturbs luminance
      noiseUrl({ freq: 0.9, octaves: 4, opacity: 0.35 }),
      grid.image,
      // organic mesh blobs — deliberately off-grid so it reads as painted,
      // all `screen`d so they add light instead of muddying the base
      `radial-gradient(85% 115% at 6% -12%, ${hexA(accent, 0.9)} 0%, transparent 58%)`,
      `radial-gradient(65% 95% at 97% 4%, ${hexA(warm, 0.5)} 0%, transparent 55%)`,
      `radial-gradient(110% 120% at 72% 112%, ${hexA(tint, 0.95)} 0%, transparent 62%)`,
      `radial-gradient(95% 100% at 28% 92%, ${hexA("#22D3EE", 0.28)} 0%, transparent 58%)`,
      `linear-gradient(115deg, ${base} 0%, ${tint} 52%, ${accent} 100%)`
    ].join(", "),
    backgroundSize: `180px 180px, ${grid.size}, auto, auto, auto, auto, auto`,
    backgroundBlendMode: "soft-light, normal, screen, screen, screen, screen, normal"
  };
}

/**
 * Aurora/mesh surface in the style of the Events header — bright,
 * blended colour fields rather than a linear ramp.
 */
export function auroraSurface({ a = "#1D4ED8", b = "#22D3EE", c = "#FACC15", d = "#2563EB" } = {}) {
  return {
    backgroundColor: a,
    backgroundImage: [
      GRAIN_SOFT,
      `radial-gradient(75% 95% at 12% 20%, ${hexA(d, 0.95)} 0%, transparent 60%)`,
      `radial-gradient(60% 80% at 48% 12%, ${hexA(c, 0.8)} 0%, transparent 55%)`,
      `radial-gradient(70% 90% at 82% 78%, ${hexA(b, 0.75)} 0%, transparent 58%)`,
      `radial-gradient(90% 110% at 95% 10%, ${hexA(a, 0.9)} 0%, transparent 62%)`,
      `linear-gradient(120deg, ${a} 0%, ${d} 40%, ${b} 75%, ${a} 100%)`
    ].join(", "),
    backgroundSize: "220px 220px, auto, auto, auto, auto, auto",
    backgroundBlendMode: "soft-light, screen, screen, screen, normal, normal"
  };
}

/**
 * Texture layers for a store theme. Returns a background shorthand that
 * sits *over* the theme's own gradient, so themes keep their identity but
 * lose the hard banding.
 */
export function texturedBackground(bg, { dark = true, strength = 1 } = {}) {
  const ink = dark ? "255,255,255" : "18,20,23";
  const grid = gridLayer(`rgba(${ink},${(dark ? 0.04 : 0.035) * strength})`, 24);
  return {
    backgroundImage: [
      noiseUrl({ freq: 0.85, octaves: 4, opacity: (dark ? 0.42 : 0.3) * strength }),
      grid.image,
      // soften the ramp: two wide blobs pull the mid-tones apart
      `radial-gradient(100% 70% at 15% 0%, rgba(${ink},${0.1 * strength}) 0%, transparent 60%)`,
      `radial-gradient(90% 60% at 85% 100%, rgba(${ink},${0.06 * strength}) 0%, transparent 55%)`,
      bg
    ].join(", "),
    backgroundSize: `180px 180px, ${grid.size}, auto, auto, auto`,
    backgroundBlendMode: dark ? "overlay, normal, screen, screen, normal" : "multiply, normal, normal, normal, normal",
    backgroundAttachment: "fixed, scroll, scroll, scroll, scroll"
  };
}

/** #RRGGBB + alpha -> rgba(). Passes through non-hex values untouched. */
export function hexA(hex, a = 1) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex).trim());
  if (!m) return hex;
  const [r, g, b] = [1, 2, 3].map((i) => parseInt(m[i], 16));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * A soft vignette + top sheen you can drop inside any hero as an
 * absolutely-positioned sibling. Purely decorative.
 */
export const SHEEN = {
  backgroundImage:
    "radial-gradient(120% 80% at 50% -20%, rgba(255,255,255,0.18) 0%, transparent 60%)," +
    "radial-gradient(100% 100% at 50% 120%, rgba(0,0,0,0.28) 0%, transparent 65%)",
  pointerEvents: "none"
};
