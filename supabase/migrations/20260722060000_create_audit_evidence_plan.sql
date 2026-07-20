-- Migration: create_audit_evidence_plan
-- Creates the audit_evidence_plan table linking engagements to catalog items.

CREATE TABLE IF NOT EXISTS audit_evidence_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL,
  catalog_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT audit_evidence_plan_unique UNIQUE (engagement_id, catalog_id),
  CONSTRAINT audit_evidence_plan_engagement_fk FOREIGN KEY (engagement_id)
    REFERENCES audit_engagements(id) ON DELETE CASCADE,
  CONSTRAINT audit_evidence_plan_catalog_fk FOREIGN KEY (catalog_id)
    REFERENCES audit_evidence_catalog(id)
);

-- Reuse existing set_updated_at() trigger function
CREATE TRIGGER audit_evidence_plan_updated_at
  BEFORE UPDATE ON audit_evidence_plan
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_audit_evidence_plan_engagement_id ON audit_evidence_plan (engagement_id);
CREATE INDEX IF NOT EXISTS idx_audit_evidence_plan_catalog_id ON audit_evidence_plan (catalog_id);
CREATE INDEX IF NOT EXISTS idx_audit_evidence_plan_status ON audit_evidence_plan (status);
