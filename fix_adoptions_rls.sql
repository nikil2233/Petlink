-- Enable RLS just in case
ALTER TABLE public.adoptions ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting or duplicate policies
DROP POLICY IF EXISTS "Adoptions are viewable by everyone." ON public.adoptions;
DROP POLICY IF EXISTS "Authenticated users can create adoption listings." ON public.adoptions;
DROP POLICY IF EXISTS "Users can update their own listings." ON public.adoptions;
DROP POLICY IF EXISTS "Users can delete their own listings." ON public.adoptions;

-- 1. VIEW: Everyone can see available pets
CREATE POLICY "Adoptions are viewable by everyone."
  ON public.adoptions FOR SELECT
  USING ( true );

-- 2. INSERT: Authenticated users can create listings
-- We enforce that the 'posted_by' field must match their own ID
CREATE POLICY "Authenticated users can create adoption listings."
  ON public.adoptions FOR INSERT
  WITH CHECK ( auth.uid() = posted_by );

-- 3. UPDATE: Only the owner can update
CREATE POLICY "Users can update their own listings."
  ON public.adoptions FOR UPDATE
  USING ( auth.uid() = posted_by );

-- 4. DELETE: Only the owner can delete
CREATE POLICY "Users can delete their own listings."
  ON public.adoptions FOR DELETE
  USING ( auth.uid() = posted_by );

-- Force a grant to ensure authenticated users have permission to query the table
GRANT ALL ON public.adoptions TO authenticated;
GRANT SELECT ON public.adoptions TO anon;

DO $$
BEGIN
    RAISE NOTICE 'Adoptions RLS policies reset successfully.';
END $$;
