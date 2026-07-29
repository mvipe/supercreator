-- Sub-admins: creators the super-admin promotes to full admin access (except
-- the ability to create/remove other admins). They also get free Pro.
alter table mp_profiles add column if not exists is_admin boolean not null default false;
