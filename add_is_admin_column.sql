-- Add is_admin column to profiles table
ALTER TABLE profiles 
ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Optional: Set yourself (or a specific user) as admin for testing
-- UPDATE profiles SET is_admin = TRUE WHERE email = 'your_email@example.com';
