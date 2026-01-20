/*
  FIX RLS FOR RESCUER UPDATES
  ---------------------------
  This script adds a policy to allow rescuers to update pet reports if they are the assigned rescuer.
  This is required for:
  1. Accepting custody (updating custody_status).
  2. Scheduling pickups (updating pickup_date, pickup_time).
*/

-- 1. Ensure RLS is enabled (just in case)
ALTER TABLE public.lost_pets ENABLE ROW LEVEL SECURITY;

-- 2. Drop the policy if it already exists to avoid errors on re-run
DROP POLICY IF EXISTS "Rescuers can update assigned reports" ON public.lost_pets;

-- 3. Create the new policy
-- Allows update if the authenticated user's ID matches the custody_rescuer_id on the record
CREATE POLICY "Rescuers can update assigned reports"
ON public.lost_pets
FOR UPDATE
USING (
  auth.uid() = custody_rescuer_id
);

-- 4. Verify Policy (Optional - shows existing policies)
SELECT * FROM pg_policies WHERE tablename = 'lost_pets';
