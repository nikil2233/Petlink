-- Fix Foreign Keys to reference profiles instead of auth.users
-- This allows Supabase client to join 'messages' with 'profiles' to get names/avatars

ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey,
DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

ALTER TABLE messages
ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

ALTER TABLE messages
ADD CONSTRAINT messages_receiver_id_fkey
    FOREIGN KEY (receiver_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
