/*
  LOST AND FOUND FEATURE SCHEMA
  -----------------------------
  1. Creates 'lost_pets' table.
  2. Sets up RLS policies.
  3. Creates a trigger to auto-notify ALL users when a new lost pet is reported.
*/

-- 1. Create 'lost_pets' table
CREATE TABLE IF NOT EXISTS public.lost_pets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) NOT NULL,
  
  -- Pet Details
  pet_name TEXT NOT NULL,
  description TEXT NOT NULL,
  pet_type TEXT, -- 'Dog', 'Cat', etc.
  
  -- Sighting Info
  last_seen_date DATE NOT NULL,
  last_seen_time TIME,
  last_seen_location TEXT NOT NULL,
  latitude FLOAT,
  longitude FLOAT,
  
  -- Contact & Media
  image_url TEXT,
  contact_phone TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'lost' CHECK (status IN ('lost', 'found')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.lost_pets ENABLE ROW LEVEL SECURITY;

-- 3. Policies
CREATE POLICY "Lost pets are viewable by everyone" 
  ON public.lost_pets FOR SELECT USING (true);

CREATE POLICY "Users can report lost pets" 
  ON public.lost_pets FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own reports" 
  ON public.lost_pets FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own reports" 
  ON public.lost_pets FOR DELETE USING (auth.uid() = owner_id);


-- 4. Notification Trigger Logic
CREATE OR REPLACE FUNCTION public.notify_all_users_on_lost_pet()
RETURNS TRIGGER AS $$
DECLARE
  target_user RECORD;
BEGIN
  -- Iterate through ALL users (profiles) except the reporter
  FOR target_user IN 
    SELECT id FROM public.profiles WHERE id != new.owner_id
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      target_user.id,
      '🚨 MISSING PET ALERT: ' || new.pet_name,
      'A pet has been reported missing near ' || new.last_seen_location || '. Please help keep an eye out!',
      'alert',
      '/lost-and-found'
    );
  END LOOP;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach Trigger
DROP TRIGGER IF EXISTS on_lost_pet_insert ON public.lost_pets;
CREATE TRIGGER on_lost_pet_insert
  AFTER INSERT ON public.lost_pets
  FOR EACH ROW EXECUTE PROCEDURE public.notify_all_users_on_lost_pet();


-- 6. Storage for Lost Pet Images
-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public) VALUES ('lost-pets', 'lost-pets', true) ON CONFLICT (id) DO NOTHING;

-- Policies
CREATE POLICY "Public Lost Pet Images" ON storage.objects FOR SELECT USING (bucket_id = 'lost-pets');
CREATE POLICY "User Upload Lost Pet Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lost-pets' AND auth.role() = 'authenticated');
