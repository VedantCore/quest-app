-- QUICK FIX: Populate user_companies table with test data
-- Run this in your Supabase SQL Editor

-- Step 1: Find your company ID
SELECT company_id, name FROM companies WHERE name = 'Company 1';
-- Copy the company_id from the result

-- Step 2: Find some users (managers and regular users)
SELECT user_id, name, email, role FROM users ORDER BY role, name;
-- Copy some user_ids

-- Step 3: Find your admin user_id (for assigned_by)
SELECT user_id, name, role FROM users WHERE role = 'admin' LIMIT 1;
-- Copy the admin user_id

-- Step 4: INSERT users into user_companies
-- REPLACE THE IDs BELOW WITH ACTUAL IDs FROM STEPS 1-3

-- Example (REPLACE WITH YOUR ACTUAL IDs):
INSERT INTO user_companies (user_id, company_id, assigned_by)
VALUES 
  -- Add managers (users with role='manager')
  ('MANAGER_USER_ID_1', 'COMPANY_1_ID', 'ADMIN_USER_ID'),
  ('MANAGER_USER_ID_2', 'COMPANY_1_ID', 'ADMIN_USER_ID'),
  
  -- Add regular users (users with role='user')
  ('REGULAR_USER_ID_1', 'COMPANY_1_ID', 'ADMIN_USER_ID'),
  ('REGULAR_USER_ID_2', 'COMPANY_1_ID', 'ADMIN_USER_ID'),
  ('REGULAR_USER_ID_3', 'COMPANY_1_ID', 'ADMIN_USER_ID');

-- Step 5: Verify the data was inserted
SELECT 
  uc.id,
  u.name as user_name,
  u.role as user_role,
  c.name as company_name
FROM user_companies uc
JOIN users u ON uc.user_id = u.user_id
JOIN companies c ON uc.company_id = c.company_id
WHERE c.name = 'Company 1'
ORDER BY u.role, u.name;

-- If you see results here, refresh your app and the managers/users should appear!
