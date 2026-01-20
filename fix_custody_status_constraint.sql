/*
  FIX CUSTODY STATUS CONSTRAINT
  -----------------------------
  This script updates the valid values allowed in the 'custody_status' column.
  The error "violates check constraint" happens because 'pickup_scheduled' wasn't in the original list.
*/

-- 1. Remove the old strict rule (constraint)
-- Note: The constraint name 'lost_pets_custody_status_check' is standard, but if it fails, 
-- you might need to check the exact name in your table definition.
ALTER TABLE public.lost_pets 
DROP CONSTRAINT IF EXISTS lost_pets_custody_status_check;

-- 2. Add the NEW rule with all valid options
ALTER TABLE public.lost_pets 
ADD CONSTRAINT lost_pets_custody_status_check 
CHECK (
  custody_status IN (
    'user_holding',      -- Finder/User is holding the pet
    'rescuer_notified',  -- Finder has requested help
    'pickup_scheduled',  -- Rescuer accepted and scheduled pickup <--- NEW
    'rescuer_custody'    -- Rescuer has picked up the pet
  )
);
