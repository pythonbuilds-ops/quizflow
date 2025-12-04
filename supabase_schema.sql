-- IMPORTANT: Run this COMPLETE script to fix the 406 errors

-- Drop ALL existing policies first
drop policy if exists "Teachers can view own profile" on teachers;
drop policy if exists "Teachers can insert own profile" on teachers;
drop policy if exists "Teachers can update own profile" on teachers;
drop policy if exists "Teachers can view their students" on students;
drop policy if exists "Students can view own profile" on students;
drop policy if exists "Students can insert own profile" on students;
drop policy if exists "Students can update own profile" on students;
drop policy if exists "Students can view their teacher" on teachers;

-- Make sure RLS is enabled
alter table teachers enable row level security;
alter table students enable row level security;

-- CRITICAL: INSERT policies (must come first!)
create policy "Teachers can insert own profile" on teachers 
  for insert 
  with check (auth.uid() = id);

create policy "Students can insert own profile" on students 
  for insert 
  with check (auth.uid() = id);

-- SELECT policies (FIXED: removed the restrictive conditions)
create policy "Teachers can view own profile" on teachers 
  for select 
  using (auth.uid() = id);

create policy "Students can view own profile" on students 
  for select 
  using (auth.uid() = id);

-- Cross-table SELECT policies
create policy "Teachers can view their students" on students 
  for select 
  using (teacher_id = auth.uid());

create policy "Students can view their teacher" on teachers 
  for select 
  using (exists (
    select 1 from students 
    where students.id = auth.uid() 
    and students.teacher_id = teachers.id
  ));

-- UPDATE policies
create policy "Teachers can update own profile" on teachers 
  for update 
  using (auth.uid() = id);

create policy "Students can update own profile" on students 
  for update 
  using (auth.uid() = id);
