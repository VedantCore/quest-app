ALTER TABLE public.task_steps
ADD CONSTRAINT unique_step_title_per_task UNIQUE (task_id, title);
