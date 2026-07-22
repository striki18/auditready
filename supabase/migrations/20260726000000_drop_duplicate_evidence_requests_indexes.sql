-- Migration: Remove duplicate indexes on evidence_requests table
-- Timestamp: 20260726000000

-- Drop indexes that were unintentionally created by a previous migration.
-- These indexes have the "idx_" prefix and duplicate functionality of the
-- existing indexes (evidence_requests_*_idx).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_evidence_requests_engagement_id') THEN
    EXECUTE 'DROP INDEX idx_evidence_requests_engagement_id';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_evidence_requests_plan_id') THEN
    EXECUTE 'DROP INDEX idx_evidence_requests_plan_id';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_evidence_requests_status') THEN
    EXECUTE 'DROP INDEX idx_evidence_requests_status';
  END IF;
END $$;
