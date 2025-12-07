-- Reset Database Script
-- This script deletes all tables except 'users' to start fresh.
-- Run this in your Supabase SQL Editor.

-- Drop tables with CASCADE to handle foreign key constraints
DROP TABLE IF EXISTS task_assignments CASCADE;
DROP TABLE IF EXISTS subtask_assignments CASCADE;
DROP TABLE IF EXISTS point_history CASCADE;
DROP TABLE IF EXISTS subtasks CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;

-- Note: 'users' table is preserved.

-- Output message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Database reset successfully! All tables except users have been deleted.';
END $$;
