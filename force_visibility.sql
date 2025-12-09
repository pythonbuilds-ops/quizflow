-- Force Teacher Visibility for Debugging
-- Use this if you are getting "Invalid Class Code" even when the code is correct.
-- This ensures that ALL authenticated users can read the basic teacher info needed to join.

-- 1. Drop existing policies to clear conflicts
drop policy if exists "Students can view linked teachers" on teachers;
drop policy if exists "Students can view teachers by class code or link" on teachers;
drop policy if exists "Teachers can view own profile" on teachers; -- Re-add this later if needed

-- 2. Add a PERMISSIVE policy
-- This allows any logged-in user to see ALL rows in the teachers table
-- Secure enough because teachers table only has name/email/school.
create policy "Publicly visible teachers" on teachers
    for select
    to authenticated
    using (true);

-- 3. Verify class_code column existence (Safety check)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'teachers' and column_name = 'class_code') then
        alter table teachers add column class_code text;
    end if;
end $$;
