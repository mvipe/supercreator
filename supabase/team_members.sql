-- Per-creator sub-admins. A sub-admin logs in with their own email/password
-- and operates INSIDE the owner's account, limited to the granted permissions.
create table if not exists mp_team_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  name text,
  email text,
  permissions jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(member_id)               -- a sub-admin belongs to exactly one creator
);
create index if not exists mp_team_members_owner_idx on mp_team_members(owner_id);

-- Let RLS in the client see the owner's rows for an active sub-admin. These are
-- ADDITIONAL policies (combined with OR), so existing owner-only policies stay.
-- A sub-admin's auth.uid() maps to their owner via mp_team_members.
create or replace function mp_team_owner() returns setof uuid
  language sql stable security definer as $$
  select owner_id from mp_team_members where member_id = auth.uid() and active
$$;

do $$
declare t text;
begin
  -- owner_id-keyed tables
  foreach t in array array['mp_courses','mp_products','mp_sessions','mp_bookings','mp_availability','mp_purchases','mp_visits','mp_clicks','mp_orders']
  loop
    begin
      execute format('drop policy if exists %I on %I', t||'_team_access', t);
      execute format(
        'create policy %I on %I for all using (owner_id in (select mp_team_owner())) with check (owner_id in (select mp_team_owner()))',
        t||'_team_access', t);
    exception when undefined_table then null; end;
  end loop;

  -- creator_id-keyed
  begin
    execute 'drop policy if exists mp_payouts_team_access on mp_payouts';
    execute 'create policy mp_payouts_team_access on mp_payouts for all using (creator_id in (select mp_team_owner())) with check (creator_id in (select mp_team_owner()))';
  exception when undefined_table then null; end;

  -- profiles are keyed by user_id
  begin
    execute 'drop policy if exists mp_profiles_team_access on mp_profiles';
    execute 'create policy mp_profiles_team_access on mp_profiles for all using (user_id in (select mp_team_owner())) with check (user_id in (select mp_team_owner()))';
  exception when undefined_table then null; end;
end $$;
