# AutoDM — Instagram comment-to-DM

Someone comments a keyword on a post or reel → they get a DM with your link a
second later, and (optionally) a public reply under their comment.

---

## 1. Run the migration

In Supabase → SQL Editor, run `supabase/autodm.sql` once. It creates:

| Table | What it holds |
|---|---|
| `mp_ig_accounts` | The creator's connected Instagram account + long-lived token |
| `mp_autodm_rules` | The automations (post, keywords, DM, button, public replies) |
| `mp_autodm_logs` | Every comment we saw, what matched, what happened |

`mp_autodm_logs.comment_id` is unique — that's what makes Meta's webhook
retries a no-op instead of a duplicate DM.

## 2. Environment variables

Add to `.env.local` (and to Vercel → Settings → Environment Variables):

```
INSTAGRAM_APP_ID=<Instagram app id>
INSTAGRAM_APP_SECRET=<Instagram app secret>
META_WEBHOOK_VERIFY_TOKEN=<any long random string you invent>
```

> ⚠️ **These are not the Facebook app id/secret.** Meta shows a separate
> *Instagram* app id and secret under **Instagram → API setup with Instagram
> business login → step 3**. Using the Facebook app id from *Settings → Basic*
> makes Instagram answer **"Invalid request: Invalid platform app"** at login.

`NEXT_PUBLIC_APP_URL` must already be set to your live origin — the OAuth
redirect and the webhook URL are both built from it.

Optional:

- `INSTAGRAM_REDIRECT_URI` — override the callback URL. Needed when
  `NEXT_PUBLIC_APP_URL` isn't the https origin Meta redirects to, which is the
  case in local dev (see §11).
- `IG_GRAPH_VERSION` (default `v21.0`), `IG_TIMEOUT_MS` (default 8000).

## 3. Meta app setup

developers.facebook.com → your app → **Instagram** → *API setup with Instagram
business login*.

**Permissions** the app must request:

- `instagram_business_basic`
- `instagram_business_manage_messages`
- `instagram_business_manage_comments`
- `instagram_business_manage_insights` — powers the **Insights** tab on
  `/dashboard/autodm`, which reads account + post insights (reach, engagement,
  follower count) live from the Graph API.

**OAuth redirect URI:**

```
https://your-domain.com/api/instagram/callback
```

**Webhook:**

| Field | Value |
|---|---|
| Callback URL | `https://your-domain.com/api/instagram/webhook` |
| Verify token | the same string as `META_WEBHOOK_VERIFY_TOKEN` |
| Subscribed field | **`comments`** |

Hit *Verify and save* — our `GET` handler answers the `hub.challenge`.
The exact webhook URL is also shown (with a copy button) on
`/dashboard/autodm` once an account is connected.

> Until the app clears App Review, only accounts added as testers/admins on the
> Meta app can connect. Your own account works immediately.

## 4. Connecting an account

Two paths, both on `/dashboard/autodm`:

1. **Connect with Instagram** — the normal OAuth flow. Short-lived token is
   swapped for a 60-day long-lived one and stored server-side.
