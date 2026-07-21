-- Migration: create_evidence_history
-- Creates the evidence_history table to store historical evidence ownership information.

CREATE TABLE IF NOT EXISTS evidence_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id uuid NOT NULL REFERENCES audit_evidence_catalog(id),
  company_name text NOT NULL,
  fiscal_year integer NOT NULL,
  provider_name text NOT NULL,
  job_title text,
  department text,
  provider_email text,
  days_to_receive integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_evidence_history_catalog_id ON evidence_history (catalog_id);
CREATE INDEX IF NOT EXISTS idx_evidence_history_company_name ON evidence_history (company_name);
CREATE INDEX IF NOT EXISTS idx_evidence_history_fiscal_year ON evidence_history (fiscal_year);
CREATE INDEX IF NOT EXISTS idx_evidence_history_provider_name ON evidence_history (provider_name);

-- Seed data to demonstrate historical patterns
INSERT INTO evidence_history (catalog_id, company_name, fiscal_year, provider_name, job_title, department, days_to_receive)
SELECT ec.id, 'Sandbox Company US d89d', 2025, 'Jane Smith', 'Controller', 'Finance', 3
FROM audit_evidence_catalog ec WHERE ec.evidence_name = 'Bank Statements' ON CONFLICT DO NOTHING;

INSERT INTO evidence_history (catalog_id, company_name, fiscal_year, provider_name, job_title, department, days_to_receive)
SELECT ec.id, 'Sandbox Company US d89d', 2024, 'Mark Wilson', 'Senior Accountant', 'Finance', 6
FROM audit_evidence_catalog ec WHERE ec.evidence_name = 'Bank Statements' ON CONFLICT DO NOTHING;

INSERT INTO evidence_history (catalog_id, company_name, fiscal_year, provider_name, job_title, department, days_to_receive)
SELECT ec.id, 'Sandbox Company US d89d', 2023, 'Jane Smith', 'Controller', 'Finance', 2
FROM audit_evidence_catalog ec WHERE ec.evidence_name = 'Bank Statements' ON CONFLICT DO NOTHING;

-- Payroll Reports
INSERT INTO evidence_history (catalog_id, company_name, fiscal_year, provider_name, job_title, department, days_to_receive)
SELECT ec.id, 'Sandbox Company US d89d', 2025, 'John Doe', 'Payroll Manager', 'Payroll', 4
FROM audit_evidence_catalog ec WHERE ec.evidence_name = 'Payroll Reports' ON CONFLICT DO NOTHING;

INSERT INTO evidence_history (catalog_id, company_name, fiscal_year, provider_name, job_title, department, days_to_receive)
SELECT ec.id, 'Sandbox Company US d89d', 2024, 'Emily Clark', 'Payroll Specialist', 'Payroll', 5
FROM audit_evidence_catalog ec WHERE ec.evidence_name = 'Payroll Reports' ON CONFLICT DO NOTHING;

INSERT INTO evidence_history (catalog_id, company_name, fiscal_year, provider_name, job_title, department, days_to_receive)
SELECT ec.id, 'Sandbox Company US d89d', 2023, 'John Doe', 'Payroll Manager', 'Payroll', 3
FROM audit_evidence_catalog ec WHERE ec.evidence_name = 'Payroll Reports' ON CONFLICT DO NOTHING;

-- Loan Agreements
INSERT INTO evidence_history (catalog_id, company_name, fiscal_year, provider_name, job_title, department, days_to_receive)
SELECT ec.id, 'Sandbox Company US d89d', 2025, 'Alice Brown', 'Legal Counsel', 'Legal', 7
FROM audit_evidence_catalog ec WHERE ec.evidence_name = 'Loan Agreements' ON CONFLICT DO NOTHING;

INSERT INTO evidence_history (catalog_id, company_name, fiscal_year, provider_name, job_title, department, days_to_receive)
SELECT ec.id, 'Sandbox Company US d89d', 2024, 'Bob Green', 'Senior Lawyer', 'Legal', 6
FROM audit_evidence_catalog ec WHERE ec.evidence_name = 'Loan Agreements' ON CONFLICT DO NOTHING;

