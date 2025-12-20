-- Companies Feature Migration
-- This adds company grouping functionality to the entire application
-- Run this in Supabase SQL Editor AFTER thick-db-migration.sql

-- ==========================================
-- 1. COMPANIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS companies (
  company_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT REFERENCES users(user_id)
);

-- ==========================================
-- 2. USER-COMPANY JUNCTION TABLE (Many-to-Many)
-- ==========================================
CREATE TABLE IF NOT EXISTS user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by TEXT REFERENCES users(user_id),
  UNIQUE(user_id, company_id)
);

-- ==========================================
-- 3. ADD COMPANY_ID TO TASKS
-- ==========================================
-- Add company_id column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(company_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company_id ON user_companies(company_id);

-- ==========================================
-- 4. ROW LEVEL SECURITY POLICIES
-- ==========================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

-- Companies: Users can view companies they're assigned to
CREATE POLICY "Users view assigned companies" ON companies 
FOR SELECT USING (
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

-- Companies: Only admins can insert/update/delete companies
CREATE POLICY "Admins manage companies" ON companies 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE user_id = auth.uid()::text AND role = 'admin'
  )
);

-- User Companies: Users can view their own company assignments
CREATE POLICY "Users view own company assignments" ON user_companies 
FOR SELECT USING (
  user_id = auth.uid()::text
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE user_id = auth.uid()::text AND role IN ('manager', 'admin')
  )
);

-- User Companies: Only admins can assign users to companies
CREATE POLICY "Admins assign users to companies" ON user_companies 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE user_id = auth.uid()::text AND role = 'admin'
  )
);

-- Update tasks policy to respect company assignments
DROP POLICY IF EXISTS "Public read tasks" ON tasks;
CREATE POLICY "Users view company tasks" ON tasks 
FOR SELECT USING (
  -- Admin can see all
  EXISTS (
    SELECT 1 FROM users 
    WHERE user_id = auth.uid()::text AND role = 'admin'
  )
  OR
  -- Users/managers see tasks from their assigned companies
  (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()::text
    )
  )
  OR
  -- Tasks without company (legacy data)
  company_id IS NULL
);

-- ==========================================
-- 5. HELPER FUNCTION: Get User's Companies
-- ==========================================
CREATE OR REPLACE FUNCTION get_user_companies(uid TEXT)
RETURNS TABLE (
  company_id UUID,
  company_name TEXT,
  company_description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.company_id,
    c.name,
    c.description
  FROM companies c
  INNER JOIN user_companies uc ON c.company_id = uc.company_id
  WHERE uc.user_id = uid
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 6. HELPER FUNCTION: Get Company Users
-- ==========================================
CREATE OR REPLACE FUNCTION get_company_users(cid UUID)
RETURNS TABLE (
  user_id TEXT,
  name TEXT,
  email TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.user_id,
    u.name,
    u.email,
    u.role
  FROM users u
  INNER JOIN user_companies uc ON u.user_id = uc.user_id
  WHERE uc.company_id = cid
  ORDER BY u.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Output message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Companies feature migration completed successfully!';
  RAISE NOTICE '📋 Next steps:';
  RAISE NOTICE '   1. Create companies in admin dashboard';
  RAISE NOTICE '   2. Assign users/managers to companies';
  RAISE NOTICE '   3. Assign company to tasks when creating/editing';
END $$;
