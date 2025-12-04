-- Migration script for manager dashboard functionality
-- Run this in your Supabase SQL Editor

-- 1. Create task_assignments table
-- This tracks which user is assigned to complete an entire task
CREATE TABLE IF NOT EXISTS task_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id) -- One user per task
);

-- 2. Create subtask_assignments table
-- This tracks which user is assigned to complete a specific subtask
CREATE TABLE IF NOT EXISTS subtask_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtask_id UUID NOT NULL REFERENCES subtasks(subtask_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subtask_id) -- One user per subtask
);

-- 3. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_subtask_assignments_subtask_id ON subtask_assignments(subtask_id);
CREATE INDEX IF NOT EXISTS idx_subtask_assignments_user_id ON subtask_assignments(user_id);

-- 4. Enable Row Level Security
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtask_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies for task_assignments

-- Allow managers and admins to view all assignments
CREATE POLICY "Managers and admins can view task assignments"
ON task_assignments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.role IN ('manager', 'admin')
  )
);

-- Allow users to view their own assignments
CREATE POLICY "Users can view their own task assignments"
ON task_assignments FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow managers and admins to insert assignments
CREATE POLICY "Managers and admins can create task assignments"
ON task_assignments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.role IN ('manager', 'admin')
  )
);

-- Allow managers and admins to update assignments
CREATE POLICY "Managers and admins can update task assignments"
ON task_assignments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.role IN ('manager', 'admin')
  )
);

-- Allow managers and admins to delete assignments
CREATE POLICY "Managers and admins can delete task assignments"
ON task_assignments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.role IN ('manager', 'admin')
  )
);

-- 6. Create RLS Policies for subtask_assignments

-- Allow managers and admins to view all assignments
CREATE POLICY "Managers and admins can view subtask assignments"
ON subtask_assignments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.role IN ('manager', 'admin')
  )
);

-- Allow users to view their own assignments
CREATE POLICY "Users can view their own subtask assignments"
ON subtask_assignments FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow managers and admins to insert assignments
CREATE POLICY "Managers and admins can create subtask assignments"
ON subtask_assignments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.role IN ('manager', 'admin')
  )
);

-- Allow managers and admins to update assignments
CREATE POLICY "Managers and admins can update subtask assignments"
ON subtask_assignments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.role IN ('manager', 'admin')
  )
);

-- Allow managers and admins to delete assignments
CREATE POLICY "Managers and admins can delete subtask assignments"
ON subtask_assignments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.role IN ('manager', 'admin')
  )
);

-- 7. Grant necessary permissions
GRANT ALL ON task_assignments TO authenticated;
GRANT ALL ON subtask_assignments TO authenticated;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Tables created: task_assignments, subtask_assignments';
  RAISE NOTICE 'Indexes and RLS policies have been applied';
END $$;
