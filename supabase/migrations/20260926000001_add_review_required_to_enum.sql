-- Migration: add_review_required_to_enum
-- Adds REVIEW_REQUIRED to the qbo_register_state enum

ALTER TYPE qbo_register_state ADD VALUE IF NOT EXISTS 'REVIEW_REQUIRED';