-- Migration: create_quickbooks_tokens
-- This migration creates a table to store QuickBooks OAuth tokens.
-- The table includes fields for the realm (company) identifier, access token,
-- refresh token, token expiry, and timestamps.

 -- Enable uuid generation extensions
 create extension if not exists "pgcrypto";

 create table if not exists quickbooks_tokens (
   id uuid default gen_random_uuid() primary key,
  realm_id text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unique (realm_id)
);

-- Function to update the updated_at column on row updates
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically set updated_at
create trigger quickbooks_tokens_updated_at
  before update on quickbooks_tokens
  for each row execute function set_updated_at();
