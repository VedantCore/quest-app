-- Quick script to assign users to companies for testing
-- Run this in your Supabase SQL Editor

-- Step 1: Check what companies exist
SELECT company_id, name FROM companies;

-- Step 2: Check what users exist (and their roles)
SELECT user_id, name, email, role FROM users ORDER BY role, name;

-- Step 3: Assign users to a company
-- Replace the IDs below with actual IDs from steps 1 and 2

-- Example: Assign 2 managers and 3 users to a company
INSERT INTO user_companies (user_id, company_id, assigned_by)
VALUES 
  -- Replace these with your actual user_id, company_id, and admin user_id
  ('manager-user-id-1', 'your-company-id', 'your-admin-user-id'),
  ('manager-user-id-2', 'your-company-id', 'your-admin-user-id'),
  ('regular-user-id-1', 'your-company-id', 'your-admin-user-id'),
  ('regular-user-id-2', 'your-company-id', 'your-admin-user-id'),
  ('regular-user-id-3', 'your-company-id', 'your-admin-user-id');

-- Step 4: Verify the assignments
SELECT 
  uc.id,
  u.name as user_name,
  u.role as user_role,
  c.name as company_name,
  uc.assigned_at
FROM user_companies uc
JOIN users u ON uc.user_id = u.user_id
JOIN companies c ON uc.company_id = c.company_id
ORDER BY c.name, u.role, u.name;

-- Step 5: Test the query that the app uses (for managers)
SELECT 
  uc.user_id,
  u.user_id,
  u.name,
  u.email,
  u.role,
  u.avatar_url,
  u.created_at,
  u.total_points
FROM user_companies uc
INNER JOIN users u ON uc.user_id = u.user_id
WHERE uc.company_id = 'your-company-id' AND u.role = 'manager';

-- Step 6: Test the query that the app uses (for regular users)
SELECT 
  uc.user_id,
  u.user_id,
  u.name,
  u.email,
  u.role,
  u.avatar_url,
  u.created_at,
  u.total_points
FROM user_companies uc
INNER JOIN users u ON uc.user_id = u.user_id
WHERE uc.company_id = 'your-company-id' AND u.role = 'user';
