-- =============================================================
-- SuperCreators — AutoDM (Instagram comment-to-DM automation).
-- Run AFTER schema.sql, once.
-- =============================================================

-- ---------- Connected Instagram accounts ----------
create table if not exists public.mp_ig_accounts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  ig_user_id          text not null,                 -- Instagram professional account id (webhook entry.id)
  username            text,
  name                text,
  profile_picture_url text,
  followers_count     integer,
  access_token        text not null,                 -- long-lived token (server-only, never sent to the client)
  token_expires_at    timestamptz,
  -- 'instagram' = Instagram Login token  -> graph.instagram.com
  -- 'facebook'  = Facebook Page token    -> graph.facebook.com
  token_kind          text not null default 'instagram' check (token_kind in ('instagram','facebook')),
  page_id             text,                          -- only for token_kind = 'facebook'
  active              boolean not null default true,
  last_error          text,
  connected_at        timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, ig_user_id)
);

-- One creator owns a given IG account at a time — the webhook resolves by this.
create unique index if not exists mp_ig_accounts_active_ig_idx
  on public.mp_ig_accounts(ig_user_id) where active;
create index if not exists mp_ig_accounts_user_idx on public.mp_ig_accounts(user_id);

alter table public.mp_ig_accounts enable row level security;

-- Creators can see that their account is connected. The token column is never
-- selected by client code (API routes use the service role), but keep reads
-- limited to the owner regardless.
drop policy if exists "ig_accounts_read_own" on public.mp_ig_accounts;
create policy "ig_accounts_read_own" on public.mp_ig_accounts
  for select using (user_id = auth.uid());

-- ---------- AutoDM rules ----------
create table if not exists public.mp_autodm_rules (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  ig_account_id     uuid references public.mp_ig_accounts(id) on delete cascade,
  name              text not null default 'Untitled automation',
  -- null media_id = applies to every post / reel on the account
  media_id          text,
  media_permalink   text,
  media_thumbnail   text,
  media_caption     text,
  keywords          text[] not null default '{}',
  -- contains: keyword appears anywhere · exact: whole comment equals keyword
  -- any: fire on every comment (no keyword needed)
  match_mode        text not null default 'contains' check (match_mode in ('contains','exact','any')),
  dm_text           text not null default '',
  button_label      text,
  button_url        text,
  reply_to_comment  boolean not null default true,
  comment_replies   text[] not null default '{}',    -- rotated at random
  once_per_user     boolean not null default false,  -- never DM the same person twice for this rule
  active            boolean not null default true,
  sent_count        integer not null default 0,
  last_sent_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists mp_autodm_rules_user_idx on public.mp_autodm_rules(user_id);
create index if not exists mp_autodm_rules_acct_idx on public.mp_autodm_rules(ig_account_id, active);
create index if not exists mp_autodm_rules_media_idx on public.mp_autodm_rules(media_id);

alter table public.mp_autodm_rules enable row level security;
drop policy if exists "autodm_rules_read_own" on public.mp_autodm_rules;
create policy "autodm_rules_read_own" on public.mp_autodm_rules
  for select using (user_id = auth.uid());

-- ---------- Activity log ----------
create table if not exists public.mp_autodm_logs (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  rule_id            uuid references public.mp_autodm_rules(id) on delete set null,
  ig_account_id      uuid references public.mp_ig_accounts(id) on delete cascade,
  media_id           text,
  comment_id         text not null unique,           -- dedupes Meta's webhook retries
  commenter_id       text,
  commenter_username text,
  comment_text       text,
  matched_keyword    text,
  -- sent: DM delivered · replied: public comment reply posted too
  -- skipped: no rule matched / duplicate recipient · failed: Graph API error
  status             text not null default 'sent' check (status in ('sent','replied','skipped','failed')),
  error              text,
  created_at         timestamptz not null default now()
);
create index if not exists mp_autodm_logs_user_idx on public.mp_autodm_logs(user_id, created_at desc);
create index if not exists mp_autodm_logs_rule_user_idx on public.mp_autodm_logs(rule_id, commenter_id);

alter table public.mp_autodm_logs enable row level security;
drop policy if exists "autodm_logs_read_own" on public.mp_autodm_logs;
create policy "autodm_logs_read_own" on public.mp_autodm_logs
  for select using (user_id = auth.uid());
