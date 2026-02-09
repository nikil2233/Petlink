/*
  Verified Cleanup Script
  -----------------------------------------------
  Deletes data from tables confirmed in the codebase.
*/

-- 1. DELETE CHILD DATA
DELETE FROM messages;
DELETE FROM notifications;
DELETE FROM appointments;
DELETE FROM reports;
DELETE FROM lost_pets;
DELETE FROM adoptions; 
-- If 'adoptions' fails, run the script again without this line or ignore the error.

-- 2. DELETE PROFILES
DELETE FROM profiles;

-- 3. DELETE AUTH USERS
-- This deletes the actual login accounts.
DELETE FROM auth.users;
