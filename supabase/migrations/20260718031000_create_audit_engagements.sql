-- Migration: create_audit_engagements
-- Creates the audit_engagements table for storing audit engagement records.

CREATE TABLE audit_engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id text NOT NULL,
  company_name text NOT NULL,
  audit_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Use the existing set_updated_at() trigger function to keep updated_at current.
CREATE TRIGGER audit_engagements_updated_at
  BEFORE UPDATE ON audit_engagements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
