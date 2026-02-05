-- Upgrade Verification Schema for Multiple Documents

-- Add specific columns for different document types
ALTER TABLE profiles 
ADD COLUMN verification_nic_url TEXT,
ADD COLUMN verification_license_url TEXT; -- Used for SLVC (Vet) or Business Reg (Shelter)

-- No need to create a new bucket, we reuse 'verification-docs'
-- The existing policies allow INSERT/SELECT so we are good.
