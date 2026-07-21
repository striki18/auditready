-- Migration: add_realm_id_to_evidence_history
-- Adds a nullable realm_id column, populates it, enforces NOT NULL, and creates an index.

-- 1. Add the column (nullable for now)
ALTER TABLE evidence_history
  ADD COLUMN IF NOT EXISTS realm_id text;

-- 2. Populate existing rows with the sandbox realm id
UPDATE evidence_history
SET realm_id = '9341457539527702'
WHERE realm_id IS NULL;

-- 3. Enforce NOT NULL constraint
ALTER TABLE evidence_history
  ALTER COLUMN realm_id SET NOT NULL;

-- 4. Create an index for fast lookup by realm_id
CREATE INDEX IF NOT EXISTS idx_evidence_history_realm_id ON evidence_history (realm_id);
