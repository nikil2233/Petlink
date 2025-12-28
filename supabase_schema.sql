-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE (Public profiles for users)
-- Dropping and recreating is easiest for dev, but standard ALTER is safer for production.
-- Since this is Sprint 1 dev, we'll assume we can drop or just ensure columns exist.

create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text, -- Name / Shelter Name / Vet Name
  role text default 'user' check (role in ('user', 'rescuer', 'shelter', 'vet')), 
  address text,
  location text, -- City / Location
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Access policies for Profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- REPORTS TABLE
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id),
  description text,
  location text,
  image_url text,
  status text default 'pending' check (status in ('pending', 'investigating', 'resolved')),
  urgency text check (urgency in ('low', 'medium', 'high', 'critical')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Access policies for Reports
alter table public.reports enable row level security;

create policy "Reports are viewable by everyone."
  on public.reports for select
  using ( true );

create policy "Authenticated users can create reports."
  on public.reports for insert
  with check ( auth.role() = 'authenticated' );

create policy "Users can update their own reports."
  on public.reports for update
  using ( auth.uid() = user_id );

-- ADOPTIONS TABLE
create table public.adoptions (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  species text not null,
  breed text,
  age text,
  gender text,
  description text,
  image_url text,
  status text default 'available' check (status in ('available', 'pending', 'adopted')),
  contact_info text,
  posted_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Access policies for Adoptions
alter table public.adoptions enable row level security;

create policy "Adoption listings are viewable by everyone."
  on public.adoptions for select
  using ( true );

create policy "Authenticated users can create adoption listings."
  on public.adoptions for insert
  with check ( auth.role() = 'authenticated' );
