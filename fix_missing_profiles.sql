-- Create profiles for any users in auth.users that don't have one in public.profiles
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- Notify completion
DO $$
BEGIN
    RAISE NOTICE 'Missing profiles have been created successfully.';
END $$;
