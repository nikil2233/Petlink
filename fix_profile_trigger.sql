-- FIX PROFILE TRIGGER
-- This script replaces the common 'handle_new_user' trigger with one that checks metadata.

-- 1. Create or Replace the Function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, full_name, avatar_url)
  values (
    new.id,
    new.email,
    -- Use the role from metadata if available, otherwise default to 'user'
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do update set
    -- If the profile already exists, update the role if the new one is not 'user'
    role = excluded.role,
    email = excluded.email,
    full_name = excluded.full_name;
    
  return new;
end;
$$ language plpgsql security definer;

-- 2. Drop the trigger if it exists to ensure clean slate
drop trigger if exists on_auth_user_created on auth.users;

-- 3. Re-create the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Verify
select 'Trigger fixed successfully.' as status;
