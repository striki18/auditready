-- Add match_field_details column to inbox_documents table
ALTER TABLE inbox_documents
ADD COLUMN IF NOT EXISTS match_field_details JSONB;