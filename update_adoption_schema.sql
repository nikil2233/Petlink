-- ADOPTIONS TABLE (Ensure it exists and has correct fields)
create table if not exists public.adoptions (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  species text not null,
  breed text,
  age text,
  gender text,
  description text,
  image_url text, -- For the pet image
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

create policy "Users can update their own adoption listings."
  on public.adoptions for update
  using ( auth.uid() = posted_by );

-- ADOPTION REQUESTS TABLE (Appointments / Bids)
create table if not exists public.adoption_requests (
  id uuid default uuid_generate_v4() primary key,
  adoption_id uuid references public.adoptions(id) not null,
  requester_id uuid references public.profiles(id) not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  message text, -- "Send appointment request" message
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Access policies for Adoption Requests
alter table public.adoption_requests enable row level security;

create policy "Users can view their own requests"
  on public.adoption_requests for select
  using ( auth.uid() = requester_id );

create policy "Owners can view requests for their posts"
  on public.adoption_requests for select
  using ( exists (
    select 1 from public.adoptions
    where public.adoptions.id = public.adoption_requests.adoption_id
    and public.adoptions.posted_by = auth.uid()
  ));

create policy "Authenticated users can create requests"
  on public.adoption_requests for insert
  with check ( auth.role() = 'authenticated' );

create policy "Owners can update status of requests"
  on public.adoption_requests for update
  using ( exists (
    select 1 from public.adoptions
    where public.adoptions.id = public.adoption_requests.adoption_id
    and public.adoptions.posted_by = auth.uid()
  ));
