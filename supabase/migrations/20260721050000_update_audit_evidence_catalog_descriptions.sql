-- Migration: update_audit_evidence_catalog_descriptions
-- Updates the description field for each evidence item in audit_evidence_catalog.

BEGIN;

UPDATE audit_evidence_catalog
  SET description = 'Complete chart of accounts exported from QuickBooks.'
  WHERE evidence_name = 'Chart of Accounts';

UPDATE audit_evidence_catalog
  SET description = 'Trial balance for the selected audit period.'
  WHERE evidence_name = 'Trial Balance';

UPDATE audit_evidence_catalog
  SET description = 'Detailed general ledger containing all posted transactions.'
  WHERE evidence_name = 'General Ledger';

UPDATE audit_evidence_catalog
  SET description = 'Customer master records from QuickBooks.'
  WHERE evidence_name = 'Customers';

UPDATE audit_evidence_catalog
  SET description = 'Vendor master records from QuickBooks.'
  WHERE evidence_name = 'Vendors';

UPDATE audit_evidence_catalog
  SET description = 'Customer invoices issued during the audit period.'
  WHERE evidence_name = 'Invoices';

UPDATE audit_evidence_catalog
  SET description = 'Vendor bills recorded during the audit period.'
  WHERE evidence_name = 'Bills';

UPDATE audit_evidence_catalog
  SET description = 'Customer and vendor payment transactions.'
  WHERE evidence_name = 'Payments';

UPDATE audit_evidence_catalog
  SET description = 'Official bank statements for the audit period.'
  WHERE evidence_name = 'Bank Statements';

UPDATE audit_evidence_catalog
  SET description = 'Payroll reports provided by the payroll system.'
  WHERE evidence_name = 'Payroll Reports';

UPDATE audit_evidence_catalog
  SET description = 'Executed loan agreements and amendments.'
  WHERE evidence_name = 'Loan Agreements';

UPDATE audit_evidence_catalog
  SET description = 'Executed lease agreements and amendments.'
  WHERE evidence_name = 'Lease Agreements';

UPDATE audit_evidence_catalog
  SET description = 'Current insurance certificates and policy documents.'
  WHERE evidence_name = 'Insurance Certificates';

UPDATE audit_evidence_catalog
  SET description = 'Board meeting minutes relevant to the audit period.'
  WHERE evidence_name = 'Board Minutes';

COMMIT;
