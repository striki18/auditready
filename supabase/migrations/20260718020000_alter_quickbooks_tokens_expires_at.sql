-- Migration: alter_quickbooks_tokens_expires_at
-- Change expires_at column from bigint (epoch seconds) to timestamptz for proper timestamp handling.

ALTER TABLE quickbooks_tokens
  ALTER COLUMN expires_at TYPE timestamp with time zone
  USING to_timestamp(expires_at);
