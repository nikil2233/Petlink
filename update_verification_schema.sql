-- Add Verification fields to Profiles table
ALTER TABLE profiles 
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verification_status TEXT DEFAULT 'pending', -- 'pending', 'submitted', 'approved', 'rejected'
ADD COLUMN verification_document_url TEXT;

-- Auto-verify regular users (Pet Owners) because they don't need strict checks yet
-- Vets, Rescuers, and Shelters will stay FALSE (verified manually)
UPDATE profiles 
SET is_verified = TRUE, verification_status = 'approved' 
WHERE role = 'user';

-- Create a secure storage bucket for ID documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- STORAGE POLICIES (RLS) used by Supabase Storage
-- 1. Users can upload their own verification document
CREATE POLICY "Users can upload their own verification doc"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'verification-docs' AND length(name) > 1);

-- 2. Users can VIEW their own document (to see what they uploaded)
CREATE POLICY "Users can view their own verification doc"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'verification-docs' AND owner = auth.uid());

-- 3. Only Admins/Service Role can view ALL documents (You in the dashboard)
-- NOTE: Supabase dashboard usually bypasses RLS if you are logged in as Admin.
-- But for safety, we ensure normal users can't list everyone's IDs.
