-- Fix unique constraint issue on subtask_assignments table
-- This allows reassigning subtasks after unassigning them
-- Run this in your Supabase SQL Editor

-- Drop the unique constraint on subtask_id
-- This constraint prevents assigning a subtask more than once
ALTER TABLE subtask_assignments 
DROP CONSTRAINT IF EXISTS subtask_assignments_subtask_id_key;

-- Drop the unique constraint on task_id if it exists
ALTER TABLE task_assignments 
DROP CONSTRAINT IF EXISTS task_assignments_task_id_key;

-- Verify constraints have been removed
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Unique constraints removed from assignment tables!';
  RAISE NOTICE 'Subtasks and tasks can now be reassigned after unassigning';
END $$;

-- Show remaining constraints for verification
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'subtask_assignments'::regclass
   OR conrelid = 'task_assignments'::regclass
ORDER BY conrelid, conname;
