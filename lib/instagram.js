// Instagram Graph API helpers (server only).
//
// Two token flavours are supported, because creators arrive with either:
//   token_kind 'instagram' — Instagram Login (graph.instagram.com). The token
//                            belongs to the IG professional account itself.
//   token_kind 'facebook'  — Facebook Login for Business (graph.facebook.com).
//                            The token is a Page token; sends go through the
//                            Page id, comments through the IG comment id.
import crypto from "crypto";

export const GRAPH_VERSION = process.env.IG_GRAPH_VERSION || "v21.0";

const HOSTS = {
  instagram: "https://graph.instagram.com",
  facebook: "https://graph.facebook.com"
};

export const hostFor = (kind) => HOSTS[kind] || HOSTS.instagram;

const TIMEOUT_MS = Number(process.env.IG_TIMEOUT_MS || 8000);

/** Low-level Graph call with a timeout and a readable error. */
export async function graph(path, { kind = "instagram", token, method = "GET", params, body } = {}) {
  const url = new URL(`${hostFor(kind)}/${GRAPH_VERSION}/${String(path).replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  if (token) url.searchParams.set("access_token", token);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      method,
      signal: ctrl.signal,
      cache: "no-store",
      ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {})
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) {
      const e = json.error || {};
      const err = new Error(e.error_user_msg || e.message || `Instagram request failed (${res.status})`);
      err.code = e.code;
      err.subcode = e.error_subcode;
      err.type = e.type;
      err.status = res.status;
      throw err;
    }
    return json;
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Instagram request timed out");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** The account behind a token: id, username, name, picture. */
export async function fetchAccount(token, kind = "instagram") {
  if (kind === "facebook") {
    // Page token → the IG business account linked to the Page.
    const me = await graph("me", { kind, token, params: { fields: "id,name,instagram_business_account{id,username,name,profile_picture_url,followers_count}" } });
    const ig = me.instagram_business_account;
    if (!ig?.id) throw new Error("This Page has no Instagram professional account linked to it.");
    return {
      ig_user_id: String(ig.id),
      username: ig.username || null,
      name: ig.name || null,
      profile_picture_url: ig.profile_picture_url || null,
      followers_count: ig.followers_count ?? null,
      page_id: String(me.id)
    };
  }
  const me = await graph("me", { kind, token, params: { fields: "user_id,id,username,name,profile_picture_url,followers_count,account_type" } });
  return {
    ig_user_id: String(me.user_id || me.id),
    username: me.username || null,
    name: me.name || null,
    profile_picture_url: me.profile_picture_url || null,
    followers_count: me.followers_count ?? null,
    page_id: null
  };
}

/** Recent posts / reels, for the "which post?" picker. */
export async function fetchMedia(account, limit = 30) {
  const { access_token: token, token_kind: kind, ig_user_id, page_id } = account;
  const node = kind === "facebook" ? ig_user_id : "me";
  const res = await graph(`${node}/media`, {
    kind, token,
    params: { fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,comments_count,like_count", limit }
  });
  return (res.data || []).map((m) => ({
    id: String(m.id),
    caption: m.caption || "",
    type: m.media_type,
    thumbnail: m.thumbnail_url || m.media_url || null,
    permalink: m.permalink || null,
    timestamp: m.timestamp,
    comments: m.comments_count ?? null,
    likes: m.like_count ?? null
  }));
}

/** The node messages are sent from. */
const sendNode = (account) =>
  account.token_kind === "facebook" ? (account.page_id || account.ig_user_id) : account.ig_user_id;

/**
 * Private reply to a comment — the comment-to-DM primitive.
 * Meta allows exactly one private reply per comment, within 7 days.
 */
export async function sendPrivateReply(account, commentId, { text, buttonLabel, buttonUrl }) {
  const kind = account.token_kind || "instagram";
  const token = account.access_token;
  const node = `${sendNode(account)}/messages`;
  const recipient = { comment_id: String(commentId) };

  // With a link we prefer a tappable button card; plain text otherwise.
  if (buttonUrl) {
    try {
      return await graph(node, {
        kind, token, method: "POST",
        body: {
          recipient,
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "generic",
                elements: [{
                  title: (text || "Here you go").slice(0, 80),
                  subtitle: buttonLabel ? undefined : "Tap below to open",
                  buttons: [{ type: "web_url", url: buttonUrl, title: (buttonLabel || "Open link").slice(0, 20) }]
                }]
              }
            }
          }
        }
      });
    } catch (err) {
      // Some accounts/templates get rejected — never lose the DM over formatting.
      return await graph(node, {
        kind, token, method: "POST",
        body: { recipient, message: { text: `${text || ""}\n\n${buttonUrl}`.trim() } }
      });
    }
  }

  return await graph(node, { kind, token, method: "POST", body: { recipient, message: { text: text || "" } } });
}

/** Send a DM to a known Instagram-scoped user id (for follow-ups, not the first touch). */
export async function sendDirectMessage(account, igsid, text) {
  return await graph(`${sendNode(account)}/messages`, {
    kind: account.token_kind || "instagram",
    token: account.access_token,
    method: "POST",
    body: { recipient: { id: String(igsid) }, message: { text } }
  });
}

/** Public reply under the comment. */
export async function replyToComment(account, commentId, message) {
  return await graph(`${commentId}/replies`, {
    kind: account.token_kind || "instagram",
    token: account.access_token,
    method: "POST",
    params: { message }
  });
}

// ---------------- OAuth (Instagram Login) ----------------

// NOTE: this must be the **Instagram app ID**, from
// App Dashboard -> Instagram -> API setup with Instagram business login.
// The Facebook app ID from Settings -> Basic is a DIFFERENT number, and using
// it makes instagram.com/oauth/authorize answer "Invalid platform app".
export const igAppId = () => process.env.INSTAGRAM_APP_ID || process.env.IG_APP_ID || "";
export const igAppSecret = () => process.env.INSTAGRAM_APP_SECRET || process.env.IG_APP_SECRET || "";
export const oauthConfigured = () => Boolean(igAppId() && igAppSecret());

/**
 * The redirect URI sent to Instagram. It has to match a "Valid OAuth Redirect
 * URI" on the Instagram business login settings byte for byte.
 *
 * Meta only accepts https, so on localhost you point INSTAGRAM_REDIRECT_URI at
 * a tunnel (ngrok / cloudflared) and whitelist that same URL.
 */
export function redirectUri(origin) {
  const explicit = process.env.INSTAGRAM_REDIRECT_URI;
  if (explicit) return explicit.trim();
  const base = (process.env.NEXT_PUBLIC_APP_URL || origin || "").replace(/\/$/, "");
  return `${base}/api/instagram/callback`;
}

/** Config problems we can catch before bouncing the creator to Instagram. */
export function oauthProblem(origin) {
  if (!igAppId()) return "INSTAGRAM_APP_ID isn't set on the server.";
  if (!igAppSecret()) return "INSTAGRAM_APP_SECRET isn't set on the server.";

  const uri = redirectUri(origin);
  if (!/^https:\/\//i.test(uri)) {
    return `Instagram only accepts an https redirect URL, and this server is using ${uri}. `
      + "Run a tunnel (ngrok / cloudflared), set INSTAGRAM_REDIRECT_URI to "
      + "https://<your-tunnel>/api/instagram/callback, and add that exact URL to your Meta app's "
      + "Instagram business login settings. To connect right now without a tunnel, paste an access token instead.";
  }
  return null;
}

export const IG_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments"
];

export function authorizeUrl(redirectUri, state) {
  const u = new URL("https://www.instagram.com/oauth/authorize");
  u.searchParams.set("client_id", igAppId());
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", IG_SCOPES.join(","));
  u.searchParams.set("state", state);
  return u.toString();
}

/** authorization code → short-lived token. */
export async function exchangeCode(code, redirectUri) {
  const form = new URLSearchParams({
    client_id: igAppId(),
    client_secret: igAppSecret(),
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code
  });
  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    cache: "no-store"
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error_type || json.error) {
    throw new Error(json.error_message || json.error?.message || "Instagram rejected the sign-in code.");
  }
  return { access_token: json.access_token, ig_user_id: String(json.user_id || "") };
}

/** short-lived → long-lived (60 days). */
export async function exchangeLongLived(shortToken) {
  const u = new URL("https://graph.instagram.com/access_token");
  u.searchParams.set("grant_type", "ig_exchange_token");
  u.searchParams.set("client_secret", igAppSecret());
  u.searchParams.set("access_token", shortToken);
  const res = await fetch(u.toString(), { cache: "no-store" });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || out.error) throw new Error(out.error?.message || "Could not upgrade the Instagram token.");
  return { access_token: out.access_token, expires_in: out.expires_in || 60 * 24 * 3600 };
}

/** Refresh a long-lived token (call before day 60). */
export async function refreshLongLived(token) {
  const u = new URL("https://graph.instagram.com/refresh_access_token");
  u.searchParams.set("grant_type", "ig_refresh_token");
  u.searchParams.set("access_token", token);
  const res = await fetch(u.toString(), { cache: "no-store" });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || out.error) throw new Error(out.error?.message || "Could not refresh the Instagram token.");
  return { access_token: out.access_token, expires_in: out.expires_in || 60 * 24 * 3600 };
}

// ---------------- Webhook security ----------------

/** Meta signs every webhook body with the app secret. */
export function verifySignature(rawBody, header) {
  const secret = igAppSecret();
  if (!secret) return { ok: false, reason: "no_secret" };
  const sig = String(header || "");
  if (!sig.startsWith("sha256=")) return { ok: false, reason: "no_signature" };
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return { ok: false, reason: "mismatch" };
  return { ok: crypto.timingSafeEqual(a, b), reason: "mismatch" };
}

// ---------------- OAuth state (signed, no session on the callback) ----------------

const stateSecret = () => process.env.AUTH_PASSWORD_SECRET || igAppSecret() || "supercreators";

export function signState(userId, ttlSeconds = 900) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${userId}.${exp}`;
  const sig = crypto.createHmac("sha256", stateSecret()).update(payload).digest("hex").slice(0, 32);
  return `${payload}.${sig}`;
}

export function readState(state) {
  const parts = String(state || "").split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  const expect = crypto.createHmac("sha256", stateSecret()).update(`${userId}.${exp}`).digest("hex").slice(0, 32);
  if (sig !== expect) return null;
  if (Number(exp) * 1000 < Date.now()) return null;
  return userId;
}
