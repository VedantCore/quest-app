-- Add feedback column to step_submissions table
ALTER TABLE step_submissions 
ADD COLUMN IF NOT EXISTS feedback TEXT;
