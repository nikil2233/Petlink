/*
  UPDATE LOST PETS SCHEMA - DETAILED FIELDS
  -----------------------------------------
  Adds support for:
  - Report Type (Lost/Found)
  - Detailed Identity (Breed, Gender, Size)
  - Visuals (Colors, Coat, Features, Multiple Photos)
  - Security (Microchip, Hidden Contact)
*/

-- 1. Add new columns to 'lost_pets'
ALTER TABLE public.lost_pets 
ADD COLUMN IF NOT EXISTS report_type TEXT DEFAULT 'lost' CHECK (report_type IN ('lost', 'found')),
ADD COLUMN IF NOT EXISTS species TEXT DEFAULT 'Dog',
ADD COLUMN IF NOT EXISTS breed TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Male', 'Female', 'Unknown')),
ADD COLUMN IF NOT EXISTS size TEXT CHECK (size IN ('Small', 'Medium', 'Large')),
ADD COLUMN IF NOT EXISTS primary_color TEXT,
ADD COLUMN IF NOT EXISTS secondary_color TEXT,
ADD COLUMN IF NOT EXISTS coat_type TEXT,
ADD COLUMN IF NOT EXISTS distinctive_features TEXT,
ADD COLUMN IF NOT EXISTS temperament TEXT,
ADD COLUMN IF NOT EXISTS microchip_status TEXT CHECK (microchip_status IN ('Yes', 'No', 'Unknown')),
ADD COLUMN IF NOT EXISTS hide_contact BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS additional_images TEXT[]; -- Array of image URLs

-- 2. Update Status Check
-- We need to allow 'reunited' as a status. 
-- Since modifying a check constraint on an existing column can be tricky in some SQL dialects without dropping it,
-- we will drop the constraint and add a new one.
ALTER TABLE public.lost_pets DROP CONSTRAINT IF EXISTS lost_pets_status_check;
ALTER TABLE public.lost_pets ADD CONSTRAINT lost_pets_status_check CHECK (status IN ('lost', 'found', 'reunited'));
