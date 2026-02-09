-- 1. Disable Infinite Recursion
-- The issue is that the policy "Admins can update all profiles" checks the profiles table
-- FOR EVERY ROW it accesses, creating an infinite loop (profile -> check role -> profile -> check role...)

-- DROP THE BAD POLICIES
DROP POLICY IF EXISTS "Admins can do everything on profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- CREATE A NON-RECURSIVE POLICY
-- We use a special function `auth.jwt()` to check the role if it's set in metadata, 
-- BUT since your role is in the `profiles` table, we need a safer way.

-- SAFE WAY:
-- Create a policy that allows access if the user's ID exists in the profiles table with role='admin'
-- Supabase automatically optimizes this to avoid recursion in simple cases, but...
-- The safest "fix right now" is to allow updates based on ID or simply trust the client for a second (not ideal for prod but fixes the crash).

-- BETTER FIX for recursion:
-- Use a DEFINER function to check admin status, which bypasses RLS for the check itself.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOW RE-ADD THE ADMIN POLICY USING THE FUNCTION
CREATE POLICY "Admins can update all profiles" 
ON profiles FOR ALL 
USING (
  is_admin()
);
