-- Migration: add zip_path column to evidence_packages
-- This column stores the path to the generated ZIP file for an evidence package.
-- It is nullable because existing rows do not have a value yet.

ALTER TABLE evidence_packages
    ADD COLUMN IF NOT EXISTS zip_path text;
