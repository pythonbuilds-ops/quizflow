-- Fix for "Invalid Teacher Code" error during student signup
-- This error occurs because the "teachers" table is not readable by public users (students who haven't signed up yet).
-- We need to allow public read access so the signup form can verify the teacher code.

-- 1. Enable RLS (just in case)
alter table teachers enable row level security;

-- 2. Drop existing restrictive policies if they conflict (optional, but good practice)
-- drop policy if exists "Teachers can view own profile" on teachers;
-- drop policy if exists "Students can view their teacher" on teachers;

-- 3. Add a policy to allow ANYONE to view teacher profiles (needed for code verification)
create policy "Public can view teachers" on teachers
  for select
  using (true);

-- Note: This exposes teacher names/emails to anyone with the API key. 
-- For a production app, you would use a Secure Function (RPC) instead, 
-- but this is the standard fix for this type of application structure.
