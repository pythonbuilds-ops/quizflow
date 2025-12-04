-- Tests Table
create table tests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references teachers(id) on delete cascade not null,
  title text not null,
  subject text,
  duration integer, -- in minutes
  total_marks integer,
  marking_scheme jsonb default '{"correct": 4, "incorrect": -1}'::jsonb,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  questions jsonb not null, -- array of question objects
  created_at timestamp with time zone default now(),
  deleted_at timestamp with time zone -- for soft deletes
);

-- Test Submissions Table
create table test_submissions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references tests(id) on delete cascade not null,
  student_id uuid references students(id) on delete cascade not null,
  answers jsonb not null, -- {questionId: selectedOption}
  score numeric not null,
  max_score numeric not null,
  percentage numeric not null,
  time_taken integer, -- in seconds
  time_per_question jsonb, -- {questionId: seconds}
  tab_switches integer default 0,
  time_remaining integer, -- seconds remaining when paused/submitted
  last_active_at timestamp with time zone,
  submitted_at timestamp with time zone default now(),
  unique(test_id, student_id) -- one submission per student per test
);

-- Enable RLS
alter table tests enable row level security;
alter table test_submissions enable row level security;

-- RLS Policies for Tests

-- Teachers can insert their own tests
create policy "Teachers can insert own tests" on tests
  for insert
  with check (auth.uid() = teacher_id);

-- Teachers can view their own tests
create policy "Teachers can view own tests" on tests
  for select
  using (auth.uid() = teacher_id);

-- Teachers can update their own tests
create policy "Teachers can update own tests" on tests
  for update
  using (auth.uid() = teacher_id);

-- Teachers can delete their own tests
create policy "Teachers can delete own tests" on tests
  for delete
  using (auth.uid() = teacher_id);

-- Students can view tests from their teacher
create policy "Students can view teacher tests" on tests
  for select
  using (teacher_id = (select teacher_id from students where id = auth.uid()));

-- RLS Policies for Test Submissions

-- Students can insert their own submissions
create policy "Students can insert own submissions" on test_submissions
  for insert
  with check (auth.uid() = student_id);

-- Students can view their own submissions
create policy "Students can view own submissions" on test_submissions
  for select
  using (auth.uid() = student_id);

-- Teachers can view submissions for their tests
create policy "Teachers can view test submissions" on test_submissions
  for select
  using (exists (
    select 1 from tests
    where tests.id = test_submissions.test_id
    and tests.teacher_id = auth.uid()
  ));

-- Create indexes for performance
create index idx_tests_teacher_id on tests(teacher_id);
create index idx_tests_start_time on tests(start_time);
create index idx_submissions_test_id on test_submissions(test_id);
create index idx_submissions_student_id on test_submissions(student_id);
create index idx_tests_deleted_at on tests(deleted_at);
