-- Add extraction and match result columns to inbox_documents
-- These columns are persisted by processInboxDocument()
ALTER TABLE inbox_documents
ADD COLUMN IF NOT EXISTS extracted_vendor TEXT,
ADD COLUMN IF NOT EXISTS extracted_date TEXT,
ADD COLUMN IF NOT EXISTS extracted_amount NUMERIC,
ADD COLUMN IF NOT EXISTS extracted_document_number TEXT,
ADD COLUMN IF NOT EXISTS extracted_type TEXT,
ADD COLUMN IF NOT EXISTS match_status TEXT,
ADD COLUMN IF NOT EXISTS match_confidence NUMERIC,
ADD COLUMN IF NOT EXISTS matched_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS match_field_details JSONB,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;