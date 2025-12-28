-- MASTER SETUP SCRIPT for PetLink (Updated for Adoption Center 2.0)
-- This script resets and recreates all tables and storage policies.
-- WARNING: running this will DELETE all existing data in 'profiles', 'reports', 'adoptions', etc.

BEGIN;

-- 1. Cleanup Old Tables (Cascading drop to remove dependencies)
DROP TABLE IF EXISTS public.wishlist CASCADE;
DROP TABLE IF EXISTS public.adoption_requests CASCADE;
DROP TABLE IF EXISTS public.adoptions CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Create PROFILES Table
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text default 'user' check (role in ('user', 'rescuer', 'shelter', 'vet')), 
  about text,
  goal text,
  location text, -- City/Area
  address text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Profiles Security
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- 3. Create REPORTS Table (Notify Rescuer)
create table public.reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  description text,
  location text, -- Text description
  latitude float,
  longitude float,
  urgency text check (urgency in ('low', 'medium', 'high', 'critical')),
  image_url text,
  contact_phone text,
  -- Status: pending, accepted, on_way, investigating, resolved, completed, rejected
  status text default 'pending' check (status in ('pending', 'accepted', 'on_way', 'investigating', 'resolved', 'completed', 'rejected')),
  rescuer_id uuid references public.profiles(id), -- Assigned rescuer
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Reports Security
alter table public.reports enable row level security;
create policy "Reports are viewable by everyone." on public.reports for select using (true);
create policy "Authenticated users can create reports." on public.reports for insert with check (auth.role() = 'authenticated');
create policy "Users can update their own reports." on public.reports for update using (auth.uid() = user_id);
create policy "Authenticated users (Rescuers) can update reports" on public.reports for update using (auth.role() = 'authenticated');

-- 4. Create ADOPTIONS Table (Marketplace - Enhanced 2.0)
create table public.adoptions (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  species text not null, -- dog, cat
  breed text,
  age text, -- e.g. "2 years", "5 months"
  gender text check (gender in ('Male', 'Female', 'Unknown')),
  description text,
  image_url text,
  
  -- Specific 2.0 Fields
  location text, -- City/Area where pet is
  medical_history text, -- Vaccinations, neutered status details
  vaccinated boolean default false,
  neutered boolean default false,
  behavior_notes text, -- Friendly, shy, etc
  good_with_kids boolean default null,
  good_with_pets boolean default null,
  
  status text default 'available' check (status in ('available', 'pending', 'adopted')),
  contact_info text,
  posted_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Adoptions Security
alter table public.adoptions enable row level security;
create policy "Adoption listings are viewable by everyone." on public.adoptions for select using (true);
create policy "Authenticated users can create adoption listings." on public.adoptions for insert with check (auth.role() = 'authenticated');
create policy "Users can update their own adoption listings." on public.adoptions for update using (auth.uid() = posted_by);

-- 5. Create ADOPTION REQUESTS Table (Detailed Applications)
create table public.adoption_requests (
  id uuid default gen_random_uuid() primary key,
  adoption_id uuid references public.adoptions(id) not null,
  requester_id uuid references public.profiles(id) not null,
  
  -- Application Status
  status text default 'pending' check (status in ('pending', 'under_review', 'approved', 'rejected', 'completed')),
  
  -- Application Details
  message text, -- Initial message
  phone text,
  address text,
  living_situation text, -- House, Apartment, Rent/Own
  experience text, -- Previous pets?
  has_other_pets boolean default false,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Adoption Requests Security
alter table public.adoption_requests enable row level security;
create policy "Users can view their own requests" on public.adoption_requests for select using (auth.uid() = requester_id);
create policy "Owners can view requests for their posts" on public.adoption_requests for select using (
    exists (
      select 1 from public.adoptions
      where public.adoptions.id = public.adoption_requests.adoption_id
      and public.adoptions.posted_by = auth.uid()
    )
  );
create policy "Authenticated users can create requests" on public.adoption_requests for insert with check (auth.role() = 'authenticated');
create policy "Owners and Requesters can update requests" on public.adoption_requests for update using (
    auth.uid() = requester_id OR
    exists (
      select 1 from public.adoptions
      where public.adoptions.id = public.adoption_requests.adoption_id
      and public.adoptions.posted_by = auth.uid()
    )
  );

-- 6. Create WISHLIST Table
create table public.wishlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  adoption_id uuid references public.adoptions(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, adoption_id)
);

-- Wishlist Security
alter table public.wishlist enable row level security;
create policy "Users can view own wishlist" on public.wishlist for select using (auth.uid() = user_id);
create policy "Users can manage own wishlist" on public.wishlist for insert with check (auth.uid() = user_id);
create policy "Users can delete own wishlist" on public.wishlist for delete using (auth.uid() = user_id);


-- 7. Storage Setup
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('rescue-images', 'rescue-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('adoption-images', 'adoption-images', true) ON CONFLICT (id) DO NOTHING;

-- Policies (Generic Public Read, Authenticated Upload)
-- Avatars
create policy "Public Access Avatars" on storage.objects for select using ( bucket_id = 'avatars' );
create policy "Auth Upload Avatars" on storage.objects for insert with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );
create policy "Owner Update Avatars" on storage.objects for update using ( bucket_id = 'avatars' and auth.uid() = owner );

-- Rescue Images
create policy "Public Access Rescue" on storage.objects for select using ( bucket_id = 'rescue-images' );
create policy "Auth Upload Rescue" on storage.objects for insert with check ( bucket_id = 'rescue-images' and auth.role() = 'authenticated' );

-- Adoption Images
create policy "Public Access Adoption" on storage.objects for select using ( bucket_id = 'adoption-images' );
create policy "Auth Upload Adoption" on storage.objects for insert with check ( bucket_id = 'adoption-images' and auth.role() = 'authenticated' );

COMMIT;
