-- Migration: alter_qbo_evidence_register_unique_txn
-- Replaces the composite unique constraint (realm_id, qbo_txn_id, attachable_id)
-- with a partial unique index on (realm_id, qbo_txn_id) WHERE qbo_txn_id IS NOT NULL.
-- This enforces at most ONE register row per QBO transaction per realm,
-- regardless of how many attachments it has.

-- Step 1: Drop the old unique constraint
ALTER TABLE qbo_evidence_register
DROP CONSTRAINT IF EXISTS ux_qbo_evidence_register_txn_attachment;

-- Step 2: Create the new partial unique index
CREATE UNIQUE INDEX ux_qbo_evidence_register_one_per_txn
  ON qbo_evidence_register (realm_id, qbo_txn_id)
  WHERE qbo_txn_id IS NOT NULL;