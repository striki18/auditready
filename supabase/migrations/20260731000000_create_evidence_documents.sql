-- Migration: create evidence_documents table to store uploaded file metadata
-- Timestamp: 20260731000000

CREATE TABLE IF NOT EXISTS evidence_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_request_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_evidence_documents_request
    FOREIGN KEY (evidence_request_id) REFERENCES evidence_requests(id) ON DELETE CASCADE
);

-- Index for fast lookup by evidence_request_id
CREATE INDEX IF NOT EXISTS idx_evidence_documents_request_id
  ON evidence_documents(evidence_request_id);
