-- COPY AND RUN THIS IN SUPABASE SQL EDITOR
-- This will assign users to Company 1

-- First, let's see what we have:
SELECT 'COMPANIES:' as info;
SELECT company_id, name FROM companies;

SELECT 'USERS:' as info;
SELECT user_id, name, email, role FROM users ORDER BY role;

-- Now insert some assignments
-- Replace the user_ids below with actual user_ids from the query above
-- The company_id is: 92f4010f-23bd-410b-92a5-5285d711344d

-- EXAMPLE - REPLACE WITH YOUR ACTUAL USER IDs:
INSERT INTO user_companies (user_id, company_id, assigned_by)
SELECT 
  u.user_id,
  '92f4010f-23bd-410b-92a5-5285d711344d'::uuid,
  (SELECT user_id FROM users WHERE role = 'admin' LIMIT 1)
FROM users u
WHERE u.role IN ('manager', 'user')
LIMIT 5;  -- This will assign the first 5 managers/users to the company

-- Verify the assignments:
SELECT 
  u.name,
  u.email,
  u.role,
  c.name as company_name
FROM user_companies uc
JOIN users u ON uc.user_id = u.user_id
JOIN companies c ON uc.company_id = c.company_id
WHERE uc.company_id = '92f4010f-23bd-410b-92a5-5285d711344d';

-- If you see results above, REFRESH YOUR APP and the managers/users will appear!
