-- Migration: Add unique constraint to prevent duplicate point awards
-- This prevents the same user from receiving points for the same step multiple times

-- First, remove any existing duplicates (keep the first one)
DELETE FROM user_point_history a
USING user_point_history b
WHERE a.history_id > b.history_id
  AND a.user_id = b.user_id
  AND a.step_id = b.step_id;

-- Add unique constraint on (user_id, step_id)
ALTER TABLE user_point_history
ADD CONSTRAINT unique_user_step_points UNIQUE (user_id, step_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT unique_user_step_points ON user_point_history IS 
  'Prevents duplicate point awards for the same user and step combination';
