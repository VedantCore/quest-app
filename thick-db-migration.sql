-- Thick Database Architecture Migration
-- Run this in Supabase SQL Editor

-- 1. Users Table (Ensure it exists with correct columns)
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'user', -- 'user', 'manager', 'admin'
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  total_points INT4 DEFAULT 0
);

-- 2. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by TEXT REFERENCES users(user_id),
  assigned_manager_id TEXT REFERENCES users(user_id),
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Task Steps Table
CREATE TABLE IF NOT EXISTS task_steps (
  step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  points_reward INT4 DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Task Enrollments (Users joining tasks)
CREATE TABLE IF NOT EXISTS task_enrollments (
  enrollment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- 5. Step Submissions
CREATE TABLE IF NOT EXISTS step_submissions (
  submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
  step_id UUID REFERENCES task_steps(step_id) ON DELETE CASCADE,
  status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by TEXT REFERENCES users(user_id),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(user_id, step_id)
);

-- 6. User Point History
CREATE TABLE IF NOT EXISTS user_point_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
  step_id UUID REFERENCES task_steps(step_id) ON DELETE SET NULL,
  points_earned INT4 NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- TRIGGERS & FUNCTIONS (The "Thick" Logic)
-- ==========================================

-- Trigger Function 1: Handle Submission Approval
CREATE OR REPLACE FUNCTION handle_submission_approval()
RETURNS TRIGGER AS $$
DECLARE
  reward_amount INT;
BEGIN
  -- Only proceed if status changed to APPROVED
  IF NEW.status = 'APPROVED' AND OLD.status != 'APPROVED' THEN
    
    -- Fetch the reward points from the step definition
    SELECT points_reward INTO reward_amount
    FROM task_steps
    WHERE step_id = NEW.step_id;

    -- Insert record into history (This will trigger the next function)
    INSERT INTO user_point_history (user_id, step_id, points_earned)
    VALUES (NEW.user_id, NEW.step_id, reward_amount);
    
    -- Update reviewed_at timestamp
    NEW.reviewed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger 1: Attach to step_submissions
DROP TRIGGER IF EXISTS on_submission_approval ON step_submissions;
CREATE TRIGGER on_submission_approval
BEFORE UPDATE ON step_submissions
FOR EACH ROW
EXECUTE FUNCTION handle_submission_approval();


-- Trigger Function 2: Update User Total Points
CREATE OR REPLACE FUNCTION handle_user_points_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment the user's total points
  UPDATE users
  SET total_points = COALESCE(total_points, 0) + NEW.points_earned
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger 2: Attach to user_point_history
DROP TRIGGER IF EXISTS update_user_total_points ON user_point_history;
CREATE TRIGGER update_user_total_points
AFTER INSERT ON user_point_history
FOR EACH ROW
EXECUTE FUNCTION handle_user_points_update();

-- RLS Policies (Basic Setup)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_point_history ENABLE ROW LEVEL SECURITY;

-- Permissive policies for demo (Adjust for production)
CREATE POLICY "Public read tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Public read steps" ON task_steps FOR SELECT USING (true);
CREATE POLICY "Users can enroll" ON task_enrollments FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can view enrollments" ON task_enrollments FOR SELECT USING (true);
CREATE POLICY "Users can submit steps" ON step_submissions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users view own submissions" ON step_submissions FOR SELECT USING (true);
CREATE POLICY "Managers update submissions" ON step_submissions FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid()::text AND role IN ('manager', 'admin')));
