-- =============================================================
-- SuperCreators — enable Postgres realtime for the tables the UI subscribes to.
-- Run once in the Supabase SQL editor. Idempotent (safe to re-run).
--
-- WHY: the dashboard overview, the public storefront and the admin leaderboard
-- now update live instead of after a long cache/poll delay. That relies on
-- Supabase realtime broadcasting row changes on these tables. A table that is
-- not in the `supabase_realtime` publication simply never fires an event, so
-- the client silently falls back to its slower focus/interval refresh.
--
-- (mp_purchases and mp_bookings are also added by revenue_and_covers.sql — the
-- guards below make adding them again harmless.)
-- =============================================================

do $$
declare t text;
begin
  foreach t in array array[
    'mp_purchases',   -- sales → dashboard, payments, leaderboard
    'mp_bookings',    -- session bookings → same
    'mp_visits',      -- store visits → dashboard "Store Visits"
    'mp_courses',     -- publish/unpublish a course → storefront + web app
    'mp_products'     -- publish/unpublish a product → storefront
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;   -- already in the publication
      when undefined_table  then null;   -- table not created yet
    end;
  end loop;
end $$;

-- Realtime respects RLS. The public storefront reads courses/products with the
-- anon key, so make sure an anon SELECT policy exists for published rows (these
-- mirror the read policies the app already relies on; harmless if present).
do $$
begin
  begin
    execute 'create policy mp_courses_public_read on public.mp_courses for select using (status = ''published'')';
  exception when duplicate_object then null; when undefined_table then null; end;
  begin
    execute 'create policy mp_products_public_read on public.mp_products for select using (status = ''published'')';
  exception when duplicate_object then null; when undefined_table then null; end;
end $$;
