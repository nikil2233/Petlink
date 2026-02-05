-- COMPREHENSIVE SCHEMA UPDATE FOR LOST & FOUND
-- Please run this ENTIRE script in the Supabase SQL Editor.
-- It adds ALL potential missing columns that might cause a 400 Bad Request error.

ALTER TABLE lost_pets 
-- Core Fields
ADD COLUMN IF NOT EXISTS pet_name text,
ADD COLUMN IF NOT EXISTS species text,
ADD COLUMN IF NOT EXISTS breed text,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS size text,
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS status text,
ADD COLUMN IF NOT EXISTS report_type text,

-- Visual Details (Crucial for 400 Error Fix)
ADD COLUMN IF NOT EXISTS primary_color text,
ADD COLUMN IF NOT EXISTS secondary_color text,
ADD COLUMN IF NOT EXISTS coat_type text,
ADD COLUMN IF NOT EXISTS distinctive_features text,
ADD COLUMN IF NOT EXISTS temperament text,
ADD COLUMN IF NOT EXISTS additional_images text[], -- Array of image URLs

-- Contact Info
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS hide_contact boolean DEFAULT false,

-- Location & Time
ADD COLUMN IF NOT EXISTS last_seen_date text,
ADD COLUMN IF NOT EXISTS last_seen_time text,
ADD COLUMN IF NOT EXISTS last_seen_location text,
ADD COLUMN IF NOT EXISTS latitude float8,
ADD COLUMN IF NOT EXISTS longitude float8,

-- Found Pet Specifics (Custody & Health)
ADD COLUMN IF NOT EXISTS custody_status text DEFAULT 'user_holding',
ADD COLUMN IF NOT EXISTS custody_rescuer_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS is_injured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS injury_details text,
ADD COLUMN IF NOT EXISTS injury_images text[], -- Array of image URLs

-- Pickup Handling
ADD COLUMN IF NOT EXISTS pickup_date text,
ADD COLUMN IF NOT EXISTS pickup_time text,
ADD COLUMN IF NOT EXISTS pickup_note text;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lost_pets_custody_status ON lost_pets(custody_status);
CREATE INDEX IF NOT EXISTS idx_lost_pets_owner_id ON lost_pets(owner_id);
