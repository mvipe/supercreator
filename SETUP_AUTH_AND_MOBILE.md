# SuperCreators — auth + mobile update

## 1. Run the SQL (required)
Supabase → SQL Editor → run **`supabase/auth-pack.sql`**.
(Adds `mp_user_id_by_phone` and `mp_email_by_user_id` — phone login of
email-signup accounts depends on these.)

## 2. Test credentials
- **Phone:** `9999999999` · **OTP:** `1234`
  Whitelisted in `lib/msg91.js` — never hits MSG91, works in production too.
  First use goes to signup (as designed); complete it with any email +
  password (8+ chars), OTP `1234`.
- After that signup, that **email + password** also works on the Email tab.
- Override via env: `TEST_LOGIN_PHONE`, `TEST_LOGIN_OTP`.
- Remove for launch: delete the TEST_PHONE block in `lib/msg91.js`.

## 3. What changed
### Auth
- **/signup** — name, email, password, phone (OTP-verified). Coming from
  login with a new number pre-fills the phone.
- **/login** — two tabs: Phone OTP and Email+password.
- **New numbers can no longer log in directly** — send-otp checks existence
  first and redirects to signup without wasting an SMS.
- OTP login now mints a one-time token (`generateLink` → `verifyOtp`)
  instead of overwriting the account password — email+password accounts
  keep their chosen password even when they use OTP.
- Signup name lands in the profile automatically (store heading, Hello card).

### Mobile
- App-style **bottom nav** (Home · Store · Apps · Payments · More) on all
  dashboard pages; More opens the drawer. Safe-area aware.
- **Apps** page restyled as an app list with icon tiles.
- **Store editor**: tabs scroll horizontally, the store URL pill truncates
  instead of overflowing, link text now says **supercreators.app**.
- **Booking page**: brand social icons, lighter paddings, and the summary +
  confirm button stays sticky above the bottom nav on phones.
- Dashboard pages use responsive paddings (px-4 → sm:px-8).

### Fonts
- Lexend (headings) + Roboto (body), loaded from Google Fonts, wired into
  Tailwind (`font-display` / `font-body`).

## 4. Env (unchanged ones omitted)
No new required env vars. Optional: `TEST_LOGIN_PHONE`, `TEST_LOGIN_OTP`.
