// =============================================================
// MegaProfile — analytics helpers.
//
// Pure functions shared by the tracker (write path) and the analytics API
// (read path), so a visit is classified the same way going in and coming out.
// =============================================================

/* ---------------- referrers ---------------- */

// host fragment -> friendly source name. Order matters: first match wins.
const SOURCE_RULES = [
  [/(^|\.)instagram\.com$|(^|\.)ig\.me$|(^|\.)l\.instagram\.com$/, "Instagram"],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, "YouTube"],
  [/(^|\.)facebook\.com$|(^|\.)fb\.me$|(^|\.)fb\.com$|(^|\.)l\.facebook\.com$/, "Facebook"],
  [/(^|\.)twitter\.com$|(^|\.)x\.com$|(^|\.)t\.co$/, "Twitter"],
  [/(^|\.)whatsapp\.com$|(^|\.)wa\.me$/, "WhatsApp"],
  [/(^|\.)t\.me$|(^|\.)telegram\.me$|(^|\.)telegram\.org$/, "Telegram"],
  [/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/, "LinkedIn"],
  [/(^|\.)google\./, "Google"],
  [/(^|\.)bing\.com$|(^|\.)duckduckgo\.com$|(^|\.)search\.yahoo\.com$/, "Search"],
  [/(^|\.)reddit\.com$/, "Reddit"],
  [/(^|\.)snapchat\.com$/, "Snapchat"],
  [/(^|\.)pinterest\./, "Pinterest"],
  [/(^|\.)threads\.net$/, "Threads"],
  [/(^|\.)quora\.com$/, "Quora"],
  [/(^|\.)sharechat\.com$|(^|\.)moj\.video$/, "ShareChat"],
  [/(^|\.)gmail\.com$|(^|\.)mail\.google\.com$|(^|\.)outlook\./, "Email"]
];

