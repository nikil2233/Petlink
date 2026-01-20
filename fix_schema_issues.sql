-- Comprehensive Schema Fix
-- This script aligns the database schema with the frontend application code.
-- Fixes:
-- 1. reports.reporter_id -> reports.user_id (to match RescuerFeed.jsx and NotifyRescuer.jsx)
-- 2. Adds Foreign Key from reports.user_id to profiles.id (to fix PGRST200 error)
-- 3. reports.location_text -> reports.location (to match NotifyRescuer.jsx insert and RescuerFeed.jsx read)
-- 4. public.profiles: Adds 'location' column (to match Auth.jsx registration)

DO $$
BEGIN
    -- 1. Fix reports.reporter_id -> reports.user_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' AND column_name = 'reporter_id'
    ) THEN
        ALTER TABLE public.reports RENAME COLUMN reporter_id TO user_id;
    END IF;

    -- 2. Add Foreign Key for reports.user_id if missing
    -- Note: We check if the constraint exists. If not, we add it.
    -- We assume the column is now named 'user_id' (from step 1 or previously existing).
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reports_user_id_fkey'
    ) THEN
        -- Ensure the user_id column exists before adding constraint (double check)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'user_id') THEN
             ALTER TABLE public.reports 
             ADD CONSTRAINT reports_user_id_fkey 
             FOREIGN KEY (user_id) REFERENCES public.profiles(id);
        END IF;
    END IF;

    -- 3. Fix reports.location_text -> reports.location
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' AND column_name = 'location_text'
    ) THEN
        ALTER TABLE public.reports RENAME COLUMN location_text TO location;
    END IF;

    -- 4. Add location column to profiles if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'location'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN location TEXT;
    END IF;

END $$;
