-- Quick verification script
-- Run this after the migration to check if everything is set up correctly

-- 1. Check if tables exist
SELECT 
  'task_assignments' as table_name,
  COUNT(*) as row_count
FROM task_assignments
UNION ALL
SELECT 
  'subtask_assignments' as table_name,
  COUNT(*) as row_count
FROM subtask_assignments;

-- 2. Check if indexes exist
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('task_assignments', 'subtask_assignments')
ORDER BY tablename, indexname;

-- 3. Check RLS policies
SELECT
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE tablename IN ('task_assignments', 'subtask_assignments')
ORDER BY tablename, policyname;

-- 4. List all managers
SELECT 
  user_id,
  name,
  email,
  role,
  created_at
FROM users
WHERE role = 'manager'
ORDER BY created_at DESC;

-- 5. Sample query to see tasks with assignments
SELECT 
  t.task_id,
  t.heading,
  t.status,
  ta.user_id as assigned_to,
  u.name as assigned_user_name
FROM tasks t
LEFT JOIN task_assignments ta ON t.task_id = ta.task_id
LEFT JOIN users u ON ta.user_id = u.user_id
ORDER BY t.created_at DESC
LIMIT 5;
