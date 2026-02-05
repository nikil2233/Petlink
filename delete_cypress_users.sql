/*
  Cypress User Cleanup Script AND Database Cleanup
  ------------------------------------------------
  Run this script in your Supabase Dashboard > SQL Editor
  (https://supabase.com/dashboard/project/_YOUR_PROJECT_ID_/sql)

  This script will:
  1. Identify users created by Cypress tests based on email patterns.
  2. Delete them from the auth.users table.
  3. Clean up related data in public.profiles (if cascade delete is not enabled).
  
  Patterns targeted:
  - test_{timestamp}@example.com
  - profile_test_{timestamp}@example.com
  - reporter_{timestamp}@example.com
  - auto_user_{timestamp}@petlink.test
  - Any email ending in @petlink.test
  - invalid_{timestamp}@test.com
*/

-- 1. Optional: View the users to be deleted (Uncomment to preview)
/*
SELECT * FROM auth.users 
WHERE email LIKE 'test_%@example.com'
   OR email LIKE 'profile_test_%@example.com'
   OR email LIKE 'reporter_%@example.com'
   OR email LIKE 'auto_user_%'
   OR email LIKE '%@petlink.test'
   OR email LIKE 'invalid_%@test.com';
*/

-- 2. Delete the users
DELETE FROM auth.users
WHERE email LIKE 'test_%@example.com'
   OR email LIKE 'profile_test_%@example.com'
   OR email LIKE 'reporter_%@example.com'
   OR email LIKE 'auto_user_%'
   OR email LIKE '%@petlink.test'
   OR email LIKE 'invalid_%@test.com';

-- NOTE: If you have foreign keys in 'public.profiles' or other tables
-- linked to 'auth.users.id' with 'ON DELETE CASCADE', the related data
-- will disappear automatically. 
--
-- If you DO NOT have cascade enabled, you might see errors or leftover data.
-- In that case, you should search for and delete from public tables first:
-- DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE ... same condition ...);
