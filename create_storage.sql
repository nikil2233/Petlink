-- Create storage buckets
insert into storage.buckets (id, name, public)
values 
  ('avatars', 'avatars', true),
  ('adoption-images', 'adoption-images', true),
  ('rescue-images', 'rescue-images', true)
on conflict (id) do nothing;

-- Set up security policies for storage.objects
-- Note: You might need to drop existing policies if you run this multiple times
-- DROP POLICY IF EXISTS "Public Access" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated Insert" ON storage.objects;


-- Policy: Public Read Access for all our buckets
create policy "Public Read Access"
  on storage.objects for select
  using ( bucket_id in ('avatars', 'adoption-images', 'rescue-images') );

-- Policy: Authenticated Upload Access
create policy "Authenticated Insert Access"
  on storage.objects for insert
  with check ( 
    bucket_id in ('avatars', 'adoption-images', 'rescue-images') 
    and auth.role() = 'authenticated' 
  );

-- Policy: Users update own objects (simplification)
create policy "Update Own Objects"
  on storage.objects for update
  using ( auth.uid() = owner );
