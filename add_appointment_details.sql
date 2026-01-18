-- Add columns for Vet Acceptance Details
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS confirmed_date DATE,
ADD COLUMN IF NOT EXISTS confirmed_time TEXT,
ADD COLUMN IF NOT EXISTS pre_surgery_instructions TEXT,
ADD COLUMN IF NOT EXISTS surgery_details TEXT, -- Can store JSON string or plain text
ADD COLUMN IF NOT EXISTS post_surgery_care TEXT,
ADD COLUMN IF NOT EXISTS vet_notes TEXT;
