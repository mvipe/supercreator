-- =============================================================
-- SuperCreators — "everything" add-on. Run AFTER schema.sql,
-- payouts.sql and features.sql, once.
-- =============================================================

-- ---------- Extra profile details (complete-profile flow) ----------
alter table public.mp_profiles add column if not exists full_name     text default '';
alter table public.mp_profiles add column if not exists business_name text default '';
alter table public.mp_profiles add column if not exists email         text default '';
alter table public.mp_profiles add column if not exists profession    text default '';
alter table public.mp_profiles add column if not exists profile_complete boolean not null default false;

-- ---------- Super-admin + block/unblock ----------
alter table public.mp_profiles add column if not exists is_super_admin boolean not null default false;
alter table public.mp_profiles add column if not exists blocked boolean not null default false;

-- ---------- Book selling: allow 'book' product type ----------
-- mp_products.type and mp_orders/mp_purchases.product_type have CHECK constraints.
-- Recreate them to include 'book'.
alter table public.mp_products  drop constraint if exists mp_products_type_check;
alter table public.mp_products  add  constraint mp_products_type_check
  check (type in ('event','locked','payment','book'));

alter table public.mp_orders    drop constraint if exists mp_orders_product_type_check;
alter table public.mp_orders    add  constraint mp_orders_product_type_check
  check (product_type in ('course','event','locked','payment','booking','book'));

alter table public.mp_purchases drop constraint if exists mp_purchases_product_type_check;
alter table public.mp_purchases add  constraint mp_purchases_product_type_check
  check (product_type in ('course','event','locked','payment','booking','book'));

-- ---------- Store visitors (audience: who visited but didn't buy) ----------
create table if not exists public.mp_visits (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  path       text not null default '',           -- e.g. /c/my-course
  ref        text,                                -- product type or label
  visitor_id text,                                -- anon fingerprint from localStorage
  buyer_phone text,                               -- if we know it (signed-in visitor)
  created_at timestamptz not null default now()
);
create index if not exists mp_visits_owner_idx on public.mp_visits(owner_id, created_at desc);

alter table public.mp_visits enable row level security;
-- Anyone may insert a visit (public pages log views); owners read their own.
create policy "visits_insert_any" on public.mp_visits for insert with check (true);
create policy "visits_read_own"   on public.mp_visits for select using (owner_id = auth.uid());

-- ---------- Helper: is a user blocked? (used server-side) ----------
create or replace function public.mp_is_blocked(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select blocked from public.mp_profiles where user_id = p_user), false);
$$;
grant execute on function public.mp_is_blocked(uuid) to authenticated, service_role, anon;

-- To make yourself SUPER admin (replace username):
--   update public.mp_profiles set is_super_admin = true, is_admin = true
--   where user_id = (select user_id from public.mp_profiles where username = 'your-username');

