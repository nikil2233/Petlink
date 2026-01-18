/*
  FIX ALL LOST & FOUND ISSUES
  ---------------------------
  1. Creates 'lost-pets' storage bucket (fixes StorageUnknownError).
  2. Ensures 'lost_pets' table has all new columns.
  3. Relaxes NOT NULL constraint on 'description' (fixes 400 Bad Request).
*/

-- 1. FIX STORAGE (Create Bucket if missing)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lost-pets', 'lost-pets', true) 
ON CONFLICT (id) DO NOTHING;

-- Ensure public access policies exist
DROP POLICY IF EXISTS "Public Lost Pet Images" ON storage.objects;
DROP POLICY IF EXISTS "User Upload Lost Pet Images" ON storage.objects;

CREATE POLICY "Public Lost Pet Images" ON storage.objects FOR SELECT USING (bucket_id = 'lost-pets');
CREATE POLICY "User Upload Lost Pet Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lost-pets' AND auth.role() = 'authenticated');


-- 2. FIX TABLE STRUCTURE
CREATE TABLE IF NOT EXISTS public.lost_pets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add all columns safely
ALTER TABLE public.lost_pets 
ADD COLUMN IF NOT EXISTS pet_name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT, -- We will make this nullable below
ADD COLUMN IF NOT EXISTS pet_type TEXT,
ADD COLUMN IF NOT EXISTS last_seen_date DATE,
ADD COLUMN IF NOT EXISTS last_seen_time TIME,
ADD COLUMN IF NOT EXISTS last_seen_location TEXT,
ADD COLUMN IF NOT EXISTS latitude FLOAT,
ADD COLUMN IF NOT EXISTS longitude FLOAT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'lost',
-- New Detail Columns
ADD COLUMN IF NOT EXISTS report_type TEXT DEFAULT 'lost',
ADD COLUMN IF NOT EXISTS species TEXT DEFAULT 'Dog',
ADD COLUMN IF NOT EXISTS breed TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS size TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT,
ADD COLUMN IF NOT EXISTS secondary_color TEXT,
ADD COLUMN IF NOT EXISTS coat_type TEXT,
ADD COLUMN IF NOT EXISTS distinctive_features TEXT,
ADD COLUMN IF NOT EXISTS temperament TEXT,
ADD COLUMN IF NOT EXISTS microchip_status TEXT,
ADD COLUMN IF NOT EXISTS hide_contact BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS additional_images TEXT[];

-- 3. RELAX CONSTRAINTS (Fix 400 Error)
-- The original schema had 'description' as NOT NULL. The new form uses 'distinctive_features'.
-- We remove the NOT NULL constraint from 'description' to prevent errors.
ALTER TABLE public.lost_pets ALTER COLUMN description DROP NOT NULL;
ALTER TABLE public.lost_pets ALTER COLUMN contact_phone DROP NOT NULL; -- Just in case
ALTER TABLE public.lost_pets ALTER COLUMN last_seen_location DROP NOT NULL;

-- 4. UPDATE STATUS & TYPES
ALTER TABLE public.lost_pets DROP CONSTRAINT IF EXISTS lost_pets_status_check;
ALTER TABLE public.lost_pets ADD CONSTRAINT lost_pets_status_check CHECK (status IN ('lost', 'found', 'reunited'));

-- 5. RE-APPLY RLS
ALTER TABLE public.lost_pets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lost pets are viewable by everyone" ON public.lost_pets;
DROP POLICY IF EXISTS "Users can report lost pets" ON public.lost_pets;
DROP POLICY IF EXISTS "Owners can update their own reports" ON public.lost_pets;

CREATE POLICY "Lost pets are viewable by everyone" ON public.lost_pets FOR SELECT USING (true);
CREATE POLICY "Users can report lost pets" ON public.lost_pets FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their own reports" ON public.lost_pets FOR UPDATE USING (auth.uid() = owner_id);
