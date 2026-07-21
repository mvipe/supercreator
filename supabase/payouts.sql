-- =============================================================
-- SuperCreators — Payouts add-on. Run AFTER schema.sql, once.
-- =============================================================

-- Admin flag + saved payout method on profiles
alter table public.mp_profiles add column if not exists is_admin boolean not null default false;
alter table public.mp_profiles add column if not exists payout_method jsonb not null default '{}';

-- Payout requests
create table if not exists public.mp_payouts (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references auth.users(id) on delete cascade,
  amount       integer not null,                          -- paise
  method       jsonb not null default '{}',               -- {type:'upi', upi:'x@bank'} or {type:'bank', ...}
  status       text not null default 'requested'
                 check (status in ('requested','approved','processing','paid','rejected')),
  creator_note text,
  admin_note   text,
  reference    text,                                       -- bank/UPI txn reference
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid
);
create index if not exists mp_payouts_creator_idx on public.mp_payouts(creator_id);
create index if not exists mp_payouts_status_idx  on public.mp_payouts(status);

alter table public.mp_payouts enable row level security;

-- Creators can read their own payout rows. All WRITES happen via service role only.
create policy "payouts_read_own" on public.mp_payouts
  for select using (creator_id = auth.uid());

-- Lifetime earned (paise) across every product type + bookings, for the current user.
create or replace function public.mp_lifetime_earned(p_creator uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select
    coalesce((select sum(amount) from public.mp_purchases where owner_id = p_creator), 0)
    + coalesce((select sum(amount) from public.mp_bookings where owner_id = p_creator and status <> 'cancelled'), 0);
$$;
grant execute on function public.mp_lifetime_earned(uuid) to authenticated, service_role;

-- Money already locked up in payout requests (everything except rejected).
create or replace function public.mp_reserved_payouts(p_creator uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce((select sum(amount) from public.mp_payouts
                   where creator_id = p_creator and status <> 'rejected'), 0);
$$;
grant execute on function public.mp_reserved_payouts(uuid) to authenticated, service_role;

-- Available balance for the caller (paise): lifetime earned minus reserved.
create or replace function public.mp_available_balance()
returns bigint language sql stable security definer set search_path = public as $$
  select greatest(0, public.mp_lifetime_earned(auth.uid()) - public.mp_reserved_payouts(auth.uid()));
$$;
grant execute on function public.mp_available_balance() to authenticated;

-- To make yourself an admin (replace the username):
--   update public.mp_profiles set is_admin = true
--   where user_id = (select user_id from public.mp_profiles where username = 'your-username');

