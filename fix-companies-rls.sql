-- FIX: Companies RLS Policy Issue
-- Problem: Service role key operations fail due to RLS policies expecting auth.uid()
-- Solution: Completely disable RLS for service role operations

-- ==========================================
-- OPTION 1: DISABLE RLS COMPLETELY (Recommended when using service role)
-- ==========================================
-- Since you're using supabaseAdmin (service role key) for admin operations,
-- RLS should be disabled as service role is meant to bypass RLS
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies DISABLE ROW LEVEL SECURITY;

-- Note: Service role key should ONLY be used server-side and never exposed to clients
-- Your current setup is correct - using service role key only in server actions

-- ==========================================
-- OPTION 2: KEEP RLS BUT FIX POLICIES (Alternative)
-- ==========================================
-- If you want to keep RLS enabled, uncomment the following:

/*
-- Re-enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins manage companies" ON companies;
DROP POLICY IF EXISTS "Users view assigned companies" ON companies;
DROP POLICY IF EXISTS "Admins assign users to companies" ON user_companies;
DROP POLICY IF EXISTS "Users view own company assignments" ON user_companies;

-- Create policies that work with service role
CREATE POLICY "Service role and admins manage companies" ON companies 
FOR ALL USING (
  -- Allow service role (bypasses when auth.role() = 'service_role')
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR
  -- Allow admin users
  EXISTS (
    SELECT 1 FROM users 
    WHERE user_id = auth.uid()::text AND role = 'admin'
  )
);

CREATE POLICY "Service role and users view companies" ON companies 
FOR SELECT USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR
  company_id IN (
    SELECT company_id FROM user_companies 
    WHERE user_id = auth.uid()::text
  )
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE user_id = auth.uid()::text AND role = 'admin'
  )
);

CREATE POLICY "Service role and admins manage user_companies" ON user_companies 
FOR ALL USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE user_id = auth.uid()::text AND role = 'admin'
  )
);

CREATE POLICY "Service role and managers view user_companies" ON user_companies 
FOR SELECT USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR
  user_id = auth.uid()::text
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE user_id = auth.uid()::text AND role IN ('manager', 'admin')
  )
);
*/

-- Output success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Companies RLS disabled for service role operations!';
  RAISE NOTICE '📋 Changes made:';
  RAISE NOTICE '   - RLS disabled on companies table';
  RAISE NOTICE '   - RLS disabled on user_companies table';
  RAISE NOTICE '   - Service role key can now perform all operations';
  RAISE NOTICE '⚠️  Security Note:';
  RAISE NOTICE '   - Ensure service role key is NEVER exposed to client';
  RAISE NOTICE '   - Only use in server-side actions (your current setup is correct)';
  RAISE NOTICE '   - Authorization is handled in your server actions by checking user role';
END $$;
