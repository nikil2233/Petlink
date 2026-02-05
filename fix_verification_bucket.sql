-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', true)
ON CONFLICT (id) DO UPDATE
SET public = true; -- Force it to be public so getPublicUrl works

-- 2. Allow Authenticated users to upload (INSERT)
-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own verification doc" ON storage.objects;

CREATE POLICY "Users can upload their own verification doc"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'verification-docs');

-- 3. Allow Authenticated users to VIEW (SELECT)
-- Since the bucket is public, this technically isn't needed for public URLs,
-- but good to have if we ever make it private.
DROP POLICY IF EXISTS "Users can view their own verification doc" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all verification docs" ON storage.objects;

-- Allow users to see their own files
CREATE POLICY "Users can view their own verification doc"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'verification-docs' AND owner = auth.uid());

-- Allow Admins to see ALL files
CREATE POLICY "Admins can view all verification docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-docs' 
  AND (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  )
);

-- 4. Allow Admins to DELETE files (Review clean up)
CREATE POLICY "Admins can delete verification docs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-docs' 
  AND (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  )
);
