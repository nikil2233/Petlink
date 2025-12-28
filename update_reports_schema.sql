-- Add location coordinates to reports table
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS latitude float,
ADD COLUMN IF NOT EXISTS longitude float;

-- Create a storage bucket for rescue images if it doesn't exist
insert into storage.buckets (id, name, public)
values ('rescue-images', 'rescue-images', true)
on conflict (id) do nothing;

-- Allow public access to read rescue images
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'rescue-images' );

-- Allow authenticated users to upload images
create policy "Authenticated Export"
  on storage.objects for insert
  with check ( bucket_id = 'rescue-images' and auth.role() = 'authenticated' );