2. **Paste an access token** — for the token you already have. Works with an
   Instagram token (`IGQVJ…`) or a Facebook Page token (`EAAG…`, pick "Facebook
   Page token"). We validate it against Instagram before saving, and upgrade it
   to long-lived when the app secret is present.

The token is only ever read by server routes (service role). Client code gets
username, picture, follower count and expiry — never the token.

## 5. Requirements on the creator's side

- Instagram must be a **professional** account (Creator or Business).
- Comment-to-DM uses Meta's *private reply*: **one reply per comment, within 7
  days**, and no prior conversation needed. That's why the first touch is a
  private reply rather than a plain DM send.

## 6. How a comment is handled

```
comment webhook
  → verify X-Hub-Signature-256 against the app secret
  → find the connected account by entry.id
  → ignore the creator's own comments
  → INSERT the log row (unique comment_id = dedupe/claim)
  → pick a rule: post-specific first, then catch-all; newest first
  → "once per person" check
  → private reply DM (button card when a link is set, plain text as fallback)
  → optional public comment reply (rotated at random)
  → update the log + the rule's sent counter
```

Anything that fails is written to the log with the Graph API's message, and an
auth error (code 190/102/10/200) flags the account so the dashboard can tell the
creator to reconnect. The webhook always answers `200` so Meta stops retrying.

## 7. Matching rules

- Case-insensitive; emoji and punctuation are stripped before comparing.
- Single-word keywords match on **word boundaries** — `link` does not fire on
  "linkedin". Multi-word keywords match as a substring.
- Modes: `contains` (default), `exact` (whole comment equals keyword), `any`
  (every comment fires).
- `{{username}}` in the DM or the public reply becomes the commenter's handle.

The **Test a comment** box on the dashboard runs this exact matcher via
`/api/autodm/simulate` and sends nothing.

## 8. API surface

| Route | Method | Purpose |
|---|---|---|
| `/api/instagram/webhook` | GET/POST | Meta handshake + comment events |
| `/api/instagram/connect` | GET | OAuth URL |
| `/api/instagram/connect` | POST | Connect with a pasted token |
| `/api/instagram/callback` | GET | OAuth return |
| `/api/instagram/account` | GET/DELETE | Status / disconnect |
| `/api/instagram/insights` | GET | Account + latest-post insights (uses `instagram_business_manage_insights`) |
| `/api/autodm/rules` | GET/POST | List / create automations |
| `/api/autodm/rules/[id]` | PATCH/DELETE | Edit, toggle, delete |
| `/api/autodm/logs` | GET | Activity feed + 30-day stats |
| `/api/autodm/media` | GET | Recent posts for the picker |
| `/api/autodm/simulate` | POST | Dry-run the matcher |

## 9. Token expiry

Long-lived tokens last 60 days and refresh on use. The dashboard warns when
fewer than 7 days remain. `refreshLongLived()` in `lib/instagram.js` is ready
for a cron/edge job if you want it fully hands-off:

```js
// pseudo: nightly
for (const acct of accountsExpiringWithin(14)) {
  const { access_token, expires_in } = await refreshLongLived(acct.access_token);
  // save access_token + new expiry
}
```

## 10. Files

```
supabase/autodm.sql
lib/instagram.js                     Graph API: private replies, comments, media, OAuth, signature
lib/autodm.js                        keyword matching + validation (shared client/server)
app/api/instagram/{webhook,connect,callback,account,insights}/route.js
app/api/autodm/{rules,rules/[id],logs,media,simulate}/route.js
app/dashboard/autodm/page.js         dashboard: connect, rules, activity, insights, tester
components/autodm/{ConnectPanel,RuleModal,DmPreview}.jsx
```

Modified: `app/dashboard/apps/page.js` (AutoDM → Live), `app/dashboard/layout.js`
(sidebar entry), `lib/team.js` (sub-admin permission), `.env.example`.

---

## 11. Troubleshooting

### "Invalid request: Request parameters are invalid: Invalid platform app"

`INSTAGRAM_APP_ID` is the **Facebook** app id. Instagram business login uses a
different one.

Meta app dashboard → **Instagram** → *API setup with Instagram business login* →
step 3 shows an **Instagram app ID** and **Instagram app secret**. Copy both
(not just the id — the secret is different too), restart the dev server, and
try again.

### "Invalid redirect_uri" / the callback bounces

The redirect URL we send must appear **character for character** in *Valid OAuth
Redirect URIs* on that same Instagram panel. The dashboard prints the exact URL
we're sending under *Instagram says "Invalid platform app"?* on
`/dashboard/autodm`.

### Local development

Meta refuses `http://` and refuses `localhost`, so `http://localhost:3000`
cannot complete OAuth. Two options:

1. **Skip OAuth** — use **Paste an access token** on `/dashboard/autodm`. This
   works on localhost today, and it's the fastest way to see the whole flow
   with the token you already have. (Comment webhooks still need a public URL —
   see below.)
2. **Tunnel** — run `cloudflared tunnel --url http://localhost:3000` (or
   `ngrok http 3000`), then:
   ```
   INSTAGRAM_REDIRECT_URI=https://<your-tunnel>/api/instagram/callback
   ```
   and add that same URL to *Valid OAuth Redirect URIs*. Point the webhook
   callback at `https://<your-tunnel>/api/instagram/webhook` too — Instagram
   can't reach localhost either, so comments won't arrive without it.

### The account connects but no DMs arrive

- Is the webhook subscribed to the **comments** field, and verified (green)?
- Is `NEXT_PUBLIC_APP_URL` (or the tunnel) the URL Meta is actually calling?
- Check `/dashboard/autodm` → **Activity**. Every comment we receive is logged,
  including `skipped` (no rule matched) and `failed` (with Meta's own error).
  An empty activity list means the webhook isn't reaching us at all.
- Until App Review clears, only accounts listed as testers/admins on the Meta
  app can be automated.
