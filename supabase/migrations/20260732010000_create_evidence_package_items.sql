-- Migration: create evidence_package_items table to link documents to packages
-- Timestamp: 20260732010000 (generated for Milestone 5.4.7)

CREATE TABLE IF NOT EXISTS evidence_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL,
  document_id UUID NOT NULL,
  folder_name TEXT NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  CONSTRAINT fk_evidence_package_items_package
    FOREIGN KEY (package_id) REFERENCES evidence_packages(id) ON DELETE CASCADE,
  CONSTRAINT fk_evidence_package_items_document
    FOREIGN KEY (document_id) REFERENCES evidence_documents(id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_evidence_package_items_package_id
  ON evidence_package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_evidence_package_items_document_id
  ON evidence_package_items(document_id);
