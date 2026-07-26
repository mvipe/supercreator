-- Platform Settings and Admin Config
create table if not exists public.mp_platform_settings (
  id                   int primary key default 1,
  
  -- Subscription Plans Configuration
  free_plan_commission      integer not null default 30,  -- 30% commission for free users
  pro_plan_price            decimal(10, 2) not null default 4.99,  -- Monthly price
  pro_plan_commission       integer not null default 10,  -- 10% commission for pro users
  
  updated_at             timestamptz not null default now(),
  updated_by             uuid references auth.users(id) on delete set null,
  
  constraint only_one_row check (id = 1)  -- Only one row
);

-- Notifications table for admin to broadcast to users
create table if not exists public.mp_notifications (
  id                   uuid primary key default gen_random_uuid(),
  
  -- Notification content
  title                text not null,
  message              text not null,
  type                 text not null check (type in ('info', 'success', 'warning', 'error')),
  
  -- Targeting
  target_type          text not null default 'all' check (target_type in ('all', 'free_users', 'pro_users', 'specific_user')),
  target_user_id       uuid references auth.users(id) on delete cascade,  -- for specific_user
  
  -- Admin info
  created_by           uuid not null references auth.users(id) on delete cascade,
  is_global            boolean default true,  -- shown to all matching users
  
  -- Status
  published            boolean default true,
  expires_at           timestamptz,
  
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.mp_notifications
  add column if not exists target_type text not null default 'all' check (target_type in ('all', 'free_users', 'pro_users', 'specific_user')),
  add column if not exists target_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists created_by uuid references auth.users(id) on delete cascade,
  add column if not exists is_global boolean default true,
  add column if not exists published boolean default true,
  add column if not exists expires_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Track user notifications (read/unread status)
create table if not exists public.mp_user_notifications (
  id                   uuid primary key default gen_random_uuid(),
  notification_id      uuid not null references mp_notifications(id) on delete cascade,
  user_id              uuid not null references auth.users(id) on delete cascade,
  read_at              timestamptz,

  created_at           timestamptz not null default now(),
  unique(notification_id, user_id)
);

-- Enable RLS
alter table public.mp_platform_settings enable row level security;
alter table public.mp_notifications enable row level security;
alter table public.mp_user_notifications enable row level security;

-- RLS for platform settings (superadmin only)
create policy "superadmin_view_settings" on public.mp_platform_settings
  for select using (
    auth.uid() in (select user_id from mp_profiles where plan = 'admin')
  );

create policy "superadmin_update_settings" on public.mp_platform_settings
  for update using (
    auth.uid() in (select user_id from mp_profiles where plan = 'admin')
  );

-- RLS for notifications (admins create, users read)
create policy "admins_create_notifications" on public.mp_notifications
  for insert with check (
    created_by = auth.uid() and
    created_by in (select user_id from mp_profiles where plan = 'admin')
  );

create policy "users_view_notifications" on public.mp_notifications
  for select using (published = true);

-- RLS for user notifications
create policy "users_view_own_notifications" on public.mp_user_notifications
  for select using (user_id = auth.uid());

create policy "admins_manage_notifications" on public.mp_user_notifications
  for all using (
    auth.uid() in (select user_id from mp_profiles where plan = 'admin')
  );

-- Indexes
create index if not exists idx_notifications_created_by on public.mp_notifications(created_by);
create index if not exists idx_notifications_target_user on public.mp_notifications(target_user_id);
create index if not exists idx_user_notif_unread on public.mp_user_notifications(user_id) where read_at is null;
create index if not exists idx_platform_settings_id on public.mp_platform_settings(id);
