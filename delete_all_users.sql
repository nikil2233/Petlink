-- 1. DELETE FROM CHILD TABLES FIRST (To avoid foreign key constraint errors)

-- A. Delete all Notifications
DELETE FROM notifications;
DELETE FROM sighting_notifications;

-- B. Delete all Messages/Chat
DELETE FROM messages;

-- C. Delete all Appointments
DELETE FROM appointments;

-- D. Delete all Rescuer/Shelter Reports
DELETE FROM reports;

-- E. Delete all Lost/Found Pet Reports (and sightings)
DELETE FROM sightings;
DELETE FROM lost_pets;

-- F. Delete all Adoptions
DELETE FROM adoptions;
DELETE FROM adoption_applications;

-- G. Delete all Products/Orders (if any)
DELETE FROM orders;
DELETE FROM products;

-- 2. DELETE FROM PROFILES (Public Profile Data)
-- This table is linked to auth.users usually via a foreign key
DELETE FROM profiles;

-- 3. DELETE FROM AUTH.USERS (The Accounts Themselves)
-- This requires special permissions in Supabase SQL Editor
DELETE FROM auth.users;

-- 4. DELETE FROM STORAGE (Optional - Metadata only, files remain in buckets)
DELETE FROM storage.objects;
