/*
  Cleanup Script - Safe Order
  -----------------------------------------------
  Run this in your Supabase SQL Editor to delete ALL data.
  If a table doesn't exist, just remove that line.
*/

-- 1. DELETE FROM CHILD TABLES FIRST (Ignore errors if table doesn't exist)
DO $$ 
BEGIN 
  -- Notifications & Messages
  DELETE FROM "notifications";
  DELETE FROM "messages";

  -- Appointments & Vet Data
  DELETE FROM "appointments";
  DELETE FROM "vet_appointments";

  -- Reports (Notify Rescuer)
  DELETE FROM "reports";
  DELETE FROM "sighting_reports";

  -- Lost & Found
  DELETE FROM "sightings";
  DELETE FROM "lost_pets";
  DELETE FROM "reunited_pets";

  -- Adoptions
  DELETE FROM "adoptions";
  DELETE FROM "adoption_applications";
  DELETE FROM "adoption_listings";

  -- Verification
  DELETE FROM "verification_requests";

  -- 2. DELETE USER PROFILES (Public Data)
  DELETE FROM "profiles";

  -- 3. DELETE AUTH USERS (Actual Accounts)
  -- Note: Depending on your foreign key setup, this might still fail if there are other tables.
  DELETE FROM auth.users;

EXCEPTION
  WHEN OTHERS THEN 
    RAISE NOTICE 'Skipping table due to error: %', SQLERRM;
END $$;
