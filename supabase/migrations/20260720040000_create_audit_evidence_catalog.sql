-- Migration: create_audit_evidence_catalog
-- Creates the audit_evidence_catalog table for storing master evidence list.

CREATE TABLE IF NOT EXISTS audit_evidence_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  evidence_name text NOT NULL UNIQUE,
  description text NOT NULL,
  owner_type text NOT NULL,
  auto_collectable boolean NOT NULL,
  display_order integer NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Use the existing set_updated_at() trigger function to keep updated_at current.
CREATE TRIGGER audit_evidence_catalog_updated_at
  BEFORE UPDATE ON audit_evidence_catalog
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed data (id will be generated automatically)
INSERT INTO audit_evidence_catalog (
  category,
  evidence_name,
  description,
  owner_type,
  auto_collectable,
  display_order
) VALUES
  ('Financial Records', 'Chart of Accounts', 'Complete chart of accounts from QuickBooks.', 'QuickBooks', true, 1),
  ('Financial Records', 'Trial Balance', 'Trial balance for the audit period.', 'QuickBooks', true, 2),
  ('Financial Records', 'General Ledger', '', 'QuickBooks', true, 3),
  ('Financial Records', 'Customers', '', 'QuickBooks', true, 4),
  ('Financial Records', 'Vendors', '', 'QuickBooks', true, 5),
  ('Financial Records', 'Invoices', '', 'QuickBooks', true, 6),
  ('Financial Records', 'Bills', '', 'QuickBooks', true, 7),
  ('Financial Records', 'Payments', '', 'QuickBooks', true, 8),
  ('External Documents', 'Bank Statements', 'Official bank statements.', 'Bank', false, 9),
  ('External Documents', 'Payroll Reports', '', 'Payroll Provider', false, 10),
  ('External Documents', 'Loan Agreements', '', 'Client', false, 11),
  ('External Documents', 'Lease Agreements', '', 'Client', false, 12),
  ('External Documents', 'Insurance Certificates', '', 'Insurance Provider', false, 13),
  ('External Documents', 'Board Minutes', '', 'Company Secretary', false, 14)
ON CONFLICT DO NOTHING;
