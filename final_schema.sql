/*
  PETLINK FINAL MASTER SCHEMA
  ---------------------------
  Designed for:
  - Role-based Users (Citizens, Rescuers, Shelters, Vets)
  - Stray Animal Reporting & Rescue (Geo-tagged)
  - Adoption Center (Pets, Requests, Wishlist)
  - Veterinary Appointments (Booking, Management)
  - Real-time Notifications

  INSTRUCTIONS:
  1. Open your Supabase Dashboard -> SQL Editor.
  2. Paste this entire script.
  3. Click "Run".
  
  WARNING: THIS WILL WIPE ALL EXISTING DATA.
*/

-- ==========================================
-- 1. CLEANUP (Drop existing objects)
-- ==========================================
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.wishlist CASCADE;
DROP TABLE IF EXISTS public.adoption_requests CASCADE;
DROP TABLE IF EXISTS public.adoptions CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop Enums if they exist to start fresh
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS report_status CASCADE;
DROP TYPE IF EXISTS urgency_level CASCADE;
DROP TYPE IF EXISTS adoption_status CASCADE;
DROP TYPE IF EXISTS request_status CASCADE;
DROP TYPE IF EXISTS appointment_status CASCADE;

-- Enables UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. ENUMS & CONSTANTS
-- ==========================================
-- NOTE: We use TEXT with Check constraints for 'role' to avoid complexity with Enum Types.
-- User Roles: 'user', 'rescuer', 'shelter', 'vet'

CREATE TYPE report_status AS ENUM ('pending', 'investigating', 'resolved', 'rejected');
CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE adoption_status AS ENUM ('available', 'pending', 'adopted');
CREATE TYPE request_status AS ENUM ('pending', 'under_review', 'approved', 'rejected');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'rejected');

-- ==========================================
-- 3. TABLES & POLICIES
-- ==========================================

---------------------------------------------
-- 3.1 PROFILES
-- Extends auth.users with app-specific info
---------------------------------------------
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  
  -- Identity & Role
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'rescuer', 'shelter', 'vet')), -- Simple Check Constraint
  avatar_url TEXT,
  
  -- Organization/Vet Info
  about TEXT,       -- Bio for rescuers/vets
  goal TEXT,        -- For shelters
  phone TEXT,
  
  -- Location (Crucial for Maps: Find Vet / Notify Rescuer)
  city TEXT,
  district TEXT,
  address TEXT,
  latitude FLOAT,
  longitude FLOAT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Standard access policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

---------------------------------------------
-- 3.2 REPORTS (Notify Rescuer)
-- Stray animals in need of help
---------------------------------------------
CREATE TABLE public.reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id UUID REFERENCES public.profiles(id) NOT NULL, -- The citizen
  
  -- Report Data
  description TEXT NOT NULL,
  urgency urgency_level DEFAULT 'medium',
  image_url TEXT,
  
  -- Location
  location_text TEXT,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,

  -- Rescuer Management
  status report_status DEFAULT 'pending',
  assigned_rescuer_id UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reports are viewable by everyone" 
  ON public.reports FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reports" 
  ON public.reports FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Reporters can update their own reports" 
  ON public.reports FOR UPDATE USING (auth.uid() = reporter_id);

CREATE POLICY "Rescuers and Shelters can update any report" 
  ON public.reports FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('rescuer', 'shelter'))
  );

---------------------------------------------
-- 3.3 ADOPTIONS (Pet Listings)
---------------------------------------------
CREATE TABLE public.adoptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  posted_by UUID REFERENCES public.profiles(id) NOT NULL,
  
  -- Pet Info
  name TEXT NOT NULL,
  species TEXT NOT NULL, -- 'Dog', 'Cat'
  breed TEXT,
  age_years INT DEFAULT 0,
  age_months INT DEFAULT 0,
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Unknown')),
  description TEXT,
  image_url TEXT,
  
  -- Medical & Behavior
  vaccinated BOOLEAN DEFAULT false,
  neutered BOOLEAN DEFAULT false,
  good_with_kids BOOLEAN,
  good_with_pets BOOLEAN,
  medical_history TEXT,
  
  -- Logistics
  location TEXT, -- City/Area
  status adoption_status DEFAULT 'available',
  adoption_fee DECIMAL(10,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.adoptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Adoptions are viewable by everyone" 
  ON public.adoptions FOR SELECT USING (true);

CREATE POLICY "Authorized roles can create listings" 
  ON public.adoptions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('rescuer', 'shelter', 'vet', 'user'))
  );

CREATE POLICY "Owners can update their listings" 
  ON public.adoptions FOR UPDATE USING (auth.uid() = posted_by);

---------------------------------------------
-- 3.4 ADOPTION REQUESTS
---------------------------------------------
CREATE TABLE public.adoption_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  adoption_id UUID REFERENCES public.adoptions(id) ON DELETE CASCADE NOT NULL,
  requester_id UUID REFERENCES public.profiles(id) NOT NULL,
  
  -- Application Form
  phone TEXT NOT NULL,
  address TEXT,
  housing_type TEXT, -- 'House', 'Apartment'
  has_yard BOOLEAN,
  other_pets_details TEXT,
  experience TEXT,
  message TEXT,
  
  status request_status DEFAULT 'pending',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.adoption_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requesters can view their own requests" 
  ON public.adoption_requests FOR SELECT USING (auth.uid() = requester_id);

