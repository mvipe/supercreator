-- =============================================================
-- SuperCreators — admin-controlled Refer & Earn. Run AFTER payouts.sql.
-- Idempotent (safe to re-run).
--
-- • mp_referral_settings  one row the admin edits (on/off, reward, trigger)
-- • mp_referral_rewards   one row per reward earned (pending → approved/rejected)
-- • mp_profiles.referral_disabled   per-creator kill switch
-- • Approved rewards are added to the creator's withdrawable balance, so they
--   go out through the normal Payouts flow.
-- =============================================================

create table if not exists public.mp_referral_settings (
  id                     int primary key default 1,
  enabled                boolean not null default true,
  -- what triggers a reward
  trigger                text not null default 'first_pro'
                           check (trigger in ('signup', 'first_pro', 'every_pro')),
  -- how big the reward is
  reward_type            text not null default 'flat' check (reward_type in ('flat', 'percent')),
  reward_amount          integer not null default 5000,   -- paise, used when reward_type = 'flat'
  reward_percent         numeric not null default 20,     -- % of the referred creator's Pro payment
  auto_approve           boolean not null default false,  -- false = admin approves each reward
  max_rewards_per_user   integer not null default 0,      -- 0 = unlimited
  headline               text not null default 'Invite creators, earn rewards',
  terms                  text not null default '',
  updated_at             timestamptz not null default now(),
  updated_by             uuid,
  constraint mp_referral_settings_one_row check (id = 1)
);
insert into public.mp_referral_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.mp_referral_rewards (
  id            uuid primary key default gen_random_uuid(),
  referrer_id   uuid not null references auth.users(id) on delete cascade,
  referred_id   uuid references auth.users(id) on delete set null,
  amount        integer not null check (amount >= 0),          -- paise
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  source        text not null default 'manual' check (source in ('signup', 'subscription', 'manual')),
  sub_order_id  uuid,
  note          text default '',
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid
);
create index if not exists mp_referral_rewards_referrer_idx on public.mp_referral_rewards(referrer_id);
create index if not exists mp_referral_rewards_status_idx   on public.mp_referral_rewards(status);
-- One signup reward per referred creator, one reward per subscription payment.
create unique index if not exists mp_referral_rewards_signup_uq
  on public.mp_referral_rewards(referred_id) where source = 'signup';
create unique index if not exists mp_referral_rewards_order_uq
  on public.mp_referral_rewards(sub_order_id) where sub_order_id is not null;

alter table public.mp_referral_settings enable row level security;
alter table public.mp_referral_rewards  enable row level security;

-- Settings are public-read (the creator page shows the offer); writes are service-role only.
drop policy if exists "referral_settings_read" on public.mp_referral_settings;
create policy "referral_settings_read" on public.mp_referral_settings for select using (true);

-- Creators read their own rewards; all writes are service-role only.
drop policy if exists "referral_rewards_read_own" on public.mp_referral_rewards;
create policy "referral_rewards_read_own" on public.mp_referral_rewards for select using (referrer_id = auth.uid());

alter table public.mp_profiles add column if not exists referral_disabled boolean not null default false;
create index if not exists mp_profiles_referred_by_idx on public.mp_profiles(referred_by);

-- Approved referral rewards count as earnings, so they're withdrawable.
-- Also: sales now count what the creator KEEPS (creator_amount, net of the
-- platform fee) instead of the gross amount — the old payouts.sql version let
-- a creator withdraw the platform's commission too. Needs revenue_and_covers.sql
-- (bookings.creator_amount) to have been run first.
create or replace function public.mp_lifetime_earned(p_creator uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select
    coalesce((select sum(coalesce(creator_amount, amount)) from public.mp_purchases where owner_id = p_creator), 0)
    + coalesce((select sum(coalesce(creator_amount, amount)) from public.mp_bookings where owner_id = p_creator and status <> 'cancelled'), 0)
    + coalesce((select sum(amount) from public.mp_referral_rewards where referrer_id = p_creator and status = 'approved'), 0);
$$;
grant execute on function public.mp_lifetime_earned(uuid) to authenticated, service_role;
