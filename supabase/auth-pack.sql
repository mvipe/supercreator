-- =============================================================
-- SuperCreators — auth pack (email/password + phone lookup).
-- Idempotent. Run in Supabase SQL Editor.
-- =============================================================

-- Look up a user id by phone number (for OTP login of accounts created via
-- email signup, where the email is real rather than a phone alias).
create or replace function public.mp_user_id_by_phone(p_phone text)
returns uuid language sql security definer set search_path = public, auth as $$
  select id from auth.users
  where phone = p_phone
     or raw_user_meta_data->>'phone' = p_phone
  limit 1;
$$;
revoke execute on function public.mp_user_id_by_phone(text) from public, anon, authenticated;
grant execute on function public.mp_user_id_by_phone(text) to service_role;

-- Email of a user by id (server uses this to mint a login token after OTP).
create or replace function public.mp_email_by_user_id(p_id uuid)
returns text language sql security definer set search_path = public, auth as $$
  select email from auth.users where id = p_id limit 1;
$$;
revoke execute on function public.mp_email_by_user_id(uuid) from public, anon, authenticated;
grant execute on function public.mp_email_by_user_id(uuid) to service_role;
