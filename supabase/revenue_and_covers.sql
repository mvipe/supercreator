-- =============================================================
-- SuperCreators — revenue split on bookings + cover art on tutorials.
-- Run AFTER everything.sql. Idempotent (safe to re-run).
--
-- WHY:
--  1. mp_bookings only ever stored the buyer's gross `amount`. Every
--     "revenue" figure that included a booking (home page, admin leaderboard,
--     creator detail) therefore showed money the creator never received.
--     These three columns mirror what mp_purchases already stores.
--  2. mp_tutorials had no artwork, so every card in the creator Learn grid
--     rendered as the same purple gradient.
--
-- The app degrades gracefully without this file (it falls back to the legacy
-- shape and derives the fee where it can), but numbers on bookings taken
-- BEFORE it runs stay gross — there is no fee recorded to subtract.
-- =============================================================

-- ---------- 1. Commission split on bookings ----------
alter table public.mp_bookings add column if not exists commission_percentage numeric not null default 0;
alter table public.mp_bookings add column if not exists commission_amount     bigint  not null default 0;
alter table public.mp_bookings add column if not exists creator_amount        bigint;

-- Backfill: existing bookings had no fee taken, so the creator kept it all.
update public.mp_bookings
   set creator_amount = amount
 where creator_amount is null;

comment on column public.mp_bookings.commission_amount is
  'Platform fee in paise. amount - commission_amount = creator_amount.';
comment on column public.mp_bookings.creator_amount is
  'What the creator keeps, in paise. This is what every "revenue" number shows.';

-- ---------- 2. Cover art for Learn tutorials ----------
alter table public.mp_tutorials add column if not exists cover_image text default '';

comment on column public.mp_tutorials.cover_image is
  'Optional 16:9 cover for the Learn grid. Blank falls back to the video thumbnail.';

-- ---------- 3. Realtime for the live revenue + leaderboard views ----------
-- The Payments page and the admin leaderboard subscribe to inserts so a new
-- sale appears without a manual refresh. Adding a table twice raises
-- "already member of publication", so each is guarded.
do $$
begin
  begin
    alter publication supabase_realtime add table public.mp_purchases;
  exception when duplicate_object then null; when undefined_object then null; end;

  begin
    alter publication supabase_realtime add table public.mp_bookings;
  exception when duplicate_object then null; when undefined_object then null; end;
end $$;
