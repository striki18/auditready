-- Migration: Update evidence_requests status default and existing rows
-- Timestamp: 20260730000000

-- 1. Change default value for status column to 'requested'
ALTER TABLE evidence_requests ALTER COLUMN status SET DEFAULT 'requested';

-- 2. Update any existing rows that still have the old 'pending' status
UPDATE evidence_requests SET status = 'requested' WHERE status = 'pending';

-- Note: No need to modify indexes as they remain valid.
