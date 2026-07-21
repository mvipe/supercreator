# MegaProfile

A SuperProfile-style creator-commerce platform for Indian creators. One link-in-bio store where you sell **courses, 1:1 bookings, events, locked content and payment pages** — with phone-OTP login and Razorpay payments.

Built with **Next.js 14 (App Router, JSX)**, **Supabase** (Postgres + Auth + Storage), **MSG91** (phone OTP) and **Razorpay**. Sky-blue theme, full creator dashboard, full-screen editors with live preview.

---

## What's inside

**Creator dashboard** (`/dashboard`)
- **Getting Started** — onboarding checklist wired to real data
- **Store** — claim `@username`, bio, avatar, socials + live phone preview → public page at `/u/username`
- **Payments** — every sale across all product types, filterable, CSV export
- **Learn** — Creator Academy content hub
- **Audience** — all customers grouped by phone, segments, lifetime value, CSV export
- **Refer & Earn** — personal referral link + tracking
- **Your apps:** Courses · Bookings · Events · Payment Pages · Locked Content
- **Explore all apps** — AutoDM / Telegram / Discord shown honestly as "coming soon" (they need Meta/Telegram integrations)

**Full-screen editors** (`/studio/...`) — no sidebar while creating, split-screen with a desktop/mobile live preview that matches the public page exactly.

**Public pages** — `/c` courses, `/e` events, `/l` locked content, `/p` payment pages, `/book/username` bookings, `/u/username` store.

---

## Setup

### 1. Supabase
Create a project, then in the **SQL Editor** run the entire `supabase/schema.sql` once. It creates all `mp_*` tables, RLS policies, RPCs, and the public `megaprofile` storage bucket.

### 2. Environment (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...          # server only — never expose
AUTH_PASSWORD_SECRET=...               # long random string — see warning below
MSG91_AUTH_KEY=...
MSG91_TEMPLATE_ID=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...                # server only
```

> ⚠️ **Never change `AUTH_PASSWORD_SECRET` after users exist.** Login derives each user's Supabase password deterministically from their phone via `HMAC(phone, AUTH_PASSWORD_SECRET)`. Changing it locks everyone out.

### 3. Run
```
npm install
npm run dev
```

For local testing without live MSG91, set `MSG91_DEV_MODE=true` and use OTP `0000`.

---

## How auth works (MSG91 → Supabase bridge)

Supabase Auth has no native phone-OTP-via-MSG91 flow, so:
1. `/api/auth/send-otp` sends an OTP through MSG91.
2. `/api/auth/verify-otp` verifies it, then (service role) creates/loads a Supabase user with email alias `{phone}@phone.megaprofile.app` and password `HMAC(phone, AUTH_PASSWORD_SECRET)`.
3. Server signs in with that password and returns tokens; the client calls `setSession`.

All money-touching writes (`mp_orders`, `mp_purchases`, `mp_bookings`) happen **only** in API routes using the service role — never from the browser. Prices are always recomputed server-side; the client can't set its own amount.

---

## Payments

Generalized checkout for every product type:
- `/api/checkout/order` — loads the product, computes the amount server-side (coupons, PWYW, booking slot price), grants free items instantly, else creates a Razorpay order.
- `/api/checkout/verify` — HMAC-verifies the signature, marks the order paid, and grants access (idempotent).

## Deploy (Vercel)
Push to GitHub, import into Vercel, add all env vars from above in Project Settings. `AUTH_PASSWORD_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` and `RAZORPAY_KEY_SECRET` must **not** have the `NEXT_PUBLIC_` prefix.

---

*Design note: MegaProfile mirrors SuperProfile's feature set and information architecture with its own original branding, copy and assets — it is not a copy of SuperProfile's logo or proprietary content.*
