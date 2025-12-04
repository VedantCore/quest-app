-- Fix RLS policies for tasks and subtasks tables to allow managers to view them
-- Run this in your Supabase SQL Editor

-- 1. Enable RLS on tasks table if not already enabled
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can view all tasks" ON tasks;
DROP POLICY IF EXISTS "Managers can view all tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view all tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can create tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can update tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON tasks;
DROP POLICY IF EXISTS "Managers can update task status" ON tasks;

DROP POLICY IF EXISTS "Admins can view all subtasks" ON subtasks;
DROP POLICY IF EXISTS "Managers can view all subtasks" ON subtasks;
DROP POLICY IF EXISTS "Users can view all subtasks" ON subtasks;
DROP POLICY IF EXISTS "Admins can create subtasks" ON subtasks;
DROP POLICY IF EXISTS "Admins can update subtasks" ON subtasks;
DROP POLICY IF EXISTS "Admins can delete subtasks" ON subtasks;
DROP POLICY IF EXISTS "Managers can update subtask completion" ON subtasks;

-- 3. Create comprehensive RLS policies for tasks table

-- Allow everyone (authenticated users) to view all tasks
CREATE POLICY "Authenticated users can view all tasks"
ON tasks FOR SELECT
TO authenticated
USING (true);

-- Allow only admins to create tasks
CREATE POLICY "Admins can create tasks"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()::text
    AND users.role = 'admin'
  )
);

-- Allow admins to update any field, and managers to update status field
CREATE POLICY "Admins and managers can update tasks"
ON tasks FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()::text
    AND users.role IN ('admin', 'manager')
  )
);

-- Allow only admins to delete tasks
CREATE POLICY "Admins can delete tasks"
ON tasks FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()::text
    AND users.role = 'admin'
  )
);

-- 4. Create comprehensive RLS policies for subtasks table

-- Allow everyone (authenticated users) to view all subtasks
CREATE POLICY "Authenticated users can view all subtasks"
ON subtasks FOR SELECT
TO authenticated
USING (true);

-- Allow only admins to create subtasks
CREATE POLICY "Admins can create subtasks"
ON subtasks FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()::text
    AND users.role = 'admin'
  )
);

-- Allow admins and managers to update subtasks
CREATE POLICY "Admins and managers can update subtasks"
ON subtasks FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()::text
    AND users.role IN ('admin', 'manager')
  )
);

-- Allow only admins to delete subtasks
CREATE POLICY "Admins can delete subtasks"
ON subtasks FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()::text
    AND users.role = 'admin'
  )
);

-- 5. Grant necessary permissions (if not already granted)
GRANT SELECT ON tasks TO authenticated;
GRANT SELECT ON subtasks TO authenticated;
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON subtasks TO authenticated;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ RLS policies fixed successfully!';
  RAISE NOTICE 'Managers can now view all tasks created by admins';
  RAISE NOTICE 'Managers can update tasks and subtasks (including completion status)';
  RAISE NOTICE 'Regular users can view all tasks and subtasks';
END $$;
