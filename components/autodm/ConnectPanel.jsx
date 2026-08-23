"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/supabase";

/** Connect / disconnect Instagram, plus the webhook details for setup. */
export default function ConnectPanel({ status, onChange }) {
  const [token, setToken] = useState("");
  const [kind, setKind] = useState("instagram");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [manual, setManual] = useState(false);
  const [copied, setCopied] = useState(false);

  const account = status?.account;

  async function oauth() {
    setBusy(true); setErr("");
    try {
      const res = await apiFetch("/api/instagram/connect", undefined, "GET");
      window.location.href = res.url;
    } catch (e) { setErr(e.message); setManual(true); setBusy(false); }
  }

  async function connectToken() {
    setBusy(true); setErr("");
    try {
      await apiFetch("/api/instagram/connect", { access_token: token.trim(), token_kind: kind });
      setToken("");
      onChange();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function disconnect() {
    setBusy(true);
    try { await apiFetch("/api/instagram/account", undefined, "DELETE"); onChange(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  function copyWebhook() {
    navigator.clipboard?.writeText(status?.webhookUrl || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // ---------- connected ----------
  if (account) {
    const expires = account.token_expires_at ? new Date(account.token_expires_at) : null;
    const daysLeft = expires ? Math.round((expires - Date.now()) / 86400000) : null;

    return (
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-4">
          {account.profile_picture_url
            ? <img src={account.profile_picture_url} alt="" className="h-12 w-12 rounded-full object-cover" />
            : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#F9CE34] via-[#EE2A7B] to-[#6228D7] text-lg font-bold text-white">
                {(account.username || "i")[0].toUpperCase()}
              </span>}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-bold">@{account.username || account.ig_user_id}</span>
              <span className="pill bg-teal-soft text-teal">Connected</span>
            </div>
            <p className="text-sm text-inkmuted">
              {account.followers_count != null ? `${account.followers_count.toLocaleString("en-IN")} followers · ` : ""}
              {daysLeft != null ? (daysLeft > 7 ? `Token valid ${daysLeft} more days` : `Token expires in ${daysLeft} days — reconnect soon`) : "Long-lived token"}
            </p>
          </div>
          <button onClick={disconnect} disabled={busy} className="btn-ghost">Disconnect</button>
        </div>

        {account.last_error && (
          <div className="mt-4 rounded-[10px] border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{account.last_error}</div>
        )}

        <div className="mt-4 rounded-[10px] bg-paper p-3.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-inkmuted">Webhook URL (Meta app → Instagram → Webhooks)</div>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate text-xs">{status.webhookUrl}</code>
            <button onClick={copyWebhook} className="shrink-0 text-sm font-semibold text-brand">{copied ? "Copied" : "Copy"}</button>
          </div>
          <p className="mt-1.5 text-[11px] text-inkmuted">
            Subscribe to the <b>comments</b> field. {status.webhookReady ? "Verify token is configured on the server." : "⚠️ Set META_WEBHOOK_VERIFY_TOKEN on the server before verifying."}
          </p>
        </div>
        {err && <p className="mt-3 text-sm text-danger">{err}</p>}
      </div>
    );
  }

  // ---------- not connected ----------
  return (
    <div className="card p-6">
      <h2 className="font-display text-lg font-bold">Connect Instagram</h2>
      <p className="mt-1 text-sm text-inkmuted">
        You need an Instagram <b>professional</b> account (Creator or Business). AutoDM replies to comments on your posts and reels.
      </p>

      {status?.oauthProblem && (
        <div className="mt-4 rounded-[10px] border border-line bg-paper p-3.5 text-sm">
          <div className="font-semibold">Instagram sign-in isn&apos;t ready on this server</div>
          <p className="mt-1 text-inkmuted">{status.oauthProblem}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {status?.oauth && !status?.oauthProblem && (
          <button onClick={oauth} disabled={busy} className="btn text-white"
            style={{ background: "linear-gradient(135deg,#F9CE34,#EE2A7B 45%,#6228D7)" }}>
            {busy ? "Opening Instagram…" : "Connect with Instagram"}
          </button>
        )}
        <button onClick={() => setManual((m) => !m)} className={status?.oauth && !status?.oauthProblem ? "btn-ghost" : "btn-brand"}>
          {manual ? "Hide token option" : "Paste an access token"}
        </button>
      </div>

      {status?.oauth && (
        <details className="mt-4 rounded-[10px] border border-line p-3.5 text-sm">
          <summary className="cursor-pointer font-semibold">Instagram says &ldquo;Invalid platform app&rdquo;?</summary>
          <div className="mt-2 space-y-2 text-inkmuted">
            <p>
              That means <code>INSTAGRAM_APP_ID</code> is the <b>Facebook</b> app ID. Instagram business
              login needs the separate <b>Instagram app ID</b> — Meta app dashboard → <b>Instagram</b> →
              <b> API setup with Instagram business login</b> → step&nbsp;3. Copy the Instagram app ID
              <i> and</i> the Instagram app secret from there.
            </p>
            <p>
              This server sends the redirect URL below. Add it, exactly as written, to
              <b> Valid OAuth Redirect URIs</b> in that same panel:
            </p>
            <code className="block break-all rounded bg-paper p-2 text-xs">{status.redirectUri}</code>
          </div>
        </details>
      )}

      {manual && (
        <div className="mt-4 space-y-3 rounded-[10px] border border-line p-4">
          <div>
            <label className="label">Token type</label>
            <div className="flex gap-2">
              {[["instagram", "Instagram token"], ["facebook", "Facebook Page token"]].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setKind(k)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${kind === k ? "border-ink bg-ink text-white" : "border-line bg-white text-inkmuted"}`}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Access token</label>
            <textarea className="input min-h-[80px] font-mono text-xs" placeholder="IGQVJ… or EAAG…"
              value={token} onChange={(e) => setToken(e.target.value)} />
            <p className="mt-1 text-[11px] text-inkmuted">
              Needs <code>instagram_business_manage_messages</code> and <code>instagram_business_manage_comments</code>. We upgrade short-lived tokens to 60 days automatically.
            </p>
          </div>
          <button onClick={connectToken} disabled={busy || !token.trim()} className="btn-brand">{busy ? "Checking…" : "Connect account"}</button>
        </div>
      )}

      {err && <p className="mt-3 text-sm text-danger">{err}</p>}
    </div>
  );
}
