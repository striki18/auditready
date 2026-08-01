-- Migration: create evidence_packages table to store generated evidence packages
-- Timestamp: 20260732000000 (generated for Milestone 5.4.7)

CREATE TABLE IF NOT EXISTS evidence_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_evidence_packages_engagement
    FOREIGN KEY (engagement_id) REFERENCES audit_engagements(id) ON DELETE CASCADE
);

-- Index for fast lookup by engagement_id
CREATE INDEX IF NOT EXISTS idx_evidence_packages_engagement_id
  ON evidence_packages(engagement_id);
