-- Add updated_at column to lost_pets table
ALTER TABLE lost_pets 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill existing records
UPDATE lost_pets 
SET updated_at = created_at 
WHERE updated_at IS NULL;
