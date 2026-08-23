// AutoDM rule matching — shared by the live webhook and the dashboard tester,
// so what a creator previews is exactly what fires in production.

/** Lowercase, strip emoji/punctuation, collapse whitespace. */
export function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Does one keyword match this comment under the rule's mode? */
export function keywordHits(commentText, keyword, mode) {
  const c = normalize(commentText);
  const k = normalize(keyword);
  if (!k) return false;
  if (mode === "exact") return c === k;
  // 'contains' — whole-word for single words, substring for phrases, so
  // "link" doesn't fire on "linkedin" but "dm me" still fires mid-sentence.
  if (/\s/.test(k)) return c.includes(k);
  return new RegExp(`(^|\\s)${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(c);
}

/** The keyword that matched, or null. */
export function matchRule(rule, commentText) {
  if (!rule?.active) return null;
  if (rule.match_mode === "any") return "*";
  const keywords = rule.keywords || [];
  for (const k of keywords) {
    if (keywordHits(commentText, k, rule.match_mode)) return k;
  }
  return null;
}

/**
 * First rule that matches. Post-specific rules beat catch-all rules, and
 * within a tier the newest rule wins — so a fresh launch overrides an old
 * evergreen automation without the creator having to disable anything.
 */
export function pickRule(rules, { mediaId, commentText }) {
  const eligible = (rules || []).filter((r) => r.active && (!r.media_id || String(r.media_id) === String(mediaId)));
  const ordered = [
    ...eligible.filter((r) => r.media_id),
    ...eligible.filter((r) => !r.media_id)
  ];
  for (const rule of ordered) {
    const keyword = matchRule(rule, commentText);
    if (keyword) return { rule, keyword };
  }
  return { rule: null, keyword: null };
}

/** Rotate the public comment replies so the feed doesn't look botted. */
export function pickCommentReply(rule) {
  const list = (rule?.comment_replies || []).filter((s) => String(s || "").trim());
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export const DEFAULT_COMMENT_REPLIES = [
  "Sent! Check your DMs 💬",
  "Just dropped it in your inbox 📩",
  "Check your messages — it's there ✅"
];

/** Shared validation for the rules API and the builder UI. */
export function validateRule(input) {
  const errors = [];
  const mode = ["contains", "exact", "any"].includes(input.match_mode) ? input.match_mode : "contains";
  const keywords = (Array.isArray(input.keywords) ? input.keywords : String(input.keywords || "").split(","))
    .map((k) => String(k || "").trim())
    .filter(Boolean)
    .slice(0, 20);

  if (mode !== "any" && keywords.length === 0) errors.push("Add at least one keyword.");
  if (!String(input.dm_text || "").trim() && !String(input.button_url || "").trim()) {
    errors.push("Write the DM message (or add a link to send).");
  }
  if (String(input.dm_text || "").length > 900) errors.push("Keep the DM under 900 characters.");
  if (input.button_url && !/^https?:\/\//i.test(input.button_url)) errors.push("The link must start with http:// or https://");
  if (input.button_url && !String(input.button_label || "").trim()) errors.push("Give the link button a label.");
  if (String(input.button_label || "").length > 20) errors.push("Button labels max out at 20 characters.");

  return { errors, keywords, match_mode: mode };
}
