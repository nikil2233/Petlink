-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- *** DANGER: DROP TABLES IF THEY EXIST TO START FRESH ***
-- This avoids the "relation already exists" error.
-- WARNING: This will delete all data in these tables.
DROP TABLE IF EXISTS public.wishlist CASCADE;
DROP TABLE IF EXISTS public.adoption_requests CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.adoptions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;


-- 1. PROFILES TABLE (Users, Vets, Rescuers, Shelters)
-- Linked to auth.users
create table public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text unique not null,
  role text not null default 'user', -- 'user', 'rescuer', 'shelter', 'vet'
  full_name text,
  avatar_url text,
  location text, -- City/District text
  address text,
  about text,
  goal text,
  latitude float,
  longitude float,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- 2. ADOPTIONS TABLE (Pets listed for adoption)
create table public.adoptions (
  id uuid default uuid_generate_v4() primary key,
  posted_by uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  species text not null, -- 'dog', 'cat', etc.
  breed text,
  age_years int,
  age_months int,
  gender text,
  location text,
  description text,
  medical_history text,
  behavior_notes text,
  vaccinated boolean default false,
  neutered boolean default false,
  good_with_kids boolean default false,
  good_with_pets boolean default false,
  contact_info text,
  image_url text,
  status text default 'available', -- 'available', 'adopted'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for adoptions
alter table public.adoptions enable row level security;

-- Policies for adoptions
create policy "Adoptions are viewable by everyone."
  on adoptions for select
  using ( true );

create policy "Authenticated users can create adoption listings."
  on adoptions for insert
  with check ( auth.role() = 'authenticated' );

create policy "Users can update their own listings."
  on adoptions for update
  using ( auth.uid() = posted_by );

create policy "Users can delete their own listings."
  on adoptions for delete
  using ( auth.uid() = posted_by );


-- 3. REPORTS TABLE (Rescue requests)
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null, -- The reporter
  description text not null,
  location text,
  latitude float,
  longitude float,
  urgency text, -- 'low', 'medium', 'high', 'critical'
  image_url text,
  assigned_rescuer_id uuid references public.profiles(id) on delete set null, -- Who it was sent to
  status text default 'pending', -- 'pending', 'accepted', 'resolved', 'dismissed'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for reports
alter table public.reports enable row level security;

-- Policies for reports
create policy "Reports are viewable by everyone."
  on reports for select
  using ( true );

create policy "Authenticated users can create reports."
  on reports for insert
  with check ( auth.role() = 'authenticated' );

create policy "Users can update their own reports."
  on reports for update
  using ( auth.uid() = user_id );

-- 4. APPOINTMENTS TABLE (Vet bookings)
create table public.appointments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null, -- Pet owner
  vet_id uuid references public.profiles(id) on delete cascade not null, -- Vet/Clinic
  service_type text not null, -- 'sterilization', 'vaccination'
  date date not null,
  time_slot text not null,
  status text default 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for appointments
alter table public.appointments enable row level security;

-- Policies for appointments
create policy "Users can see their own appointments or appointments for them (vets)."
  on appointments for select
  using ( auth.uid() = user_id OR auth.uid() = vet_id );

create policy "Users can create appointments."
  on appointments for insert
  with check ( auth.role() = 'authenticated' );

create policy "Users and Vets can update statuses."
  on appointments for update
  using ( auth.uid() = user_id OR auth.uid() = vet_id );


-- 5. NOTIFICATIONS TABLE
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null, -- 'appointment_request', 'report_update', etc.
  message text not null,
  metadata jsonb,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for notifications
alter table public.notifications enable row level security;

-- Policies for notifications
create policy "Users can see their own notifications."
  on notifications for select
  using ( auth.uid() = user_id );

create policy "System/Users can insert notifications."
  on notifications for insert
  with check ( true ); 

create policy "Users can update (mark read) their own notifications."
  on notifications for update
  using ( auth.uid() = user_id );


-- 6. ADOPTION REQUESTS TABLE (Applications to adopt a pet)
create table public.adoption_requests (
  id uuid default uuid_generate_v4() primary key,
  adoption_id uuid references public.adoptions(id) on delete cascade not null,
  requester_id uuid references public.profiles(id) on delete cascade not null,
  phone text,
  address text,
  living_situation text,
  experience text,
  has_other_pets boolean,
  message text,
  status text default 'pending', -- 'pending', 'approved', 'rejected'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for adoption requests
alter table public.adoption_requests enable row level security;

-- Policies for adoption_requests
create policy "Users can see their own requests."
  on adoption_requests for select
  using ( auth.uid() = requester_id );

create policy "Pet posters can see requests for their pets."
  on adoption_requests for select
  using ( 
    exists (
      select 1 from adoptions 
      where adoptions.id = adoption_requests.adoption_id 
      and adoptions.posted_by = auth.uid()
    )
  );

create policy "Users can create adoption requests."
  on adoption_requests for insert
  with check ( auth.role() = 'authenticated' );

create policy "Pet posters can update status of requests."
  on adoption_requests for update
  using ( 
    exists (
      select 1 from adoptions 
      where adoptions.id = adoption_requests.adoption_id 
      and adoptions.posted_by = auth.uid()
    )
  );


-- 7. WISHLIST TABLE (User favorites)
create table public.wishlist (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  adoption_id uuid references public.adoptions(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, adoption_id)
);

alter table public.wishlist enable row level security;

create policy "Users can manage their own wishlist."
  on wishlist for all
  using ( auth.uid() = user_id );


-- ==========================================
-- 8. STORAGE SETTINGS (BUCKETS & POLICIES)
-- ==========================================

-- Create storage buckets
insert into storage.buckets (id, name, public)
values 
  ('avatars', 'avatars', true),
  ('adoption-images', 'adoption-images', true),
  ('rescue-images', 'rescue-images', true)
on conflict (id) do nothing;

-- Set up security policies for storage.objects
-- Note: You might need to drop existing policies if you run this multiple times
-- DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated Insert Access" ON storage.objects;
-- DROP POLICY IF EXISTS "Update Own Objects" ON storage.objects;


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
