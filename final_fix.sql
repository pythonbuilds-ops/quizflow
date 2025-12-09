-- Final recursive policy fix and column check

-- 1. Ensure the recursive policy is definitely gone and replaced
drop policy if exists "Teachers can view their linked students" on student_teachers;
drop policy if exists "Students can view linked teachers" on teachers;

-- Simple non-recursive policy for teachers viewing students
create policy "Teachers can view their linked students" on student_teachers
    for select using (teacher_id = auth.uid());

-- Fix query for joining class by code
-- We need to allow students to READ specific teacher details if they have the exact class code
create policy "Students can view teachers by class code or link" on teachers
    for select
    using (
        -- Option A: They are already linked
        exists (
            select 1 from student_teachers
            where student_teachers.teacher_id = teachers.id
            and student_teachers.student_id = auth.uid()
        )
        OR
        -- Option B: They are searching by class_code (Public-ish)
        -- This allows any auth user to see a teacher row if they query by class_code
        class_code is not null
    );

-- 2. Add school_name if it's missing (optional, based on user report)
alter table teachers add column if not exists school_name text;
