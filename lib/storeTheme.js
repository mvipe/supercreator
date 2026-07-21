// Shared theme definitions for the Store builder + public store page.
import { texturedBackground } from "@/lib/texture";

// `dark` drives which way the texture blends (overlay vs multiply).
export const THEMES = {
  classic:  { name: "Classic",  dark: true,  bg: "linear-gradient(165deg,#101114 0%, #2a0c0c 42%, #7f1d1d 78%, #b91c1c 100%)", card: "#141417", text: "#ffffff", sub: "rgba(255,255,255,0.72)", btn: "#000000", btnText: "#ffffff", btnBorder: "rgba(255,255,255,0.15)" },
  ocean:    { name: "Ocean",    dark: true,  bg: "linear-gradient(165deg,#0b1e3f 0%, #12305f 45%, #1d4ed8 82%, #2E6EF7 100%)", card: "#0e2246", text: "#ffffff", sub: "rgba(255,255,255,0.72)", btn: "#ffffff", btnText: "#0b1e3f", btnBorder: "transparent" },
  sunset:   { name: "Sunset",   dark: true,  bg: "linear-gradient(165deg,#2b1055 0%, #6d28d9 45%, #db2777 80%, #f97316 100%)", card: "#2b1055", text: "#ffffff", sub: "rgba(255,255,255,0.75)", btn: "#ffffff", btnText: "#2b1055", btnBorder: "transparent" },
  forest:   { name: "Forest",   dark: true,  bg: "linear-gradient(165deg,#052e2b 0%, #0e5c4a 50%, #059669 82%, #10b981 100%)", card: "#063b33", text: "#ffffff", sub: "rgba(255,255,255,0.72)", btn: "#ffffff", btnText: "#063b33", btnBorder: "transparent" },
  mono:     { name: "Mono",     dark: true,  bg: "linear-gradient(165deg,#0a0a0a 0%, #1c1c1c 55%, #2c2c2c 100%)", card: "#141414", text: "#ffffff", sub: "rgba(255,255,255,0.65)", btn: "#ffffff", btnText: "#000000", btnBorder: "transparent" },
  paper:    { name: "Paper",    dark: false, bg: "linear-gradient(165deg,#f7f9fc 0%, #eef2f7 55%, #dbe4f0 100%)", card: "#ffffff", text: "#121417", sub: "rgba(18,20,23,0.6)", btn: "#121417", btnText: "#ffffff", btnBorder: "rgba(18,20,23,0.12)" }
};

export const FONTS = ["Inter", "Bricolage Grotesque", "Hind Madurai", "Poppins", "Space Grotesk"];

export function getTheme(id) { return THEMES[id] || THEMES.classic; }

// Apply the creator's brand color as an override on the primary button, when set.
export function themeWithBrand(id, brandColor) {
  const t = { ...getTheme(id) };
  if (brandColor) { t.btn = brandColor; t.btnText = "#ffffff"; t.btnBorder = "transparent"; }
  return t;
}

/**
 * Style object for a themed surface, with grain + mesh texture layered over
 * the theme gradient. Spread this instead of using `background: t.bg`.
 *
 *   <div style={{ ...themeSurface(t) }} />
 *
 * `strength` scales the texture — use ~0.7 inside the small phone preview so
 * the grain doesn't look oversized at that scale.
 */
export function themeSurface(theme, { strength = 1 } = {}) {
  const t = typeof theme === "string" ? getTheme(theme) : (theme || getTheme("classic"));
  return texturedBackground(t.bg, { dark: t.dark !== false, strength });
}