CREATE POLICY "Pet owners can view requests for their pets" 
  ON public.adoption_requests FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.adoptions WHERE id = adoption_requests.adoption_id AND posted_by = auth.uid())
  );

CREATE POLICY "Authenticated users can apply" 
  ON public.adoption_requests FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Pet owners can update status" 
  ON public.adoption_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.adoptions WHERE id = adoption_requests.adoption_id AND posted_by = auth.uid())
  );

---------------------------------------------
-- 3.5 APPOINTMENTS (Vet Booking)
---------------------------------------------
CREATE TABLE public.appointments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pet_owner_id UUID REFERENCES public.profiles(id) NOT NULL,
  vet_id UUID REFERENCES public.profiles(id) NOT NULL,
  
  -- Booking Details
  pet_name TEXT,
  service_type TEXT NOT NULL, -- 'Vaccination', 'Checkup', 'Sterilization'
  
  -- Detailed Pet Info
  pet_age TEXT,
  pet_weight TEXT,
  pet_gender TEXT,
  pet_species TEXT,
  
  -- Medical Info
  procedure_type TEXT, -- 'Spay', 'Neuter'
  is_healthy BOOLEAN DEFAULT true,
  medical_conditions TEXT,
  on_medication BOOLEAN DEFAULT false,
  medication_details TEXT,
  vaccinated TEXT, -- 'Vaccinated', 'Not vaccinated'
  
  owner_consent BOOLEAN DEFAULT false,

  appointment_date DATE NOT NULL,
  time_slot TEXT NOT NULL,    -- e.g. "10:00 AM"
  
  status appointment_status DEFAULT 'pending',
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view relevant appointments" 
  ON public.appointments FOR SELECT USING (auth.uid() = pet_owner_id OR auth.uid() = vet_id);

CREATE POLICY "Pet owners can create appointments" 
  ON public.appointments FOR INSERT WITH CHECK (auth.uid() = pet_owner_id);

CREATE POLICY "Parties can update appointments" 
  ON public.appointments FOR UPDATE USING (auth.uid() = pet_owner_id OR auth.uid() = vet_id);

---------------------------------------------
-- 3.6 WISHLIST
---------------------------------------------
CREATE TABLE public.wishlist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  adoption_id UUID REFERENCES public.adoptions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, adoption_id)
);

ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage own wishlist" 
  ON public.wishlist FOR ALL USING (auth.uid() = user_id);

---------------------------------------------
-- 3.7 NOTIFICATIONS
---------------------------------------------
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT, -- 'alert', 'info', 'success'
  is_read BOOLEAN DEFAULT false,
  link TEXT, -- Internal link to navigate to
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own notifications" 
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" 
  ON public.notifications FOR INSERT WITH CHECK (true); -- Ideally restricted to server-side only in prod


-- ==========================================
-- 4. STORAGE CONFIGURATION
-- ==========================================
-- NOTE: We insert buckets if they don't exist. 
-- You must NOT delete the 'storage' schema.

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('rescue-images', 'rescue-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('adoption-images', 'adoption-images', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies (Dropping first to avoid conflicts if re-running)
DROP POLICY IF EXISTS "Public Avatars" ON storage.objects;
DROP POLICY IF EXISTS "User Upload Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Rescue Images" ON storage.objects;
DROP POLICY IF EXISTS "User Upload Rescue Images" ON storage.objects;
DROP POLICY IF EXISTS "Public Adoption Images" ON storage.objects;
DROP POLICY IF EXISTS "User Upload Adoption Images" ON storage.objects;

-- Avatars
CREATE POLICY "Public Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "User Upload Avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Rescue Images
CREATE POLICY "Public Rescue Images" ON storage.objects FOR SELECT USING (bucket_id = 'rescue-images');
CREATE POLICY "User Upload Rescue Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'rescue-images' AND auth.role() = 'authenticated');

-- Adoption Images
CREATE POLICY "Public Adoption Images" ON storage.objects FOR SELECT USING (bucket_id = 'adoption-images');
CREATE POLICY "User Upload Adoption Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'adoption-images' AND auth.role() = 'authenticated');


-- ==========================================
-- 5. AUTOMATION (TRIGGERS)
-- ==========================================

-- Trigger to automatically create a profile when a new user signs up via Supabase Auth.
-- This respects the metadata passed during sign-up (role, full_name, etc.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    -- Use the role from metadata if available, otherwise default to 'user'
    -- We cast to TEXT to be safe.
    COALESCE(new.raw_user_meta_data->>'role', 'user'),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    role = excluded.role,
    email = excluded.email,
    full_name = excluded.full_name;
    
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists to avoid duplication errors during re-runs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
