/* Admin Dashboard policies */

-- Allow anyone to READ profiles if they are an admin
-- But since we don't have an "is_admin" column formally enforced in policies yet, 
-- we need to make sure the app can read the data.

-- NOTE: The current 'profiles' table usually has policies to allow "Public Read" or "Authenticated Read".
-- If not, you might see an empty list in the Admin Dashboard.

-- Check if there is an is_admin column, if not add it (Optional but good practice)
-- ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- If you want to strictly secure this, you would add a policy:
-- CREATE POLICY "Admins can update verification status" 
-- ON profiles 
-- FOR UPDATE 
-- USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));
