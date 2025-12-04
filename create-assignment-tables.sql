-- Migration script for manager dashboard functionality (Firebase Auth compatible)
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

-- 5. Create permissive RLS policies (since you're using Firebase Auth)
DROP POLICY IF EXISTS "Allow all on task_assignments" ON task_assignments;
CREATE POLICY "Allow all on task_assignments"
ON task_assignments
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on subtask_assignments" ON subtask_assignments;
CREATE POLICY "Allow all on subtask_assignments"
ON subtask_assignments
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 6. Grant necessary permissions
GRANT ALL ON task_assignments TO anon, authenticated;
GRANT ALL ON subtask_assignments TO anon, authenticated;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Assignment tables created successfully!';
  RAISE NOTICE 'Tables: task_assignments, subtask_assignments';
  RAISE NOTICE 'RLS policies: Permissive (works with Firebase Auth)';
  RAISE NOTICE 'You can now assign users to tasks and subtasks!';
END $$;
