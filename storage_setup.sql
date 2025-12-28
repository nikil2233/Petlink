-- Create 'avatars' bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policies for 'avatars'
-- Note: You might need to drop existing policies if they conflict, or use "create policy if not exists" logic (which isn't standard SQL but we can just create).
-- Better to wrap in DO block or just attempt creation.
-- Simplifying for Supabase SQL editor:

create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

create policy "Users can update their own avatars"
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.uid() = owner );

-- Create 'rescue-images' bucket (for NotifyRescuer)
insert into storage.buckets (id, name, public)
values ('rescue-images', 'rescue-images', true)
on conflict (id) do nothing;

create policy "Rescue images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'rescue-images' );

create policy "Authenticated users can upload rescue images"
  on storage.objects for insert
  with check ( bucket_id = 'rescue-images' and auth.role() = 'authenticated' );
