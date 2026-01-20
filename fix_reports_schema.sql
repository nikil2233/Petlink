-- Fix for Rescuer Feed Error (PGRST200)
-- The codebase uses 'user_id' but schema defined 'reporter_id'.
-- This script aligns schema with code.

DO $$
BEGIN
    -- 1. Rename reporter_id to user_id if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' AND column_name = 'reporter_id'
    ) THEN
        ALTER TABLE public.reports RENAME COLUMN reporter_id TO user_id;
    END IF;

    -- 2. Ensure user_id column exists (if rename didn't happen or wasn't needed)
    -- If it still doesn't exist, we might need to add it, but assuming the previous step handled the mismatch.

    -- 3. Add Foreign Key Constraint if it doesn't match
    -- First, drop the old constraint if it was on reporter_id (it might be named automatically)
    -- We'll just try to add the correct constraint for user_id.
    
    -- Check if user_id references profiles.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.key_column_usage usage
        JOIN information_schema.table_constraints constraints
        ON usage.constraint_name = constraints.constraint_name
        WHERE usage.table_name = 'reports' 
        AND usage.column_name = 'user_id'
        AND constraints.constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE public.reports 
        ADD CONSTRAINT reports_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id);
    END IF;

END $$;
