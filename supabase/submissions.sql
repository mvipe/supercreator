-- Assignment Submissions table for tracking student submissions and grades
create table if not exists public.mp_submissions (
  id                   uuid primary key default gen_random_uuid(),
  course_id            uuid not null references mp_courses(id) on delete cascade,
  lesson_id            text not null,  -- lesson id from jsonb
  student_id           uuid not null references auth.users(id) on delete cascade,
  submission_url       text not null,  -- file URL in storage
  submission_text      text default '', -- optional text notes
  submitted_at         timestamptz not null default now(),

  -- Grading fields
  marked                boolean not null default false,
  marks_obtained       integer,  -- points earned
  marks_total          integer,  -- total possible
  feedback             text default '', -- teacher feedback/comments
  marked_at            timestamptz,
  marked_by            uuid references auth.users(id) on delete set null,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique(course_id, lesson_id, student_id)
);

-- Enable RLS
alter table public.mp_submissions enable row level security;

-- RLS Policy: Students can only see their own submissions
drop policy if exists "students_view_own_submissions" on public.mp_submissions;
create policy "students_view_own_submissions" on public.mp_submissions
  for select using (student_id = auth.uid());

-- RLS Policy: Creators can see submissions for their own courses
drop policy if exists "creators_view_course_submissions" on public.mp_submissions;
create policy "creators_view_course_submissions" on public.mp_submissions
  for select using (
    course_id in (
      select id from mp_courses where owner_id = auth.uid()
    )
  );

-- RLS Policy: Students can insert their own submissions
drop policy if exists "students_insert_submissions" on public.mp_submissions;
create policy "students_insert_submissions" on public.mp_submissions
  for insert with check (student_id = auth.uid());

-- RLS Policy: Creators can update submissions for their courses (for grading)
drop policy if exists "creators_grade_submissions" on public.mp_submissions;
create policy "creators_grade_submissions" on public.mp_submissions
  for update using (
    course_id in (
      select id from mp_courses where owner_id = auth.uid()
    )
  );

-- Create indexes for performance
create index if not exists idx_submissions_course_id on public.mp_submissions(course_id);
create index if not exists idx_submissions_student_id on public.mp_submissions(student_id);
create index if not exists idx_submissions_lesson_id on public.mp_submissions(lesson_id);
create index if not exists idx_submissions_marked on public.mp_submissions(marked);