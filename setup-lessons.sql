-- ============================================================================
-- Lessons + makeups (run AFTER setup.sql, once Supabase is configured).
-- A "lesson" is a saved, ordered list of presented items captured by the
-- assessment apps' session log. A makeup link is:  <page>.html?lesson=<uuid>
-- which the student opens to replay exactly what was done in class.
-- ============================================================================

create table lessons (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references profiles(id) on delete set null,
  title      text,
  app        text,                         -- 'tonal' | 'rhythm' | 'tune'
  items      jsonb not null default '[]',  -- the session-log items array
  created_at timestamptz default now()
);

-- when a student passes an item during replay
create table makeup_events (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid references lessons(id) on delete cascade,
  student_name text,
  idx         int,
  app         text,
  item_id     text,
  passed      boolean,
  occurred_at timestamptz default now()
);

-- ---- Row Level Security ----------------------------------------------------
alter table lessons       enable row level security;
alter table makeup_events enable row level security;

-- Teachers create/manage their own lessons...
create policy "teachers manage own lessons" on lessons
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- ...but a lesson is readable by anyone holding the link (makeup students may be
-- unauthenticated). The items are non-sensitive (patterns/keys/tempos).
create policy "lessons readable by link" on lessons
  for select using (true);

-- Anyone can log a makeup completion (anon students); the owning teacher reads them.
create policy "anyone logs makeup" on makeup_events
  for insert with check (true);
create policy "teacher reads own lesson makeups" on makeup_events
  for select using (
    exists (select 1 from lessons l where l.id = lesson_id and l.teacher_id = auth.uid())
  );
