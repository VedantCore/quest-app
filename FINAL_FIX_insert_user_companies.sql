-- ONE-CLICK FIX: Run this entire file in Supabase SQL Editor
-- This will assign all managers and users to Company 1

DO $$
DECLARE
  admin_id text;
  assigned_count integer;
BEGIN
  -- Get admin user_id for assigned_by
  SELECT user_id INTO admin_id FROM users WHERE role = 'admin' LIMIT 1;
  
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found. Please create an admin user first.';
  END IF;
  
  -- Insert all managers and users into Company 1
  INSERT INTO user_companies (user_id, company_id, assigned_by)
  SELECT 
    u.user_id,
    '92f4010f-23bd-410b-92a5-5285d711344d'::uuid,
    admin_id
  FROM users u
  WHERE u.role IN ('manager', 'user')
  ON CONFLICT DO NOTHING;
  
  -- Get count of assigned users
  SELECT COUNT(*) INTO assigned_count 
  FROM user_companies 
  WHERE company_id = '92f4010f-23bd-410b-92a5-5285d711344d';
  
  RAISE NOTICE 'Successfully assigned % users to Company 1', assigned_count;
  
  -- Show the results
  RAISE NOTICE 'Verification query results:';
END $$;

-- Verify the data was inserted
SELECT 
  u.name as user_name,
  u.email,
  u.role,
  c.name as company_name,
  uc.assigned_at
FROM user_companies uc
JOIN users u ON uc.user_id = u.user_id
JOIN companies c ON uc.company_id = c.company_id
WHERE uc.company_id = '92f4010f-23bd-410b-92a5-5285d711344d'
ORDER BY u.role, u.name;
