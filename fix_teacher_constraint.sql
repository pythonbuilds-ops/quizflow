-- Fix for: Unable to delete rows as one of them is currently referenced by a foreign key constraint from the table `students`
-- This script changes the foreign key constraint to CASCADE on delete.

ALTER TABLE students
DROP CONSTRAINT IF EXISTS students_teacher_id_fkey;

ALTER TABLE students
ADD CONSTRAINT students_teacher_id_fkey
    FOREIGN KEY (teacher_id)
    REFERENCES teachers(id)
    ON DELETE CASCADE;
