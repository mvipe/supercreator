// =============================================================
// SuperCreators — public cloud links (Google Drive / Docs / Dropbox) as an
// alternative to uploading a file. Works on server and client.
//
// Creators paste the normal "Share → Copy link" URL; we turn it into the
// right URL for wherever it's used:
//   image   -> a direct image URL usable in <img>
//   preview -> an embeddable viewer URL (video / audio / PDF / docs)
//   file    -> the clean share link (for buyers to open/download)
//
// The file must be shared as "Anyone with the link → Viewer".
// =============================================================

/** Google Drive / Docs file id from any of its URL shapes, or null. */
export function driveId(url) {
  const s = String(url || "");
  if (!/(?:drive|docs)\.google\.com/i.test(s)) return null;
  const m = s.match(/\/d\/([\w-]{10,})/) || s.match(/[?&]id=([\w-]{10,})/);
  return m ? m[1] : null;
}

/** "document" | "spreadsheets" | "presentation" | "forms" | null */
export function googleDocKind(url) {
  const m = String(url || "").match(/docs\.google\.com\/(document|spreadsheets|presentation|forms)\//i);
  return m ? m[1].toLowerCase() : null;
}

export const isDriveUrl = (url) => !!driveId(url);
export const isDropboxUrl = (url) => /^https:\/\/(www\.)?dropbox\.com\//i.test(String(url || "")) || /dl\.dropboxusercontent\.com/i.test(String(url || ""));
export const isHttpUrl = (url) => /^https?:\/\/\S+$/i.test(String(url || "").trim());

/** Direct, <img>-friendly URL for a shared image. */
export function toImageUrl(url) {
  const id = driveId(url);
  if (id && !googleDocKind(url)) return `https://lh3.googleusercontent.com/d/${id}=w2000`;
  if (isDropboxUrl(url)) return withDropboxParam(url, "raw", "1");
  return String(url || "").trim();
}

/** Embeddable viewer (Drive's own player/viewer). Null if not a Drive link. */
export function toPreviewUrl(url) {
  const id = driveId(url);
  if (!id) return null;
  const kind = googleDocKind(url);
  if (kind === "document") return `https://docs.google.com/document/d/${id}/preview`;
  if (kind === "spreadsheets") return `https://docs.google.com/spreadsheets/d/${id}/preview`;
  if (kind === "presentation") return `https://docs.google.com/presentation/d/${id}/embed`;
  if (kind === "forms") return `https://docs.google.com/forms/d/${id}/viewform?embedded=true`;
  return `https://drive.google.com/file/d/${id}/preview`;
}

/** Direct download URL (best effort — Drive shows a warning page for big files). */
export function toDownloadUrl(url) {
  const id = driveId(url);
  if (id && !googleDocKind(url)) return `https://drive.google.com/uc?export=download&id=${id}`;
  if (isDropboxUrl(url)) return withDropboxParam(url, "dl", "1");
  return String(url || "").trim();
}

/** Clean share link for a file (what a buyer opens). */
export function toShareUrl(url) {
  const id = driveId(url);
  if (id && !googleDocKind(url)) return `https://drive.google.com/file/d/${id}/view`;
  return String(url || "").trim();
}

function withDropboxParam(url, key, val) {
  try {
    const u = new URL(url);
    u.searchParams.delete("dl"); u.searchParams.delete("raw");
    u.searchParams.set(key, val);
    return u.toString();
  } catch { return url; }
}

/**
 * Validate + normalise a pasted link for a given use.
 * @param {string} url
 * @param {"image"|"video"|"audio"|"file"|"doc"} kind
 * @returns {{ ok: true, url: string } | { ok: false, error: string }}
 */
export function normalizeLink(url, kind = "file") {
  const raw = String(url || "").trim();
  if (!raw) return { ok: false, error: "Paste a link first." };
  if (!isHttpUrl(raw)) return { ok: false, error: "That doesn't look like a link — it should start with https://" };
  if (/drive\.google\.com\/drive\/(u\/\d+\/)?folders\//i.test(raw)) {
    return { ok: false, error: "That's a folder link. Open the file itself and use Share → Copy link." };
  }
  if (kind === "image") return { ok: true, url: toImageUrl(raw) };
  if (kind === "file" || kind === "doc") return { ok: true, url: toShareUrl(raw) };
  return { ok: true, url: raw }; // video / audio keep the original; players resolve it
}

/** Best-guess display name for a link. */
export function linkLabel(url) {
  const s = String(url || "");
  if (googleDocKind(s)) return `Google ${googleDocKind(s).replace("spreadsheets", "Sheet").replace("document", "Doc").replace("presentation", "Slides").replace("forms", "Form")}`;
  if (driveId(s)) return "Google Drive file";
  if (isDropboxUrl(s)) { try { return decodeURIComponent(new URL(s).pathname.split("/").pop()) || "Dropbox file"; } catch { return "Dropbox file"; } }
  try { const u = new URL(s); return decodeURIComponent(u.pathname.split("/").pop() || u.hostname); } catch { return "Link"; }
}
