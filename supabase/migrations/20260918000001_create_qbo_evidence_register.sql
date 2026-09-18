-- Migration: create_qbo_evidence_register
-- Creates the qbo_evidence_register table for QBO-side register state tracking.
-- Classifies every QBO transaction and its attachment(s) into 6 states:
-- MATCHED, WRONG_MATCHED, MISSING, DUPLICATE, FLAGGED, UNMATCHED

CREATE TYPE qbo_register_state AS ENUM (
  'MATCHED',
  'WRONG_MATCHED',
  'MISSING',
  'DUPLICATE',
  'FLAGGED',
  'UNMATCHED'
);

CREATE TABLE IF NOT EXISTS qbo_evidence_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id TEXT NOT NULL,
  collection_request_id UUID REFERENCES collection_requests(id) ON DELETE SET NULL,
  
  -- QBO Transaction reference
  qbo_txn_id TEXT NOT NULL,
  qbo_txn_type TEXT,
  qbo_txn_date DATE,
  qbo_txn_vendor TEXT,
  qbo_txn_amount NUMERIC,
  qbo_txn_doc_number TEXT,
  
  -- Attachment reference (if any)
  attachable_id TEXT,
  attachment_filename TEXT,
  attachment_file_size BIGINT,
  attachment_download_url TEXT,
  
  -- Register state classification
  register_state qbo_register_state NOT NULL,
  
  -- Matching details
  matched_document_id UUID REFERENCES inbox_documents(id) ON DELETE SET NULL,
  match_confidence NUMERIC,
  match_field_details JSONB,
  
  -- For WRONG_MATCHED: the transaction this document actually belongs to
  correct_qbo_txn_id TEXT,
  
  -- For DUPLICATE: reference to the primary register entry
  duplicate_of_register_id UUID REFERENCES qbo_evidence_register(id) ON DELETE SET NULL,
  
  -- For FLAGGED: list of candidate transaction IDs
  flagged_candidate_txn_ids TEXT[],
  
  -- For UNMATCHED: the inbox document that couldn't be matched
  unmatched_document_id UUID REFERENCES inbox_documents(id) ON DELETE SET NULL,
  
  -- Metadata
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one register entry per transaction+attachment combination
  CONSTRAINT ux_qbo_evidence_register_txn_attachment 
    UNIQUE (realm_id, qbo_txn_id, attachable_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_qbo_evidence_register_realm_id 
  ON qbo_evidence_register(realm_id);
CREATE INDEX IF NOT EXISTS idx_qbo_evidence_register_collection_request_id 
  ON qbo_evidence_register(collection_request_id);
CREATE INDEX IF NOT EXISTS idx_qbo_evidence_register_qbo_txn_id 
  ON qbo_evidence_register(qbo_txn_id);
CREATE INDEX IF NOT EXISTS idx_qbo_evidence_register_register_state 
  ON qbo_evidence_register(register_state);
CREATE INDEX IF NOT EXISTS idx_qbo_evidence_register_matched_document_id 
  ON qbo_evidence_register(matched_document_id);
CREATE INDEX IF NOT EXISTS idx_qbo_evidence_register_unmatched_document_id 
  ON qbo_evidence_register(unmatched_document_id);
CREATE INDEX IF NOT EXISTS idx_qbo_evidence_register_duplicate_of 
  ON qbo_evidence_register(duplicate_of_register_id);

-- Trigger to keep updated_at current
CREATE TRIGGER qbo_evidence_register_updated_at
  BEFORE UPDATE ON qbo_evidence_register
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();