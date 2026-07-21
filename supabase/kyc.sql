-- =============================================================
-- SuperCreators — Manual KYC add-on. Run once. Idempotent.
-- =============================================================

create table if not exists public.mp_kyc (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  status        text not null default 'not_started'
                  check (status in ('not_started','under_review','verified','rejected')),
  legal_name    text default '',
  pan           text default '',
  gst           text default '',
  bank_account  text default '',
  ifsc          text default '',
  bank_holder   text default '',
  doc_url       text default '',        -- uploaded ID/PAN document
  admin_note    text default '',
  submitted_at  timestamptz,
  reviewed_at   timestamptz,
  reviewed_by   uuid,
  updated_at    timestamptz not null default now()
);

alter table public.mp_kyc enable row level security;

-- Creators read + upsert their own KYC row. All status changes happen server-side (service role).
drop policy if exists "kyc_read_own"   on public.mp_kyc;
drop policy if exists "kyc_insert_own" on public.mp_kyc;
drop policy if exists "kyc_update_own" on public.mp_kyc;
create policy "kyc_read_own"   on public.mp_kyc for select using (user_id = auth.uid());
create policy "kyc_insert_own" on public.mp_kyc for insert with check (user_id = auth.uid());
create policy "kyc_update_own" on public.mp_kyc for update using (user_id = auth.uid());

-- Convenience column on profiles so lists can show KYC state without a join.
alter table public.mp_profiles add column if not exists kyc_status text not null default 'not_started';

