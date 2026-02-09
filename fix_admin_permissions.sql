-- FIX ADMIN PERMISSIONS & VERIFICATION WORKFLOW

-- 1. Ensure columns exist (Idempotent)
DO $$ 
BEGIN 
    -- Check for verification_status, add if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='verification_status') THEN
        ALTER TABLE profiles ADD COLUMN verification_status text DEFAULT 'pending';
    END IF;

    -- Check for is_verified, add if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_verified') THEN
        ALTER TABLE profiles ADD COLUMN is_verified boolean DEFAULT false;
    END IF;
END $$;

-- 2. ENABLE RLS (Row Level Security) on Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. DROP EXISTING POLICIES (To avoid conflicts/duplicates)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can do everything on profiles" ON profiles;

-- 4. CREATE NEW POLICIES

-- Policy A: Everyone can view profiles (Public Read)
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

-- Policy B: Users can insert their own profile (Registration)
CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Policy C: Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- Policy D: ADMINS CAN DO EVERYTHING (Select, Insert, Update, Delete)
-- This allows admins to update verification_status of OTHER users
CREATE POLICY "Admins can do everything on profiles" 
ON profiles FOR ALL 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- 5. Fix Notifications RLS (Admin needs to send notifications to others)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;

CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

-- Allow anyone to insert notifications (system/triggers/other users sending messages)
-- OR restrict to Authenticated users
CREATE POLICY "Authenticated users can insert notifications" 
ON notifications FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 6. Ensure default status for new users (Trigger)
-- This ensures 'rescuer', 'vet', 'shelter' start as 'pending'
CREATE OR REPLACE FUNCTION handle_new_user_verification() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IN ('vet', 'rescuer', 'shelter') THEN
    NEW.verification_status := 'pending';
    NEW.is_verified := false;
  ELSE
    -- Normal users don't need verification
    NEW.verification_status := NULL;
    NEW.is_verified := true; -- Optionally user is auto-verified if no docs needed
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid error
DROP TRIGGER IF EXISTS trigger_new_user_verification ON profiles;

-- Attach trigger
CREATE TRIGGER trigger_new_user_verification
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION handle_new_user_verification();
