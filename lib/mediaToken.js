// =============================================================
// Signed, short-lived tokens for /api/learn/stream (server only).
//
// A token names exactly one stored file and who it was minted for, and
// expires. It's HMAC-signed so it can't be edited to point at another file.
// =============================================================

import crypto from "crypto";

const SECRET = process.env.MEDIA_STREAM_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-only-secret";

const b64u = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (s) => Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64");

/**
 * @param {object} p
 * @param {string} p.path      storage path in the private bucket
 * @param {string} p.kind      "video" | "audio" | "pdf" | "file"
 * @param {string} [p.mime]
 * @param {string} [p.uid]     user the token was minted for (or "" for previews)
 * @param {number} p.ttl       seconds
 */
export function signMediaToken({ path, kind, mime = "", uid = "", ttl }) {
  const body = b64u(JSON.stringify({ p: path, k: kind, m: mime, u: uid, e: Math.floor(Date.now() / 1000) + ttl }));
  const sig = b64u(crypto.createHmac("sha256", SECRET).update(body).digest());
  return `${body}.${sig}`;
}

/** @returns {null | { path, kind, mime, uid, exp }} */
export function verifyMediaToken(token) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const expected = b64u(crypto.createHmac("sha256", SECRET).update(body).digest());
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(fromB64u(body).toString("utf8"));
    if (!d.e || d.e < Math.floor(Date.now() / 1000)) return null;
    return { path: d.p, kind: d.k, mime: d.m, uid: d.u, exp: d.e };
  } catch { return null; }
}
