-- Create notifications table for manager notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id TEXT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(task_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  step_id UUID REFERENCES public.task_steps(step_id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.step_submissions(submission_id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'STEP_SUBMITTED', 'TASK_UPDATED', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_manager_id ON public.notifications(manager_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_manager_unread ON public.notifications(manager_id, is_read) WHERE is_read = FALSE;

-- Add comment
COMMENT ON TABLE public.notifications IS 'Stores notifications for managers when users submit steps or update tasks';
