-- Seed Data for Thick DB Demo
-- Run this AFTER running thick-db-migration.sql

-- 1. Insert Users
INSERT INTO users (user_id, name, email, role, total_points)
VALUES 
  ('user_123', 'Alice Adventurer', 'alice@example.com', 'user', 0),
  ('manager_456', 'Bob Boss', 'bob@example.com', 'manager', 0)
ON CONFLICT (user_id) DO NOTHING;

-- 2. Insert a Task
INSERT INTO tasks (task_id, title, description, created_by)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Onboarding Quest', 'Complete these steps to get started with the platform.', 'manager_456')
ON CONFLICT (task_id) DO NOTHING;

-- 3. Insert Task Steps
INSERT INTO task_steps (step_id, task_id, title, description, points_reward)
VALUES 
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Complete Profile', 'Fill out your bio and upload an avatar.', 50),
  ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Join Discord', 'Join our community server.', 100),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'First Post', 'Introduce yourself in the general channel.', 75)
ON CONFLICT (step_id) DO NOTHING;

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Seed data inserted successfully!';
END $$;
