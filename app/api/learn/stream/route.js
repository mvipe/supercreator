import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyMediaToken } from "@/lib/mediaToken";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "megaprofile-secure";
const CHUNK = 4 * 1024 * 1024; // media is served in ≤4 MB ranges — keeps each request short

// =============================================================
// /api/learn/stream?t=<token> — serves protected course media WITHOUT ever
// exposing a reusable storage URL.
//
// Why: the old flow handed the browser a Supabase signed URL. Anyone could
// copy it from Inspect → Network/Elements, open it in a new tab and
// "Save as" — the download toggle didn't matter.
//
// Now:
//   • the token is minted per learner by /api/learn/media, and expires
//   • the browser must be fetching the file AS media (<video>/<audio>) or
//     via our own script (the PDF viewer) — the Sec-Fetch-Dest header.
//     Opening the link in a tab, "Save link as…", or pasting it into the
//     address bar is a navigation (dest=document) and gets a 403.
//   • it must come from our own pages (Sec-Fetch-Site: same-origin)
//   • no-store, inline, same-origin resource policy
//
// Honest limits: screen recording, and a determined developer replaying the
// exact request with a scripted client before the token expires. The
// watermark on the player covers the first; short tokens limit the second.
// =============================================================

const ALLOWED_DEST = {
  video: ["video", "audio", "empty"],
  audio: ["audio", "video", "empty"],
  pdf: ["empty"],
  file: ["empty"]
};

function deny(msg, status = 403) {
  return new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

function isLegacySafari(ua) {
  // iOS / macOS Safari before 16.4 doesn't send Sec-Fetch-* headers at all.
  return /Safari\//.test(ua) && !/(Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS)\//.test(ua);
}

export async function GET(req) {
  const url = new URL(req.url);
  const tok = verifyMediaToken(url.searchParams.get("t"));
  if (!tok) return deny("This link has expired. Reload the lesson.", 410);

  // ---- where is this request coming from? ----
  const site = req.headers.get("sec-fetch-site");
  const dest = req.headers.get("sec-fetch-dest");
  const ua = req.headers.get("user-agent") || "";
  if (site || dest) {
    if (site && site !== "same-origin") return deny("Not available outside the course player.");
    if (!dest || !(ALLOWED_DEST[tok.kind] || ["empty"]).includes(dest)) {
      return deny("Downloads are disabled for this content.");
    }
  } else if (!isLegacySafari(ua)) {
    // No fetch-metadata headers and not an old Safari = a script / download tool.
    return deny("Downloads are disabled for this content.");
  }

  // ---- fetch from private storage (60 s URL, never leaves the server) ----
  const { data: signed, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(tok.path, 60);
  if (error || !signed?.signedUrl) return deny("File not found.", 404);

  const isMedia = tok.kind === "video" || tok.kind === "audio";
  let range = req.headers.get("range");
  // Cap open-ended / oversized media ranges so every request finishes fast
  // (the player simply asks for the next range).
  if (isMedia && range) {
    const m = range.match(/bytes=(\d+)-(\d*)/);
    if (m) {
      const start = Number(m[1]);
      const end = m[2] ? Math.min(Number(m[2]), start + CHUNK - 1) : start + CHUNK - 1;
      range = `bytes=${start}-${end}`;
    }
  }

  const upstream = await fetch(signed.signedUrl, { headers: range ? { Range: range } : {} });
  if (!upstream.ok && upstream.status !== 206) {
    if (upstream.status === 416) {
      return new Response(null, { status: 416, headers: { "Content-Range": upstream.headers.get("content-range") || "" } });
    }
    return deny("Couldn't load this file.", 502);
  }

  const headers = new Headers({
    "Content-Type": tok.mime || upstream.headers.get("content-type") || "application/octet-stream",
    "Cache-Control": "no-store, private, max-age=0",
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Accept-Ranges": "bytes",
    "Referrer-Policy": "no-referrer"
  });
  for (const h of ["content-length", "content-range"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }

  return new Response(upstream.body, { status: upstream.status, headers });
}
