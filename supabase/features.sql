-- =============================================================
-- SuperCreators — Tutorials + Subscription add-on.
-- Run AFTER schema.sql and payouts.sql, once.
-- =============================================================

-- ---------- Subscription fields on profiles ----------
alter table public.mp_profiles add column if not exists plan text not null default 'free';
alter table public.mp_profiles add column if not exists plan_expires_at timestamptz;

-- ---------- Learn / tutorial videos (admin-managed) ----------
create table if not exists public.mp_tutorials (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default 'Untitled tutorial',
  description text not null default '',
  video_url   text not null default '',
  category    text not null default 'Essentials',
  position    integer not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists mp_tutorials_pos_idx on public.mp_tutorials(position);

alter table public.mp_tutorials enable row level security;

-- Anyone signed in can read the published ones. All writes are service-role only.
create policy "tutorials_read_published" on public.mp_tutorials
  for select using (published = true);

-- ---------- Subscription orders ----------
create table if not exists public.mp_sub_orders (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  razorpay_order_id   text unique,
  razorpay_payment_id text,
  amount              integer not null,        -- paise
  status              text not null default 'created' check (status in ('created','paid','failed')),
  created_at          timestamptz not null default now()
);

alter table public.mp_sub_orders enable row level security;
create policy "sub_orders_read_own" on public.mp_sub_orders
  for select using (user_id = auth.uid());

