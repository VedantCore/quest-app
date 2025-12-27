-- DEBUG: Check RLS policies on user_companies table
-- Run this in Supabase SQL Editor

-- 1. Check current RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_companies';

-- 2. Temporarily disable RLS to test (ONLY FOR DEBUGGING)
-- WARNING: This makes the table publicly readable - only use for testing!
ALTER TABLE user_companies DISABLE ROW LEVEL SECURITY;

-- 3. After testing, re-enable RLS
-- ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
