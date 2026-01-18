-- Add missing columns to adoptions table if they don't exist
ALTER TABLE public.adoptions ADD COLUMN IF NOT EXISTS behavior_notes TEXT;
ALTER TABLE public.adoptions ADD COLUMN IF NOT EXISTS medical_history TEXT;
ALTER TABLE public.adoptions ADD COLUMN IF NOT EXISTS contact_info TEXT;

-- Boolean flags might also be missing if the table was very old
ALTER TABLE public.adoptions ADD COLUMN IF NOT EXISTS vaccinated BOOLEAN DEFAULT false;
ALTER TABLE public.adoptions ADD COLUMN IF NOT EXISTS neutered BOOLEAN DEFAULT false;
ALTER TABLE public.adoptions ADD COLUMN IF NOT EXISTS good_with_kids BOOLEAN DEFAULT false;
ALTER TABLE public.adoptions ADD COLUMN IF NOT EXISTS good_with_pets BOOLEAN DEFAULT false;

-- Age fields
ALTER TABLE public.adoptions ADD COLUMN IF NOT EXISTS age_years INTEGER;
ALTER TABLE public.adoptions ADD COLUMN IF NOT EXISTS age_months INTEGER;

-- Notify that update is done
DO $$
BEGIN
    RAISE NOTICE 'Adoptions table schema updated successfully.';
END $$;
