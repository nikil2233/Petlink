-- Add 'about' and 'goal' columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS about text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal text;

-- Ensure 'avatars' bucket exists (re-run safety)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Add policy for avatars if missing (simplified generic policy)
-- Note: You might need to check if these policies exist to avoid errors, or just ignore errors.
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

create policy "Users can update their own avatars"
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.uid() = owner );
