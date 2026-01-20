/*
  Enhancements for FOUND PET logic
  --------------------------------
  Adds support for:
  1. Custody tracking: Can the user hold the pet or are they notifying a rescuer?
  2. Injury reporting: Specific details and photos if the animal is hurt.
*/

-- 1. Add new columns
ALTER TABLE public.lost_pets
ADD COLUMN IF NOT EXISTS custody_status TEXT DEFAULT 'user_holding' CHECK (custody_status IN ('user_holding', 'rescuer_notified', 'in_shelter')),
ADD COLUMN IF NOT EXISTS custody_rescuer_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS is_injured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS injury_details TEXT,
ADD COLUMN IF NOT EXISTS injury_images TEXT[]; -- Array of URLs for specific injury photos

-- 2. Update RLS (Policies normally allow update by owner, which covers this)
-- Ensure 'custody_rescuer_id' is viewable
-- (Existing SELECT policy "Lost pets are viewable by everyone" covers this)