INSERT INTO evidence_history (catalog_id, company_name, fiscal_year, provider_name, job_title, department, days_to_receive)
SELECT ec.id, 'Sandbox Company US d89d', 2023, 'Alice Brown', 'Legal Counsel', 'Legal', 5
FROM audit_evidence_catalog ec WHERE ec.evidence_name = 'Loan Agreements' ON CONFLICT DO NOTHING;

-- Lease Agreements
INSERT INTO evidence_history (catalog_id, company_name, fiscal_year, provider_name, job_title, department, days_to_receive)
SELECT ec.id, 'Sandbox Company US d89d', 2025, 'Charlie Davis', 'Facilities Manager', 'Facilities', 4
FROM audit_evidence_catalog ec WHERE ec.evidence_name = 'Lease Agreements' ON CONFLICT DO NOTHING;

INSERT INTO evidence_history (catalog_id, company_name, fiscal_year, provider_name, job_title, department, days_to_receive)
SELECT ec.id, 'Sandbox Company US d89d', 2024, 'Diana Evans', 'Property Analyst', 'Facilities', 5
FROM audit_evidence_catalog ec WHERE ec.evidence_name = 'Lease Agreements' ON CONFLICT DO NOTHING;

INSERT INTO evidence_history (catalog_id, company_name, fiscal_year, provider_name, job_title, department, days_to_receive)
SELECT ec.id, 'Sandbox Company US d89d', 2023, 'Charlie Davis', 'Facilities Manager', 'Facilities', 3
FROM audit_evidence_catalog ec WHERE ec.evidence_name = 'Lease Agreements' ON CONFLICT DO NOTHING;

-- Insurance Certificates
INSERT INTO evidence_history (catalog_id, company_name, fiscal_year, provider_name, job_title, department, days_to_receive)
SELECT ec.id, 'Sandbox Company US d89d', 2025, 'Eve Foster', 'Risk Manager', 'Risk', 2
FROM audit_evidence_catalog ec WHERE ec.evidence_name = 'Insurance Certificates' ON CONFLICT DO NOTHING;

INSERT INTO evidence_history (catalog_id, company_name, fiscal_year, provider_name, job_title, department, days_to_receive)
SELECT ec.id, 'Sandbox Company US d89d', 2024, 'Frank Hall', 'Insurance Analyst', 'Risk', 3
FROM audit_evidence_catalog ec WHERE ec.evidence_name = 'Insurance Certificates' ON CONFLICT DO NOTHING;

INSERT INTO evidence_history (catalog_id, company_name, fiscal_year, provider_name, job_title, department, days_to_receive)
SELECT ec.id, 'Sandbox Company US d89d', 2023, 'Eve Foster', 'Risk Manager', 'Risk', 2
FROM audit_evidence_catalog ec WHERE ec.evidence_name = 'Insurance Certificates' ON CONFLICT DO NOTHING;

-- Board Minutes
INSERT INTO evidence_history (catalog_id, company_name, fiscal_year, provider_name, job_title, department, days_to_receive)
SELECT ec.id, 'Sandbox Company US d89d', 2025, 'Grace Lee', 'Company Secretary', 'Corporate', 1
FROM audit_evidence_catalog ec WHERE ec.evidence_name = 'Board Minutes' ON CONFLICT DO NOTHING;

INSERT INTO evidence_history (catalog_id, company_name, fiscal_year, provider_name, job_title, department, days_to_receive)
SELECT ec.id, 'Sandbox Company US d89d', 2024, 'Henry Kim', 'Corporate Secretary', 'Corporate', 2
FROM audit_evidence_catalog ec WHERE ec.evidence_name = 'Board Minutes' ON CONFLICT DO NOTHING;

INSERT INTO evidence_history (catalog_id, company_name, fiscal_year, provider_name, job_title, department, days_to_receive)
SELECT ec.id, 'Sandbox Company US d89d', 2023, 'Grace Lee', 'Company Secretary', 'Corporate', 1
FROM audit_evidence_catalog ec WHERE ec.evidence_name = 'Board Minutes' ON CONFLICT DO NOTHING;
