/*
  Add Pickup Schedule Columns
  ---------------------------
  Adds columns to store the date and time a rescuer agrees to pick up a found pet.
*/

ALTER TABLE public.lost_pets
ADD COLUMN IF NOT EXISTS pickup_date DATE,
ADD COLUMN IF NOT EXISTS pickup_time TIME,
ADD COLUMN IF NOT EXISTS pickup_note TEXT;

-- Create Notification Trigger for Pickup Schedule
-- Notifies the Finder (owner_id) when a pickup is scheduled
CREATE OR REPLACE FUNCTION public.notify_finder_on_pickup_schedule()
RETURNS TRIGGER AS $$
DECLARE
  rescuer_name TEXT;
BEGIN
  -- Trigger when custody_status changes to 'pickup_scheduled'
  IF new.custody_status = 'pickup_scheduled' AND old.custody_status IS DISTINCT FROM 'pickup_scheduled' THEN
    
    -- Get Rescuer Name
    SELECT full_name INTO rescuer_name FROM public.profiles WHERE id = new.custody_rescuer_id;
    
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      new.owner_id, -- The Finder
      '🚚 Pickup Scheduled!',
      COALESCE(rescuer_name, 'A Rescuer') || ' will pick up ' || new.pet_name || ' on ' || new.pickup_date || ' at ' || new.pickup_time || '.',
      'update',
      '/lost-and-found?open_id=' || new.id
    );
    
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_pickup_scheduled ON public.lost_pets;

CREATE TRIGGER on_pickup_scheduled
  AFTER UPDATE ON public.lost_pets
  FOR EACH ROW EXECUTE PROCEDURE public.notify_finder_on_pickup_schedule();
