-- =============================================================
-- SuperCreators — Supabase schema (v2, full suite)
-- Run this whole file in Supabase SQL Editor.
-- =============================================================
create extension if not exists pgcrypto;

-- ---------- Profiles / Store ----------
create table if not exists public.mp_profiles (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  username             text unique,
  display_name         text default '',
  full_name            text default '',
  email                text default '',
  profession           text default '',
  phone_number         text default '',
  bio                  text default '',
  avatar_url           text default '',
  socials              jsonb not null default '{}',
  business_name        text default '',
  theme                text not null default 'classic',
  brand_color          text not null default '#2E6EF7',
  font                 text not null default 'Inter',
  links                jsonb not null default '[]',
  meta_title           text default '',
  meta_description     text default '',
  sensitive_content    boolean not null default false,
  column_layout        text not null default 'single',
  fb_pixel             text default '',
  ga_id                text default '',
  referral_code        text unique,
  referred_by          text,
  plan                 text not null default 'free' check (plan in ('free','pro')),
  plan_expires_at      timestamptz,
  blocked              boolean not null default false,
  profile_complete     boolean not null default false,
  created_at           timestamptz not null default now()
);

-- ---------- Courses ----------
create table if not exists public.mp_courses (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  title         text not null default 'Untitled course',
  slug          text unique,
  status        text not null default 'draft' check (status in ('draft','unpublished','published')),
  cover_images  jsonb not null default '[]',
  cover_video   text not null default '',
  description   text not null default '',
  button_text   text not null default 'ENROLL NOW',
  instructions  text not null default '',
  sections      jsonb not null default '{}',
  modules       jsonb not null default '[]',
  pricing       jsonb not null default '{}',
  validity      jsonb not null default '{}',
  settings      jsonb not null default '{}',
  views         integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- Other products (events, locked content, payment pages) ----------
create table if not exists public.mp_products (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  type       text not null check (type in ('event','locked','payment')),
  title      text not null default 'Untitled',
  slug       text unique,
  status     text not null default 'draft' check (status in ('draft','unpublished','published')),
  data       jsonb not null default '{}',
  views      integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Bookings ----------
create table if not exists public.mp_sessions (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  title        text not null default 'New session',
  description  text not null default '',
  duration_min integer not null default 30,
  price        integer not null default 0, -- rupees
  active       boolean not null default true,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.mp_availability (
  owner_id  uuid primary key references auth.users(id) on delete cascade,
  timezone  text not null default 'Asia/Kolkata',
  days      jsonb not null default '{"0":{"on":false,"ranges":[["09:00","17:00"]]},"1":{"on":true,"ranges":[["09:00","17:00"]]},"2":{"on":true,"ranges":[["09:00","17:00"]]},"3":{"on":true,"ranges":[["09:00","17:00"]]},"4":{"on":true,"ranges":[["09:00","17:00"]]},"5":{"on":true,"ranges":[["09:00","17:00"]]},"6":{"on":false,"ranges":[["09:00","17:00"]]}}'
);

create table if not exists public.mp_bookings (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.mp_sessions(id) on delete cascade,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  buyer_id    uuid not null references auth.users(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  amount      integer not null default 0, -- paise
  buyer_phone text,
  answers     jsonb not null default '[]',
  status      text not null default 'confirmed' check (status in ('confirmed','cancelled','completed')),
  created_at  timestamptz not null default now()
);

-- ---------- Commerce (generalized) ----------
create table if not exists public.mp_orders (
  id                  uuid primary key default gen_random_uuid(),
  product_type        text not null check (product_type in ('course','event','locked','payment','booking')),
  product_id          uuid not null,
  owner_id            uuid not null,
  buyer_id            uuid not null references auth.users(id) on delete cascade,
  razorpay_order_id   text unique,
  razorpay_payment_id text,
  amount              integer not null default 0, -- paise
  coupon              text,
  buyer_phone         text,
  answers             jsonb not null default '[]',
  meta                jsonb not null default '{}', -- e.g. booking slot
  status              text not null default 'created' check (status in ('created','paid','failed')),
  commission_percentage integer,
  commission_amount   integer,
  creator_amount      integer,
  owner_plan          text,
  created_at          timestamptz not null default now()
);

create table if not exists public.mp_purchases (
  id           uuid primary key default gen_random_uuid(),
  product_type text not null check (product_type in ('course','event','locked','payment','booking')),
  product_id   uuid not null,
  owner_id     uuid not null,
  buyer_id     uuid not null references auth.users(id) on delete cascade,
  order_id     uuid references public.mp_orders(id),
  amount       integer not null default 0, -- paise
  coupon       text,
  buyer_phone  text,
  answers      jsonb not null default '[]',
  progress     jsonb not null default '{}',
  expires_at   timestamptz,
  commission_percentage integer,
  commission_amount   integer,
  creator_amount      integer,
  created_at   timestamptz not null default now(),
  unique (product_type, product_id, buyer_id)
);

-- ---------- Superadmin Settings ----------
create table if not exists public.mp_settings (
  id                              uuid primary key default gen_random_uuid(),
  key                             text unique not null,
  free_plan_commission_percentage integer not null default 30,
  pro_plan_commission_percentage  integer not null default 10,
  pro_plan_price                  integer not null default 49900, -- in paise (₹499)
  updated_at                      timestamptz not null default now()
);

-- ---------- Notifications ----------
create table if not exists public.mp_notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  message     text not null,
  type        text not null default 'info' check (type in ('info','success','warning','error')),
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists mp_notifications_user_idx on public.mp_notifications(user_id);
create index if not exists mp_notifications_created_idx on public.mp_notifications(created_at);

create index if not exists mp_courses_owner_idx on public.mp_courses(owner_id);
create index if not exists mp_products_owner_idx on public.mp_products(owner_id);
create index if not exists mp_purchases_owner_idx on public.mp_purchases(owner_id);
create index if not exists mp_purchases_buyer_idx on public.mp_purchases(buyer_id);
create index if not exists mp_bookings_owner_idx on public.mp_bookings(owner_id);

-- ---------- RLS ----------
alter table public.mp_profiles enable row level security;
alter table public.mp_courses enable row level security;
alter table public.mp_products enable row level security;
alter table public.mp_sessions enable row level security;
alter table public.mp_availability enable row level security;
alter table public.mp_bookings enable row level security;
alter table public.mp_orders enable row level security;
alter table public.mp_purchases enable row level security;
alter table public.mp_settings enable row level security;
alter table public.mp_notifications enable row level security;

drop policy if exists "profiles_public_read" on public.mp_profiles;
drop policy if exists "profiles_self_write" on public.mp_profiles;
drop policy if exists "profiles_self_update" on public.mp_profiles;

drop policy if exists "courses_read" on public.mp_courses;
drop policy if exists "courses_insert" on public.mp_courses;
drop policy if exists "courses_update" on public.mp_courses;
drop policy if exists "courses_delete" on public.mp_courses;

drop policy if exists "products_read" on public.mp_products;
drop policy if exists "products_insert" on public.mp_products;
drop policy if exists "products_update" on public.mp_products;
drop policy if exists "products_delete" on public.mp_products;

drop policy if exists "sessions_read" on public.mp_sessions;
drop policy if exists "sessions_write" on public.mp_sessions;
drop policy if exists "sessions_update" on public.mp_sessions;
drop policy if exists "sessions_delete" on public.mp_sessions;

drop policy if exists "availability_read" on public.mp_availability;
drop policy if exists "availability_upsert" on public.mp_availability;
drop policy if exists "availability_update" on public.mp_availability;

drop policy if exists "bookings_read" on public.mp_bookings;
drop policy if exists "bookings_owner_update" on public.mp_bookings;

drop policy if exists "orders_read" on public.mp_orders;

drop policy if exists "purchases_read" on public.mp_purchases;

drop policy if exists "settings_public_read" on public.mp_settings;

drop policy if exists "notifications_read" on public.mp_notifications;
drop policy if exists "notifications_insert" on public.mp_notifications;
drop policy if exists "notifications_update" on public.mp_notifications;

create policy "profiles_public_read" on public.mp_profiles for select using (true);
create policy "profiles_self_write" on public.mp_profiles for insert with check (user_id = auth.uid());
create policy "profiles_self_update" on public.mp_profiles for update using (user_id = auth.uid());

create policy "courses_read" on public.mp_courses for select using (status = 'published' or owner_id = auth.uid());
create policy "courses_insert" on public.mp_courses for insert with check (owner_id = auth.uid());
create policy "courses_update" on public.mp_courses for update using (owner_id = auth.uid());
create policy "courses_delete" on public.mp_courses for delete using (owner_id = auth.uid());

create policy "products_read" on public.mp_products for select using (status = 'published' or owner_id = auth.uid());
create policy "products_insert" on public.mp_products for insert with check (owner_id = auth.uid());
create policy "products_update" on public.mp_products for update using (owner_id = auth.uid());
create policy "products_delete" on public.mp_products for delete using (owner_id = auth.uid());

create policy "sessions_read" on public.mp_sessions for select using (true);
create policy "sessions_write" on public.mp_sessions for insert with check (owner_id = auth.uid());
create policy "sessions_update" on public.mp_sessions for update using (owner_id = auth.uid());
create policy "sessions_delete" on public.mp_sessions for delete using (owner_id = auth.uid());

create policy "availability_read" on public.mp_availability for select using (true);
create policy "availability_upsert" on public.mp_availability for insert with check (owner_id = auth.uid());
create policy "availability_update" on public.mp_availability for update using (owner_id = auth.uid());

-- bookings: owner or buyer can read; slot times readable by anyone for conflict checks via RPC below
drop policy if exists "bookings_read" on public.mp_bookings;
drop policy if exists "bookings_owner_update" on public.mp_bookings;
create policy "bookings_read" on public.mp_bookings for select using (owner_id = auth.uid() or buyer_id = auth.uid());
create policy "bookings_owner_update" on public.mp_bookings for update using (owner_id = auth.uid());

drop policy if exists "orders_read" on public.mp_orders;
create policy "orders_read" on public.mp_orders for select using (buyer_id = auth.uid() or owner_id = auth.uid());

drop policy if exists "purchases_read" on public.mp_purchases;
create policy "purchases_read" on public.mp_purchases for select using (buyer_id = auth.uid() or owner_id = auth.uid());

drop policy if exists "sub_orders_read" on public.mp_sub_orders;
drop policy if exists "sub_orders_insert" on public.mp_sub_orders;
create policy "sub_orders_read" on public.mp_sub_orders for select using (user_id = auth.uid());
create policy "sub_orders_insert" on public.mp_sub_orders for insert with check (user_id = auth.uid());

drop policy if exists "settings_public_read" on public.mp_settings;
create policy "settings_public_read" on public.mp_settings for select using (true);

drop policy if exists "notifications_read" on public.mp_notifications;
drop policy if exists "notifications_insert" on public.mp_notifications;
drop policy if exists "notifications_update" on public.mp_notifications;
create policy "notifications_read" on public.mp_notifications for select using (user_id = auth.uid());
create policy "notifications_insert" on public.mp_notifications for insert with check (user_id = auth.uid());
create policy "notifications_update" on public.mp_notifications for update using (user_id = auth.uid());

-- ---------- RPCs ----------
create or replace function public.mp_user_id_by_email(p_email text)
returns uuid language sql security definer set search_path = public, auth as $$
  select id from auth.users where email = p_email limit 1;
$$;
revoke execute on function public.mp_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.mp_user_id_by_email(text) to service_role;

create or replace function public.mp_increment_views(p_table text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_table = 'course' then
    update public.mp_courses set views = views + 1 where id = p_id and status = 'published';
  else
    update public.mp_products set views = views + 1 where id = p_id and status = 'published';
  end if;
end; $$;
grant execute on function public.mp_increment_views(text, uuid) to anon, authenticated;

create or replace function public.mp_mark_lesson(p_purchase_id uuid, p_lesson_id text, p_done boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.mp_purchases
  set progress = case when p_done then coalesce(progress,'{}'::jsonb) || jsonb_build_object(p_lesson_id,true)
                      else coalesce(progress,'{}'::jsonb) - p_lesson_id end
  where id = p_purchase_id and buyer_id = auth.uid()
    and (expires_at is null or expires_at > now());
end; $$;
grant execute on function public.mp_mark_lesson(uuid, text, boolean) to authenticated;

-- busy slots for a host on a given day (privacy-safe: only times, no identities)
create or replace function public.mp_busy_slots(p_owner uuid, p_from timestamptz, p_to timestamptz)
returns table(starts_at timestamptz, ends_at timestamptz)
language sql security definer set search_path = public as $$
  select starts_at, ends_at from public.mp_bookings
  where owner_id = p_owner and status = 'confirmed'
    and starts_at < p_to and ends_at > p_from;
$$;
grant execute on function public.mp_busy_slots(uuid, timestamptz, timestamptz) to anon, authenticated;

-- ---------- Storage ----------
insert into storage.buckets (id, name, public) values ('SuperCreators','SuperCreators', true)
on conflict (id) do nothing;

drop policy if exists "mp_storage_public_read" on storage.objects;
drop policy if exists "mp_storage_own_insert" on storage.objects;
drop policy if exists "mp_storage_own_delete" on storage.objects;

create policy "mp_storage_public_read" on storage.objects for select using (bucket_id = 'SuperCreators');
create policy "mp_storage_own_insert" on storage.objects for insert with check (
  bucket_id = 'SuperCreators' and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "mp_storage_own_delete" on storage.objects for delete using (
  bucket_id = 'SuperCreators' and (storage.foldername(name))[1] = auth.uid()::text
);

