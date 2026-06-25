-- Migration: Ensure partnerships table has required columns
-- Run on production DB (Railway) to harmonize schema with application

BEGIN;

-- Add requested_by to record who requested the partnership
ALTER TABLE partnerships ADD COLUMN IF NOT EXISTS requested_by VARCHAR(50);

-- Ensure the core foreign keys exist (if already present, this is no-op)
ALTER TABLE partnerships ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE partnerships ADD COLUMN IF NOT EXISTS company_id UUID;

-- Ensure status exists with a sensible default
ALTER TABLE partnerships ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

COMMIT;

-- Notes:
-- If your production DB already has these columns but with different constraints
-- (e.g. NOT NULL or FK constraints), adapt the migration accordingly.
