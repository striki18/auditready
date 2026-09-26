-- Migration: add_review_candidate_txn_ids
-- Adds the review_candidate_txn_ids column to qbo_evidence_register table

ALTER TABLE qbo_evidence_register
ADD COLUMN IF NOT EXISTS review_candidate_txn_ids TEXT[] DEFAULT ARRAY[]::TEXT[];