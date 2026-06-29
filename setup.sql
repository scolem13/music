-- ============================================================================
-- One-time Supabase setup for the Quarto demo.
-- Paste this whole file into the Supabase SQL Editor (cloud) or run against
-- your local instance, then run the role-assignment block at the very bottom
-- once your test accounts have signed in.
-- ============================================================================

-- ---- Tables ----------------------------------------------------------------
create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text check (role in ('student','teacher','school_admin','parent')),
  school_id uuid references schools(id),
  created_at timestamptz default now()
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  teacher_id uuid references profiles(id),
  name text not null,
  join_code text unique not null
);

create table enrollments (
  class_id uuid references classes(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  primary key (class_id, student_id)
);

create table guardianships (
  parent_id uuid references profiles(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  primary key (parent_id, student_id)
);

create table activity_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  actor_name text,
  app text, item_id text, event text,
  occurred_at timestamptz default now()
);

create table page_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade,
  student_name text,
  page text not null,
  opened_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  active_seconds int default 0
);

-- ---- Auto-create a profile on every new sign-in ----------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, display_name)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---- Helper functions (prevent RLS recursion) ------------------------------
create or replace function my_role()
returns text language sql security definer stable set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function my_school()
returns uuid language sql security definer stable set search_path = public as $$
  select school_id from profiles where id = auth.uid()
$$;

-- ---- Row Level Security ----------------------------------------------------
alter table schools        enable row level security;
alter table profiles       enable row level security;
alter table classes        enable row level security;
alter table enrollments    enable row level security;
alter table guardianships  enable row level security;
alter table activity_events enable row level security;
alter table page_sessions  enable row level security;

create policy "read profiles" on profiles for select using (
  id = auth.uid()
  or (my_role() = 'school_admin' and school_id = my_school())
);

create policy "read classes" on classes for select using (
  teacher_id = auth.uid()
  or (my_role() = 'school_admin' and school_id = my_school())
  or id in (select class_id from enrollments where student_id = auth.uid())
);

-- Students write their own activity; everyone reads per their role.
create policy "insert own activity" on activity_events for insert to authenticated
  with check (student_id = auth.uid() and my_role() = 'student');

create policy "read activity" on activity_events for select using (
  student_id = auth.uid()
  or student_id in (
    select e.student_id from enrollments e
    join classes c on c.id = e.class_id
    where c.teacher_id = auth.uid())
  or (my_role() = 'school_admin'
      and student_id in (select id from profiles where school_id = my_school()))
  or student_id in (select student_id from guardianships where parent_id = auth.uid())
);

create policy "insert own page_sessions" on page_sessions for insert to authenticated
  with check (student_id = auth.uid());

create policy "update own page_sessions" on page_sessions for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "read page_sessions" on page_sessions for select using (
  student_id = auth.uid()
  or student_id in (
    select e.student_id from enrollments e
    join classes c on c.id = e.class_id
    where c.teacher_id = auth.uid())
  or (my_role() = 'school_admin'
      and student_id in (select id from profiles where school_id = my_school()))
  or student_id in (select student_id from guardianships where parent_id = auth.uid())
);

-- ============================================================================
-- RUN THIS PART LATER, after your test accounts have signed in once.
-- Roles are assigned, never self-claimed. Edit the emails to match yours.
-- ============================================================================
-- insert into schools (name) values ('Demo Middle School');
--
-- select id, email, role from profiles;   -- copy the ids/emails you see
--
-- update profiles set role='school_admin',
--   school_id=(select id from schools where name='Demo Middle School')
--   where email='you+admin@gmail.com';
-- update profiles set role='teacher',
--   school_id=(select id from schools where name='Demo Middle School')
--   where email='you+teacher@gmail.com';
-- update profiles set role='student',
--   school_id=(select id from schools where name='Demo Middle School')
--   where email='you+student@gmail.com';
-- update profiles set role='parent',
--   school_id=(select id from schools where name='Demo Middle School')
--   where email='you+parent@gmail.com';
--
-- insert into classes (school_id, teacher_id, name, join_code) values (
--   (select id from schools where name='Demo Middle School'),
--   (select id from profiles where email='you+teacher@gmail.com'),
--   'Concert Band 1', 'BAND1');
-- insert into enrollments (class_id, student_id) values (
--   (select id from classes where join_code='BAND1'),
--   (select id from profiles where email='you+student@gmail.com'));
-- insert into guardianships (parent_id, student_id) values (
--   (select id from profiles where email='you+parent@gmail.com'),
--   (select id from profiles where email='you+student@gmail.com'));
