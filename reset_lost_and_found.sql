/*
  RESET LOST & FOUND SCHEMA (NUCLEAR OPTION)
  ------------------------------------------
  Use this if you are getting "Structure Update Required" or 400 Errors.
  
  WARNING: THIS WILL DELETE ALL EXISTNG LOST PET REPORTS.
  It reconstructs the table from scratch to ensure it PERFECTLY matches the frontend.
*/

-- 1. DROP EXISTING TABLE & TRIGGER
DROP TRIGGER IF EXISTS on_lost_pet_insert ON public.lost_pets;
DROP TABLE IF EXISTS public.lost_pets CASCADE;

-- 2. CREATE TABLE FROM SCRATCH (Definitive Schema)
CREATE TABLE public.lost_pets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) NOT NULL,
  
  -- Core Identity
  report_type TEXT DEFAULT 'lost',  -- 'lost' or 'found'
  pet_name TEXT,                    -- Nullable (e.g. Unknown)
  species TEXT DEFAULT 'Dog',
  breed TEXT,
  gender TEXT,
  size TEXT,
  
  -- Visuals
  primary_color TEXT,
  secondary_color TEXT,
  coat_type TEXT,
  distinctive_features TEXT,
  description TEXT,                 -- Legacy/Fallback
  image_url TEXT,
  additional_images TEXT[],
  
  -- Incident
  last_seen_date DATE,
  last_seen_time TIME,
  last_seen_location TEXT,
  latitude FLOAT,
  longitude FLOAT,
  temperament TEXT,
  
  -- Security
  microchip_status TEXT,
  contact_phone TEXT,
  hide_contact BOOLEAN DEFAULT false,
  
  status TEXT DEFAULT 'lost',       -- 'lost', 'found', 'reunited'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ENABLE RLS & POLICIES
ALTER TABLE public.lost_pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lost pets are viewable by everyone" 
  ON public.lost_pets FOR SELECT USING (true);

CREATE POLICY "Users can report lost pets" 
  ON public.lost_pets FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own reports" 
  ON public.lost_pets FOR UPDATE USING (auth.uid() = owner_id);

-- 4. RECREATE NOTIFICATION TRIGGER
CREATE OR REPLACE FUNCTION public.notify_all_users_on_lost_pet()
RETURNS TRIGGER AS $$
DECLARE
  target_user RECORD;
BEGIN
  -- Notify everyone except the reporter
  FOR target_user IN 
    SELECT id FROM public.profiles WHERE id != new.owner_id
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      target_user.id,
      CASE 
        WHEN new.report_type = 'found' THEN '🐾 FOUND PET ALERT'
        ELSE '🚨 MISSING PET ALERT: ' || COALESCE(new.pet_name, 'Unknown Pet') 
      END,
      CASE 
        WHEN new.report_type = 'found' THEN 'A valid pet sighting was reported near ' || COALESCE(new.last_seen_location, 'your area')
        ELSE 'A pet has been reported missing near ' || COALESCE(new.last_seen_location, 'your area') || '. Please keep an eye out!'
      END,
      'alert',
      '/lost-and-found'
    );
  END LOOP;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_lost_pet_insert
  AFTER INSERT ON public.lost_pets
  FOR EACH ROW EXECUTE PROCEDURE public.notify_all_users_on_lost_pet();


-- 5. ENSURE STORAGE EXISTS (Safe to re-run)
INSERT INTO storage.buckets (id, name, public) VALUES ('lost-pets', 'lost-pets', true) ON CONFLICT (id) DO NOTHING;
