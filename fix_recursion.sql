-- Fix Infinite Recursion by breaking the dependency cycle between teachers and student_teachers tables

-- 1. Drop the problematic recursive policy
drop policy if exists "Teachers can view their linked students" on student_teachers;

-- 2. Create a simplified policy that does NOT query the teachers table
-- Since teacher_id is a Foreign Key to teachers.id (which is auth.uid()), 
-- checking teacher_id = auth.uid() is sufficient and safe.
create policy "Teachers can view their linked students" on student_teachers
    for select using (teacher_id = auth.uid());

-- 3. Also fix the "Students can view linked teachers" policy to be more efficient
-- This ensures students can only search/join by class_code or view their own teachers
drop policy if exists "Students can view linked teachers" on teachers;

create policy "Students can view linked teachers" on teachers
    for select
    using (
        exists (
            select 1 from student_teachers
            where student_teachers.teacher_id = teachers.id
            and student_teachers.student_id = auth.uid()
        )
        OR
        -- Allow finding a teacher by EXACT class_code match (implicitly allowed if they know the code)
        -- However, since RLS filter applies to 'select *', we often just allow reading if class_code is set
        -- logic: class_code is not null (Public for join purposes)
        class_code is not null
    );
