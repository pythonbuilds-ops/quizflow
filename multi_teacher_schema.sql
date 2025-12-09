-- 1. Add class_code to teachers (unique identifier for students to join)
-- We use a substring of the UUID for simplicity, but in production, a random 6-char string is better.
-- Here we'll generate a random 6-character alphanumeric code.
alter table teachers 
add column if not exists class_code text unique;

-- Function to generate random class code
create or replace function generate_class_code() returns text as $$
declare
  chars text[] := '{A,B,C,D,E,F,G,H,J,K,L,M,N,P,Q,R,S,T,U,V,W,X,Y,Z,2,3,4,5,6,7,8,9}';
  result text := '';
  i integer := 0;
begin
  for i in 1..6 loop
    result := result || chars[1+random()*(array_length(chars, 1)-1)];
  end loop;
  return result;
end;
$$ language plpgsql;

-- Backfill existing teachers with a class code
update teachers 
set class_code = generate_class_code() 
where class_code is null;

-- Make it not null after backfill
alter table teachers 
alter column class_code set not null;

-- 2. Create Junction Table
create table if not exists student_teachers (
    id uuid primary key default gen_random_uuid(),
    student_id uuid references students(id) on delete cascade not null,
    teacher_id uuid references teachers(id) on delete cascade not null,
    created_at timestamp with time zone default now(),
    unique(student_id, teacher_id)
);

-- 3. Migrate existing data (Preserve current links)
insert into student_teachers (student_id, teacher_id)
select id, teacher_id 
from students 
where teacher_id is not null
on conflict (student_id, teacher_id) do nothing;

-- 4. Enable RLS on new table
alter table student_teachers enable row level security;

-- Policies for student_teachers
create policy "Students can view their own teacher links" on student_teachers
    for select using (auth.uid() = student_id);

create policy "Students can join classes" on student_teachers
    for insert with check (auth.uid() = student_id);

create policy "Teachers can view their linked students" on student_teachers
    for select using (exists (
        select 1 from teachers 
        where teachers.id = student_teachers.teacher_id 
        and teachers.id = auth.uid()
    ));

-- 5. Update Policies for Tests (Allow students to see tests from ALL linked teachers)
drop policy if exists "Students can view teacher tests" on tests;

create policy "Students can view tests from linked teachers" on tests
    for select
    using (
        exists (
            select 1 from student_teachers
            where student_teachers.teacher_id = tests.teacher_id
            and student_teachers.student_id = auth.uid()
        )
    );

-- 6. Update Policies for Teachers (Students can see profiles of ANY linked teacher)
drop policy if exists "Students can view their teacher" on teachers;

create policy "Students can view linked teachers" on teachers
    for select
    using (
        exists (
            select 1 from student_teachers
            where student_teachers.teacher_id = teachers.id
            and student_teachers.student_id = auth.uid()
        )
        OR
        -- Allow lookup by class_code for joining
        class_code is not null
    );
