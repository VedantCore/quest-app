-- Check if user_companies table has data
SELECT * FROM user_companies LIMIT 10;

-- Check users by role
SELECT user_id, name, email, role FROM users WHERE role = 'manager';
SELECT user_id, name, email, role FROM users WHERE role = 'user';

-- Check companies
SELECT * FROM companies LIMIT 10;

-- Check the join (this is what the app is trying to do)
SELECT 
  uc.company_id,
  uc.user_id,
  u.name,
  u.email,
  u.role
FROM user_companies uc
INNER JOIN users u ON uc.user_id = u.user_id
WHERE uc.company_id = 'YOUR_COMPANY_ID_HERE';