/** "https://l.instagram.com/?u=…" -> "l.instagram.com" */
export function hostOf(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Classify a referrer into a source bucket.
 *
 * - no referrer at all  -> "Direct" (typed the link, or an app stripped it)
 * - same site           -> "Direct" (internal navigation isn't a referral)
 * - known host          -> "Instagram" / "YouTube" / …
 * - anything else       -> the bare hostname, so long-tail referrers stay visible
 *
 * `utm` wins when present — that's the creator explicitly tagging a campaign.
 */
export function classifySource(referrer, selfHost = "", utmSource = "") {
  if (utmSource) {
    const u = String(utmSource).trim().toLowerCase();
    const pretty = { ig: "Instagram", instagram: "Instagram", yt: "YouTube", youtube: "YouTube", fb: "Facebook", facebook: "Facebook" };
    return pretty[u] || (u.charAt(0).toUpperCase() + u.slice(1));
  }
  const host = hostOf(referrer);
  if (!host) return "Direct";
  if (selfHost && (host === selfHost.replace(/^www\./, "") || host.endsWith(`.${selfHost}`))) return "Direct";
  for (const [re, name] of SOURCE_RULES) if (re.test(host)) return name;
  return host;
}

/** Brand colour per source, for charts. */
export const SOURCE_COLOR = {
  Instagram: "#E4405F",
  YouTube: "#FF0000",
  Facebook: "#1877F2",
  Twitter: "#0F1419",
  WhatsApp: "#25D366",
  Telegram: "#229ED9",
  LinkedIn: "#0A66C2",
  Google: "#4285F4",
  Search: "#7C3AED",
  Reddit: "#FF4500",
  Snapchat: "#FFFC00",
  Pinterest: "#E60023",
  Threads: "#000000",
  Quora: "#B92B27",
  ShareChat: "#EC1C24",
  Email: "#6B7280",
  Direct: "#2E6EF7",
  Organic: "#93B4FB"
};

const FALLBACK_COLORS = ["#2E6EF7", "#7C3AED", "#EC4899", "#F59E0B", "#10B981", "#06B6D4", "#EF4444", "#8B5CF6"];

export function colorForSource(name, i = 0) {
  return SOURCE_COLOR[name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
}

/* ---------------- devices ---------------- */

/** Coarse device class from a user-agent string. */
export function deviceFromUA(ua = "") {
  const s = String(ua).toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return "Tablet";
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/.test(s)) return "Mobile";
  if (!s) return "Unknown";
  return "Desktop";
}

/** Coarse browser name from a user-agent string. Order matters. */
export function browserFromUA(ua = "") {
  const s = String(ua);
  if (/Edg\//.test(s)) return "Edge";
  if (/OPR\/|Opera/.test(s)) return "Opera";
  if (/SamsungBrowser/.test(s)) return "Samsung";
  if (/Firefox\//.test(s)) return "Firefox";
  if (/Chrome\//.test(s)) return "Chrome";
  if (/Safari\//.test(s)) return "Safari";
  return "Other";
}

/* ---------------- geo ---------------- */

/** "IN" -> 🇮🇳 (regional indicator pair). */
export function flagEmoji(code) {
  const c = String(code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "🌐";
  return String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

const COUNTRY_NAMES = {
  IN: "India", US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia",
  AE: "UAE", SA: "Saudi Arabia", SG: "Singapore", MY: "Malaysia", ID: "Indonesia",
  PK: "Pakistan", BD: "Bangladesh", NP: "Nepal", LK: "Sri Lanka", PH: "Philippines",
  DE: "Germany", FR: "France", IT: "Italy", ES: "Spain", NL: "Netherlands",
  BR: "Brazil", MX: "Mexico", ZA: "South Africa", NG: "Nigeria", KE: "Kenya",
  JP: "Japan", KR: "South Korea", CN: "China", RU: "Russia", TR: "Turkey",
  QA: "Qatar", KW: "Kuwait", OM: "Oman", BH: "Bahrain", NZ: "New Zealand",
  IE: "Ireland", SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland",
  PL: "Poland", PT: "Portugal", CH: "Switzerland", AT: "Austria", BE: "Belgium",
  TH: "Thailand", VN: "Vietnam", EG: "Egypt", IL: "Israel", AR: "Argentina"
};

export function countryName(code) {
  const c = String(code || "").toUpperCase();
  return COUNTRY_NAMES[c] || c || "Unknown";
}

/**
 * Rough country centroids [lat, lng] for the bubble map.
 *
 * Deliberately a small lookup rather than real country polygons: a proper
 * choropleth needs a topojson file plus a mapping library, which is a big
 * dependency for a panel most creators glance at. Bubbles on a graticule read
 * just as well at this size and cost nothing to load.
 */
export const COUNTRY_LATLNG = {
  IN: [22.0, 79.0], US: [39.0, -98.0], GB: [54.0, -2.0], CA: [56.0, -106.0], AU: [-25.0, 134.0],
  AE: [24.0, 54.0], SA: [24.0, 45.0], SG: [1.35, 103.8], MY: [4.2, 102.0], ID: [-2.5, 118.0],
  PK: [30.0, 70.0], BD: [24.0, 90.0], NP: [28.4, 84.1], LK: [7.9, 80.8], PH: [12.9, 121.8],
  DE: [51.2, 10.4], FR: [46.6, 2.2], IT: [42.8, 12.6], ES: [40.0, -3.7], NL: [52.1, 5.3],
  BR: [-10.0, -53.0], MX: [23.6, -102.5], ZA: [-30.6, 22.9], NG: [9.1, 8.7], KE: [0.2, 37.9],
  JP: [36.2, 138.3], KR: [36.5, 127.9], CN: [35.0, 104.0], RU: [61.5, 105.3], TR: [39.0, 35.2],
  QA: [25.3, 51.2], KW: [29.3, 47.5], OM: [21.5, 55.9], BH: [26.0, 50.5], NZ: [-41.0, 174.0],
  IE: [53.4, -8.2], SE: [60.1, 18.6], NO: [60.5, 8.5], DK: [56.3, 9.5], FI: [61.9, 25.7],
  PL: [51.9, 19.1], PT: [39.4, -8.2], CH: [46.8, 8.2], AT: [47.5, 14.6], BE: [50.5, 4.5],
  TH: [15.9, 101.0], VN: [14.1, 108.3], EG: [26.8, 30.8], IL: [31.0, 34.9], AR: [-38.4, -63.6]
};

/** Equirectangular projection -> % of a box, for absolutely-positioned bubbles. */
export function project(lat, lng) {
  return { x: ((Number(lng) + 180) / 360) * 100, y: ((90 - Number(lat)) / 180) * 100 };
}

/* ---------------- ranges ---------------- */

export const RANGES = [
  { id: "yesterday", label: "Yesterday", days: 1 },
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "6m", label: "6 months", days: 182 },
  { id: "1y", label: "1 year", days: 365 },
  { id: "all", label: "Lifetime", days: null },
  { id: "custom", label: "Custom", days: null }
];

export function rangeDays(id) {
  return RANGES.find((r) => r.id === id)?.days ?? 30;
}

/**
 * Bucket size that keeps a chart readable at each range.
 * `custom` picks a bucket from the span (in days) rather than a fixed range id.
 */
export function bucketFor(rangeId, spanDays = null) {
  if (rangeId === "custom") {
    if (spanDays == null) return "day";
    if (spanDays <= 45) return "day";
    if (spanDays <= 200) return "week";
    return "month";
  }
  if (rangeId === "yesterday") return "day";
  if (rangeId === "7d") return "day";
  if (rangeId === "30d") return "day";
  if (rangeId === "6m") return "week";
  return "month"; // 1y + lifetime
}

/* ---------------- geo from request headers ---------------- */

/**
 * Read geo from whatever the host puts in front of us. Platforms differ and
 * some provide nothing at all:
 *   Vercel     -> x-vercel-ip-country / x-vercel-ip-city
 *   Cloudflare -> cf-ipcountry / cf-ipcity
 *   Appwrite / bare Node -> nothing, so geo stays null and the Locations panel
 *   says it has no data instead of inventing some.
 */
export function geoFromHeaders(headers) {
  const h = (k) => headers.get(k) || "";
  const code = (h("x-vercel-ip-country") || h("cf-ipcountry") || h("x-geo-country") || h("x-country-code")).toUpperCase();
  const rawCity = h("x-vercel-ip-city") || h("cf-ipcity") || h("x-geo-city");
  let city = "";
  try { city = rawCity ? decodeURIComponent(rawCity) : ""; } catch { city = rawCity; }
  const valid = /^[A-Z]{2}$/.test(code) && code !== "XX";
  return {
    country_code: valid ? code : null,
    country: valid ? countryName(code) : null,
    city: city || null
  };
}