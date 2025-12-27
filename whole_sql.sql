-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.companies (
  company_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  created_by text,
  CONSTRAINT companies_pkey PRIMARY KEY (company_id),
  CONSTRAINT companies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id)
);
CREATE TABLE public.invites (
  code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  is_used boolean DEFAULT false,
  used_by text,
  expires_at timestamp with time zone,
  CONSTRAINT invites_pkey PRIMARY KEY (code),
  CONSTRAINT invites_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(user_id)
);
CREATE TABLE public.step_submissions (
  submission_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text,
  step_id uuid,
  status text DEFAULT 'PENDING'::text CHECK (status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text])),
  submitted_at timestamp with time zone DEFAULT now(),
  reviewed_by text,
  reviewed_at timestamp with time zone,
  feedback text,
  CONSTRAINT step_submissions_pkey PRIMARY KEY (submission_id),
  CONSTRAINT step_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT step_submissions_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.task_steps(step_id),
  CONSTRAINT step_submissions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(user_id)
);
CREATE TABLE public.task_enrollments (
  enrollment_id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid,
  user_id text,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT task_enrollments_pkey PRIMARY KEY (enrollment_id),
  CONSTRAINT task_enrollments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(task_id),
  CONSTRAINT task_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.task_steps (
  step_id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid,
  title text NOT NULL,
  description text,
  points_reward integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT task_steps_pkey PRIMARY KEY (step_id),
  CONSTRAINT task_steps_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(task_id)
);
CREATE TABLE public.tasks (
  task_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by text,
  assigned_manager_id text,
  title text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  deadline date,
  level smallint,
  company_id uuid,
  CONSTRAINT tasks_pkey PRIMARY KEY (task_id),
  CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id),
  CONSTRAINT tasks_assigned_manager_id_fkey FOREIGN KEY (assigned_manager_id) REFERENCES public.users(user_id),
  CONSTRAINT tasks_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id)
);
CREATE TABLE public.user_companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text,
  company_id uuid,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by text,
  CONSTRAINT user_companies_pkey PRIMARY KEY (id),
  CONSTRAINT user_companies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT user_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id),
  CONSTRAINT user_companies_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(user_id)
);
CREATE TABLE public.user_point_history (
  history_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text,
  step_id uuid,
  points_earned integer NOT NULL,
  earned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_point_history_pkey PRIMARY KEY (history_id),
  CONSTRAINT user_point_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT user_point_history_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.task_steps(step_id)
);
CREATE TABLE public.users (
  user_id text NOT NULL,
  name text NOT NULL,
  email text,
  role text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  total_points integer DEFAULT 0,
  CONSTRAINT users_pkey PRIMARY KEY (user_id)
);