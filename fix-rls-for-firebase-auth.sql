-- Fix RLS policies for Firebase authentication setup
-- Since you're using Firebase Auth (not Supabase Auth), we need a different approach
-- Run this in your Supabase SQL Editor

-- Option 1: Disable RLS (Simple but less secure - good for development)
-- Uncomment these lines if you want to completely disable RLS:
-- ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE subtasks DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE task_assignments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE subtask_assignments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE point_history DISABLE ROW LEVEL SECURITY;

-- Option 2: Use permissive policies that allow all authenticated access
-- This keeps RLS enabled but makes it permissive for all operations

-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can view all tasks" ON tasks;
DROP POLICY IF EXISTS "Managers can view all tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view all tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can view all tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can create tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can update tasks" ON tasks;
DROP POLICY IF EXISTS "Admins and managers can update tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON tasks;
DROP POLICY IF EXISTS "Managers can update task status" ON tasks;

DROP POLICY IF EXISTS "Admins can view all subtasks" ON subtasks;
DROP POLICY IF EXISTS "Managers can view all subtasks" ON subtasks;
DROP POLICY IF EXISTS "Users can view all subtasks" ON subtasks;
DROP POLICY IF EXISTS "Authenticated users can view all subtasks" ON subtasks;
DROP POLICY IF EXISTS "Admins can create subtasks" ON subtasks;
DROP POLICY IF EXISTS "Admins can update subtasks" ON subtasks;
DROP POLICY IF EXISTS "Admins and managers can update subtasks" ON subtasks;
DROP POLICY IF EXISTS "Admins can delete subtasks" ON subtasks;
DROP POLICY IF EXISTS "Managers can update subtask completion" ON subtasks;

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

-- Create permissive policies that allow ALL operations
-- Since Firebase handles auth, we just need Supabase to allow data access

-- Tasks table - allow all operations
CREATE POLICY "Allow all operations on tasks"
ON tasks
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Subtasks table - allow all operations
CREATE POLICY "Allow all operations on subtasks"
ON subtasks
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Make sure other tables also have permissive policies
DROP POLICY IF EXISTS "Allow all on users" ON users;
CREATE POLICY "Allow all on users"
ON users
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Handle task_assignments table (only if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'task_assignments') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all on task_assignments" ON task_assignments';
    EXECUTE 'CREATE POLICY "Allow all on task_assignments" ON task_assignments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON task_assignments TO anon, authenticated';
    RAISE NOTICE 'Applied policies to task_assignments table';
  ELSE
    RAISE NOTICE 'task_assignments table does not exist, skipping';
  END IF;
END $$;

-- Handle subtask_assignments table (only if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subtask_assignments') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all on subtask_assignments" ON subtask_assignments';
    EXECUTE 'CREATE POLICY "Allow all on subtask_assignments" ON subtask_assignments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON subtask_assignments TO anon, authenticated';
    RAISE NOTICE 'Applied policies to subtask_assignments table';
  ELSE
    RAISE NOTICE 'subtask_assignments table does not exist, skipping';
  END IF;
END $$;

-- Handle point_history table (only if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'point_history') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all on point_history" ON point_history';
    EXECUTE 'CREATE POLICY "Allow all on point_history" ON point_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON point_history TO anon, authenticated';
    RAISE NOTICE 'Applied policies to point_history table';
  ELSE
    RAISE NOTICE 'point_history table does not exist, skipping';
  END IF;
END $$;

-- Grant permissions on existing tables
GRANT ALL ON tasks TO anon, authenticated;
GRANT ALL ON subtasks TO anon, authenticated;
GRANT ALL ON users TO anon, authenticated;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ RLS policies updated for Firebase authentication!';
  RAISE NOTICE 'All tables now allow full access through Supabase client';
  RAISE NOTICE 'Authentication is handled by Firebase on the application side';
  RAISE NOTICE 'For production, consider implementing app-level authorization checks';
END $$;
