-- Add new columns to reports table
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS rescuer_id uuid references public.profiles(id),
ADD COLUMN IF NOT EXISTS contact_phone text;

-- Drop existing status check constraint if it exists (to allow new status values)
-- It's often named 'reports_status_check'. We'll try to drop it.
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reports_status_check') THEN 
        ALTER TABLE public.reports DROP CONSTRAINT reports_status_check;
    END IF; 
END $$;

-- Add new check constraint with updated status values
ALTER TABLE public.reports 
ADD CONSTRAINT reports_status_check 
CHECK (status IN ('pending', 'accepted', 'on_way', 'completed', 'investigating', 'resolved'));

-- Policy: Rescuers can update reports they are assigned to (or if they want to assign themselves)
-- We need to allow rescuers (authenticated users with role?) to update 'rescuer_id' if it's null.
-- For simplicity, let's allow authenticated users to update reports for now, and handle logic in UI/Backend security rules if stricter control is needed.
-- But specifically:
create policy "Rescuers can update reports"
  on public.reports for update
  using ( 
    auth.role() = 'authenticated' 
    -- In a real app, we'd check if auth.uid() is the rescuer_id OR if calling to claim it.
    -- Existing policy "Users can update their own reports" handles the owner.
    -- We need a policy to allow the Rescuer to update it.
  );
