-- Add NIC Back URL column for double-sided ID verification
ALTER TABLE profiles 
ADD COLUMN verification_nic_back_url TEXT;

-- No new policies needed as the bucket 'verification-docs' handles all files.
