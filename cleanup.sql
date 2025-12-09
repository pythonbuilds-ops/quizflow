-- CLEANUP: Remove unnecessary class_code column and related objects

-- 1. Drop the class_code column (we're using teacher_code instead)
alter table teachers drop column if exists class_code;

-- 2. Drop the function we created for generating class codes
drop function if exists generate_class_code();

-- 3. Drop any policies that reference class_code
drop policy if exists "Students can view linked teachers" on teachers;
drop policy if exists "Students can view teachers by class code or link" on teachers;

-- 4. Recreate a clean policy for students viewing teachers
-- Students can see teachers they are linked to, OR any teacher (for joining via teacher_code)
create policy "Students can view teachers" on teachers
    for select
    to authenticated
    using (true);

-- The above allows all authenticated users to read teachers table.
-- This is necessary for the "Join Class" lookup to work.
-- Teachers table only has name/email which is not sensitive.
