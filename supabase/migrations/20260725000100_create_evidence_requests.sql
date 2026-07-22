-- Migration: Create evidence_requests table foundation
-- Timestamp: 20260725000100 (added to sync repository with existing DB state)

-- Create table if it does not already exist
CREATE TABLE IF NOT EXISTS evidence_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_evidence_requests_engagement
    FOREIGN KEY (engagement_id) REFERENCES audit_engagements(id) ON DELETE CASCADE,
  CONSTRAINT fk_evidence_requests_plan
    FOREIGN KEY (plan_id) REFERENCES audit_evidence_plan(id) ON DELETE CASCADE,
  CONSTRAINT uq_evidence_requests_plan UNIQUE (plan_id)
);

-- Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_evidence_requests_engagement_id ON evidence_requests (engagement_id);
CREATE INDEX IF NOT EXISTS idx_evidence_requests_plan_id ON evidence_requests (plan_id);
CREATE INDEX IF NOT EXISTS idx_evidence_requests_status ON evidence_requests (status);

-- Ensure the updated_at trigger exists; create it only if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'evidence_requests_updated_at'
  ) THEN
    CREATE TRIGGER evidence_requests_updated_at
      BEFORE UPDATE ON evidence_requests
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
