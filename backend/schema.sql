create extension if not exists "pgcrypto";

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists email_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_otps_email_created_idx
  on email_otps (email, created_at desc);

create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  session_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists user_sessions_user_id_idx
  on user_sessions (user_id);

create table if not exists user_profiles (
  user_id uuid primary key references app_users(id) on delete cascade,
  profile_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
