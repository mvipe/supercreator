-- =============================================================
-- SuperCreators — Store builder add-on.
-- Run AFTER everything.sql, once. Idempotent (safe to re-run).
-- =============================================================

-- Appearance / theme
alter table public.mp_profiles add column if not exists theme text not null default 'classic';
alter table public.mp_profiles add column if not exists brand_color text not null default '#2E6EF7';
alter table public.mp_profiles add column if not exists font text not null default 'Inter';
-- Optional custom background image (public URL) that overrides the theme surface.
alter table public.mp_profiles add column if not exists bg_image text default '';

-- Store content (custom links / buttons the creator adds to their bio page)
alter table public.mp_profiles add column if not exists links jsonb not null default '[]';

-- SEO / meta
alter table public.mp_profiles add column if not exists meta_title text default '';
alter table public.mp_profiles add column if not exists meta_description text default '';

-- Store settings
alter table public.mp_profiles add column if not exists sensitive_content boolean not null default false;
alter table public.mp_profiles add column if not exists column_layout text not null default 'single';
alter table public.mp_profiles add column if not exists fb_pixel text default '';
alter table public.mp_profiles add column if not exists ga_id text default '';

